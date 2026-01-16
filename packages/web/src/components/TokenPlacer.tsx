import { PublicKey } from "@solana/web3.js"
import type { PlacementFee, TokenMetadata } from "@solplace/shared"
import { tokenMetadataResolver } from "@solplace/shared"
import React, { useCallback, useEffect, useState } from "react"

interface TokenPlacerProps {
	location: { lat: number; lng: number }
	fee: PlacementFee | null
	onPlaceToken: (tokenMint: string, logoUri?: string) => Promise<void>
	onClose: () => void
	isPlacing: boolean
	validateTokenMint?: (tokenMint: PublicKey) => Promise<boolean>
	existingLogo?: {
		logoUri: string
		tokenMint: string
		placedBy: string
		placedAt: number
		overwriteCount: number
		metadata?: TokenMetadata
	} | null
}

const TokenPlacer: React.FC<TokenPlacerProps> = ({
	location,
	fee,
	onPlaceToken,
	onClose,
	isPlacing,
	validateTokenMint,
	existingLogo
}) => {
	const [tokenMint, setTokenMint] = useState("")
	const [isValidating, setIsValidating] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)
	const [tokenPreview, setTokenPreview] = useState<TokenMetadata | null>(null)

	const validateTokenAddress = useCallback(async () => {
		if (!tokenMint.trim() || !validateTokenMint) return
		setIsValidating(true)
		setValidationError(null)
		setTokenPreview(null)

		try {
			const pk = new PublicKey(tokenMint.trim())
			const ok = await validateTokenMint(pk)
			if (!ok) {
				setValidationError("This address is not a valid SPL token mint")
				return
			}

			// If validation passed, try to get metadata
			console.log("🔍 Fetching token metadata...")
			const metadata = await tokenMetadataResolver.resolveMetadata(
				tokenMint.trim()
			)
			if (metadata) {
				console.log("✅ Metadata found:", metadata)
				setTokenPreview(metadata)
			} else {
				console.log("⚠️ No metadata found, using fallback")
				// Still show a preview with the address
				setTokenPreview({
					mintAddress: tokenMint.trim(),
					name: `${tokenMint.trim().slice(0, 8)}...`,
					symbol: "TOKEN",
					source: "fallback",
					resolvedAt: Date.now()
				})
			}
		} catch {
			setValidationError("Invalid token address format")
		} finally {
			setIsValidating(false)
		}
	}, [tokenMint, validateTokenMint])

	// Auto-validate with debounce
	useEffect(() => {
		if (!tokenMint.trim()) {
			setTokenPreview(null)
			setValidationError(null)
			return
		}

		if (tokenMint.trim().length >= 32) {
			const timer = setTimeout(() => {
				validateTokenAddress()
			}, 1000) // 1 second debounce

			return () => clearTimeout(timer)
		}
	}, [tokenMint, validateTokenAddress])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!tokenMint.trim()) return alert("Please enter a token address")
		if (tokenMint.length < 32 || tokenMint.length > 44)
			return alert("Invalid token address format")
		if (validationError) return alert(validationError)
		try {
			// Pass the resolved image URI from metadata if available
			// This ensures we always use the best quality image source
			const logoUri = tokenPreview?.image
			await onPlaceToken(tokenMint.trim(), logoUri)
		} catch (err) {
			console.error("Failed to place token", err)
		}
	}

	const formatCoordinate = (c: number) => c.toFixed(6)

	return (
		<div className="modal-overlay pointer-events-auto">
			<div className="modal relative">
				<div className="flex items-center justify-between mb-4">
					<h2 className="modal-title">Place Token Logo</h2>
					<button
						onClick={onClose}
						className="btn btn-ghost btn-sm"
						disabled={isPlacing}>
						✕
					</button>
				</div>

				<div className="grid gap-3 mb-4 text-sm">
					<div className="flex justify-between text-slate-600">
						<span className="font-medium text-slate-500">
							Location
						</span>
						<span className="font-mono text-slate-700">
							{formatCoordinate(location.lat)},{" "}
							{formatCoordinate(location.lng)}
						</span>
					</div>
					{fee && (
						<div className="flex justify-between text-slate-600">
							<span className="font-medium text-slate-500">
								Fee
							</span>
							<span className="font-mono">
								{(fee.amount / 1e9).toFixed(3)} SOL
								{fee.isOverwrite && (
									<span className="text-amber-600 ml-1">
										(x{fee.multiplier})
									</span>
								)}
							</span>
						</div>
					)}
					{fee?.isOverwrite && existingLogo && (
						<div className="mt-1 rounded-lg bg-white/60 backdrop-blur-sm border border-white/70 p-2 flex items-center gap-3 text-[11px]">
							{(existingLogo.metadata?.image ||
								existingLogo.logoUri) && (
								<img
									src={
										existingLogo.metadata?.image ||
										existingLogo.logoUri
									}
									alt="current logo"
									className="w-8 h-8 rounded-full object-cover ring-1 ring-white/40"
									onError={(e) => {
										;(
											e.target as HTMLImageElement
										).style.display = "none"
									}}
								/>
							)}
							<div className="flex-1 min-w-0">
								<div className="font-mono truncate text-slate-700">
									{existingLogo.metadata?.name ? (
										<>
											<span className="font-semibold text-slate-800">
												{existingLogo.metadata.name}
											</span>
											{existingLogo.metadata.symbol && (
												<span className="text-slate-500 ml-1">
													(
													{
														existingLogo.metadata
															.symbol
													}
													)
												</span>
											)}
										</>
									) : (
										`${existingLogo.tokenMint.slice(
											0,
											10
										)}...`
									)}
								</div>
								<div className="text-[10px] text-slate-500">
									Placed by{" "}
									{existingLogo.placedBy.slice(0, 8)}… ·
									Overwrites {existingLogo.overwriteCount}
								</div>
							</div>
						</div>
					)}
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div>
						<label
							htmlFor="tokenMint"
							className="block text-xs font-semibold tracking-wide uppercase text-slate-500 mb-2">
							Token Contract Address
						</label>
						<div className="relative">
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
								placeholder="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
								className="w-full rounded-lg border border-slate-200/80 bg-white/60 backdrop-blur-sm px-3 py-2.5 text-sm font-mono tracking-tight text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 shadow-inner shadow-white/40"
								disabled={isPlacing}
								required
							/>
							{isValidating && (
								<div className="absolute -bottom-5 left-0 text-[10px] text-slate-500">
									🔍 Validating...
								</div>
							)}
							{validationError && (
								<div className="absolute -bottom-5 left-0 text-[10px] text-rose-600">
									⚠ {validationError}
								</div>
							)}
						</div>

						{/* Token Preview */}
						{tokenPreview && !validationError && (
							<div className="mt-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50 p-3">
								<div className="flex items-center gap-3">
									{tokenPreview.image && (
										<img
											src={tokenPreview.image}
											alt="token logo"
											className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-200"
											onError={(e) => {
												;(
													e.target as HTMLImageElement
												).style.display = "none"
											}}
										/>
									)}
									<div className="flex-1 min-w-0">
										<div className="font-medium text-purple-900">
											{tokenPreview.name}
											{tokenPreview.symbol &&
												tokenPreview.symbol !==
													"TOKEN" && (
													<span className="text-purple-600 ml-1">
														({tokenPreview.symbol})
													</span>
												)}
										</div>
										<div className="text-[10px] text-purple-600">
											Source: {tokenPreview.source}
											{tokenPreview.source ===
												"metaplex-onchain" && " ✨"}
										</div>
									</div>
									<div className="text-green-600 text-xs">
										✓
									</div>
								</div>
							</div>
						)}
					</div>

					{fee && (
						<div className="glass-panel panel-padding grid gap-2 text-[11px]">
							<div className="flex justify-between">
								<span className="text-slate-400">Base</span>
								<span className="font-mono">
									{(fee.baseFee / 1e9).toFixed(3)} SOL
								</span>
							</div>
							{fee.isOverwrite && (
								<div className="flex justify-between text-amber-400">
									<span>Overwrite x{fee.multiplier}</span>
									<span className="font-mono">
										{(
											(fee.baseFee * fee.multiplier) /
											1e9
										).toFixed(3)}{" "}
										SOL
									</span>
								</div>
							)}
							<div className="panel-divider my-1" />
							<div className="flex justify-between items-center">
								<span className="text-slate-300">Total</span>
								<span className="font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
									{(fee.amount / 1e9).toFixed(3)} SOL
								</span>
							</div>
						</div>
					)}

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="btn btn-secondary btn-md flex-1"
							disabled={isPlacing}>
							Cancel
						</button>
						<button
							type="submit"
							className="btn btn-primary btn-md flex-1"
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

				<div className="mt-8 text-[10px] leading-relaxed text-slate-500">
					<p className="font-medium text-slate-600 mb-1">Examples:</p>
					<ul className="space-y-1 font-mono">
						<li>
							<span className="text-slate-400">BONK</span>:
							DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
						</li>
						<li>
							<span className="text-slate-400">WIF</span>:
							EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm
						</li>
					</ul>
					<p className="mt-3 text-slate-400">
						Ensure the address is a valid SPL token mint. Fees
						support the SolPlace treasury.
					</p>
				</div>
			</div>
		</div>
	)
}

export default TokenPlacer
