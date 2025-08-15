import { PublicKey } from "@solana/web3.js"
import type { PlacementFee } from "@solplace/shared"
import React, { useState } from "react"

interface TokenPlacerProps {
	location: { lat: number; lng: number }
	fee: PlacementFee | null
	onPlaceToken: (tokenMint: string) => Promise<void>
	onClose: () => void
	isPlacing: boolean
	validateTokenMint?: (tokenMint: PublicKey) => Promise<boolean>
}

const TokenPlacer: React.FC<TokenPlacerProps> = ({
	location,
	fee,
	onPlaceToken,
	onClose,
	isPlacing,
	validateTokenMint
}) => {
	const [tokenMint, setTokenMint] = useState("")
	const [isValidating, setIsValidating] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!tokenMint.trim()) {
			alert("Please enter a token address")
			return
		}

		// Basic validation - Solana addresses are base58 and 32-44 characters
		if (tokenMint.length < 32 || tokenMint.length > 44) {
			alert("Invalid token address format")
			return
		}

		// Check if there's a validation error
		if (validationError) {
			alert(validationError)
			return
		}

		try {
			await onPlaceToken(tokenMint.trim())
		} catch (error) {
			console.error("Failed to place token:", error)
		}
	}

	const validateTokenAddress = async () => {
		if (!tokenMint.trim() || !validateTokenMint) return

		setIsValidating(true)
		setValidationError(null)

		try {
			const publicKey = new PublicKey(tokenMint.trim())
			const isValid = await validateTokenMint(publicKey)

			if (!isValid) {
				setValidationError("This address is not a valid SPL token mint")
			}
		} catch (error) {
			console.error("Token validation failed:", error)
			setValidationError("Invalid token address format")
		} finally {
			setIsValidating(false)
		}
	}

	const formatCoordinate = (coord: number) => {
		return coord.toFixed(6)
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
			<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-900">
						Place Token Logo
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
						disabled={isPlacing}>
						✕
					</button>
				</div>

				<div className="mb-4">
					<div className="text-sm text-gray-600 mb-2">
						<strong>Location:</strong>{" "}
						{formatCoordinate(location.lat)},{" "}
						{formatCoordinate(location.lng)}
					</div>

					{fee && (
						<div className="text-sm text-gray-600 mb-2">
							<strong>Fee:</strong>{" "}
							{(fee.amount / 1e9).toFixed(3)} SOL
							{fee.isOverwrite && (
								<span className="text-orange-600 ml-1">
									(Overwrite x{fee.multiplier})
								</span>
							)}
						</div>
					)}
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="tokenMint"
							className="block text-sm font-medium text-gray-700 mb-1">
							Token Contract Address
						</label>
						<input
							type="text"
							id="tokenMint"
							value={tokenMint}
							onChange={(e) => {
								setTokenMint(e.target.value)
								if (e.target.value.length >= 32) {
									validateTokenAddress()
								}
							}}
							placeholder="Enter Solana token address (e.g., DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263)"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
							disabled={isPlacing}
							required
						/>
						{isValidating && (
							<div className="text-xs text-gray-500 mt-1">
								🔍 Validating token...
							</div>
						)}
						{validationError && (
							<div className="text-xs text-red-600 mt-1">
								⚠️ {validationError}
							</div>
						)}
					</div>

					{fee && (
						<div className="bg-gray-50 p-3 rounded-md">
							<div className="text-sm">
								<div className="flex justify-between mb-1">
									<span>Base fee:</span>
									<span>
										{(fee.baseFee / 1e9).toFixed(3)} SOL
									</span>
								</div>
								{fee.isOverwrite && (
									<div className="flex justify-between mb-1">
										<span>Overwrite multiplier:</span>
										<span>x{fee.multiplier}</span>
									</div>
								)}
								<div className="flex justify-between font-medium border-t pt-1 mt-1">
									<span>Total:</span>
									<span>
										{(fee.amount / 1e9).toFixed(3)} SOL
									</span>
								</div>
							</div>
						</div>
					)}

					<div className="flex space-x-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
							disabled={isPlacing}>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={
								isPlacing || !tokenMint.trim() || isValidating
							}>
							{isPlacing
								? "Placing..."
								: `Place Logo (${
										fee
											? (fee.amount / 1e9).toFixed(3) +
											  " SOL"
											: "0.001 SOL"
								  })`}
						</button>
					</div>
				</form>

				<div className="mt-4 text-xs text-gray-500">
					<p>
						💡 <strong>Tip:</strong> Popular token examples:
					</p>
					<div className="mt-1 space-y-1">
						<div>
							BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
						</div>
						<div>
							WIF: EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default TokenPlacer
