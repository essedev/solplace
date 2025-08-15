import type { MapBounds, SolplaceClient } from "@solplace/shared"
import React, { useCallback, useEffect, useState } from "react"

interface VisibleToken {
	tokenMint: string
	logoUri?: string
	coordinates: [number, number]
}

interface LeaderboardProps {
	client: SolplaceClient | null
	isVisible: boolean
	onToggle: () => void
	currentBounds?: MapBounds // Add current map bounds
}

const Leaderboard: React.FC<LeaderboardProps> = ({
	client,
	isVisible,
	onToggle,
	currentBounds
}) => {
	const [visibleTokens, setVisibleTokens] = useState<VisibleToken[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

	const loadVisibleTokens = useCallback(async () => {
		if (!client || !currentBounds) return

		setIsLoading(true)
		try {
			const tokens = await client.getVisibleTokens(currentBounds)
			setVisibleTokens(tokens)
			setLastUpdated(new Date())
		} catch (error) {
			console.error("Failed to load visible tokens:", error)
		} finally {
			setIsLoading(false)
		}
	}, [client, currentBounds])

	// Carica quando le bounds cambiano o quando viene aperto
	useEffect(() => {
		if (client && isVisible && currentBounds) {
			loadVisibleTokens()
		}
	}, [client, isVisible, currentBounds, loadVisibleTokens])

	const formatTokenAddress = (address: string) => {
		return `${address.slice(0, 4)}...${address.slice(-4)}`
	}

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit"
		})
	}

	return (
		<>
			{/* Toggle Button */}
			<button
				onClick={(e) => {
					e.preventDefault()
					e.stopPropagation()
					onToggle()
				}}
				className={`fixed right-4 bottom-[11.5rem] px-4 py-2 rounded-lg shadow-lg transition-colors pointer-events-auto ${
					isVisible
						? "bg-purple-700 text-white hover:bg-purple-800"
						: "bg-purple-600 text-white hover:bg-purple-700"
				}`}>
				📍 Tokens in View
			</button>

			{/* Leaderboard Panel - Only visible when toggled */}
			{isVisible && (
				<div className="absolute bottom-[5.25rem] right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden pointer-events-auto">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
						<div>
							<h3 className="font-bold text-lg">
								📍 Tokens in View
							</h3>
							{lastUpdated && (
								<p className="text-xs opacity-90">
									Updated: {formatTime(lastUpdated)}
								</p>
							)}
						</div>
						<button
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								onToggle()
							}}
							className="text-white hover:bg-white/20 rounded p-1 transition-colors">
							✕
						</button>
					</div>

					{/* Content */}
					<div className="overflow-y-auto max-h-80">
						{isLoading ? (
							<div className="flex items-center justify-center p-8">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
								<span className="ml-2 text-gray-600">
									Loading...
								</span>
							</div>
						) : visibleTokens.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								<p>No tokens in this area</p>
								<p className="text-sm">
									Zoom out or move around to find tokens!
								</p>
							</div>
						) : (
							<div className="p-2">
								{visibleTokens.map((token, index) => (
									<div
										key={`${token.tokenMint}-${token.coordinates[0]}-${token.coordinates[1]}`}
										className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
										{/* Index */}
										<div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold text-sm mr-3">
											{index + 1}
										</div>

										{/* Logo */}
										<div className="w-10 h-10 mr-3 flex-shrink-0">
											{token.logoUri ? (
												<img
													src={token.logoUri}
													alt={`${token.tokenMint} logo`}
													className="w-full h-full rounded-full object-cover border-2 border-gray-200"
													onError={(e) => {
														// Fallback to identicon if image fails
														const target =
															e.target as HTMLImageElement
														target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${token.tokenMint}&size=40&backgroundColor=1e293b&foregroundColor=ffffff`
													}}
												/>
											) : (
												<div className="w-full h-full rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-xs">
													?
												</div>
											)}
										</div>

										{/* Info */}
										<div className="flex-1 min-w-0">
											<div className="font-mono text-sm font-medium text-gray-900 truncate">
												{formatTokenAddress(
													token.tokenMint
												)}
											</div>
											<div className="text-xs text-gray-500">
												{token.coordinates[0] /
													1_000_000}
												,{" "}
												{token.coordinates[1] /
													1_000_000}
											</div>
										</div>

										{/* Location badge */}
										<div className="flex-shrink-0 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
											📍
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="border-t bg-gray-50 p-3">
						<button
							onClick={loadVisibleTokens}
							disabled={isLoading}
							className="w-full text-center text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400 transition-colors">
							{isLoading ? "Refreshing..." : "🔄 Refresh"}
						</button>
					</div>
				</div>
			)}
		</>
	)
}

export default Leaderboard
