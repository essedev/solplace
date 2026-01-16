import type { MapBounds, SolplaceClient, TokenMetadata } from "@solplace/shared"
import React, { useCallback, useEffect, useState } from "react"

interface VisibleToken {
	tokenMint: string
	logoUri?: string
	coordinates: [number, number]
	// Add metadata fields for better display
	name?: string
	symbol?: string
	metadata?: TokenMetadata
}

interface LeaderboardProps {
	client: SolplaceClient | null
	isVisible: boolean
	onToggle: () => void
	currentBounds?: MapBounds
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
		} catch (err) {
			console.error("Failed to load visible tokens", err)
		} finally {
			setIsLoading(false)
		}
	}, [client, currentBounds])

	useEffect(() => {
		if (client && isVisible && currentBounds) {
			loadVisibleTokens()
		}
	}, [client, isVisible, currentBounds, loadVisibleTokens])

	const formatTokenAddress = (address: string) =>
		`${address.slice(0, 4)}...${address.slice(-4)}`
	const formatTime = (date: Date) =>
		date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

	return (
		<>
			<button
				onClick={(e) => {
					e.preventDefault()
					e.stopPropagation()
					onToggle()
				}}
				className={`fixed right-4 bottom-[12.5rem] btn btn-md pointer-events-auto font-semibold tracking-wide ${
					isVisible
						? "btn-primary ring-2 ring-purple-300/40"
						: "btn-secondary"
				}`}>
				📍 Tokens in View
			</button>
			{isVisible && (
				<div className="absolute bottom-[6.25rem] right-0 floating-panel-light shadow-2xl w-80 max-h-96 flex flex-col pointer-events-auto fade-in">
					<div className="flex items-start justify-between p-4 pb-3 border-b border-white/40 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white rounded-t-xl">
						<div>
							<h3 className="font-semibold tracking-wide text-sm flex items-center gap-2">
								<span className="text-lg">📍</span>Tokens in
								View
							</h3>
							{lastUpdated && (
								<p className="text-[10px] opacity-80 mt-0.5">
									Updated {formatTime(lastUpdated)}
								</p>
							)}
						</div>
						<button
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								onToggle()
							}}
							className="btn btn-ghost btn-sm !text-white hover:!bg-white/20">
							✕
						</button>
					</div>
					<div className="scroll-y-soft flex-1">
						{isLoading ? (
							<div className="flex items-center justify-center p-8 text-slate-500">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
								<span className="ml-3 text-xs font-medium tracking-wide">
									Loading…
								</span>
							</div>
						) : visibleTokens.length === 0 ? (
							<div className="p-8 text-center text-slate-500 text-sm">
								<p className="font-medium mb-1">
									No tokens here
								</p>
								<p className="text-xs opacity-70">
									Move or zoom to discover more placements.
								</p>
							</div>
						) : (
							<ul className="p-2 space-y-2">
								{visibleTokens.map((token, index) => (
									<li
										key={`${token.tokenMint}-${token.coordinates[0]}-${token.coordinates[1]}`}
										className="group flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition shadow-sm">
										<div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-900/40">
											{index + 1}
										</div>
										<div className="w-10 h-10 flex-shrink-0">
											{token.logoUri ||
											token.metadata?.image ? (
												<img
													src={
														token.metadata?.image ||
														token.logoUri
													}
													alt={`${
														token.name ||
														token.metadata?.name ||
														token.tokenMint
													} logo`}
													className="w-full h-full rounded-full object-cover border border-white/60 shadow-inner"
													onError={(e) => {
														;(
															e.target as HTMLImageElement
														).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${token.tokenMint}&size=40&backgroundColor=1e293b&foregroundColor=ffffff`
													}}
												/>
											) : (
												<div className="w-full h-full rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-xs">
													?
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="font-mono text-xs font-semibold text-slate-800 truncate">
												{token.name ||
												token.metadata?.name ? (
													<>
														<span className="font-semibold">
															{token.name ||
																token.metadata
																	?.name}
														</span>
														{(token.symbol ||
															token.metadata
																?.symbol) && (
															<span className="text-slate-500 ml-1">
																(
																{token.symbol ||
																	token
																		.metadata
																		?.symbol}
																)
															</span>
														)}
													</>
												) : (
													formatTokenAddress(
														token.tokenMint
													)
												)}
											</div>
											<div className="text-[10px] text-slate-500">
												{token.coordinates[0] /
													1_000_000}
												,{" "}
												{token.coordinates[1] /
													1_000_000}
											</div>
										</div>
										<div className="badge-soft">📍</div>
									</li>
								))}
							</ul>
						)}
					</div>
					<div className="p-3 border-t border-white/50 bg-white/60 rounded-b-xl">
						<button
							onClick={loadVisibleTokens}
							disabled={isLoading}
							className="btn btn-secondary btn-sm w-full disabled:opacity-60">
							{isLoading ? "Refreshing…" : "🔄 Refresh"}
						</button>
					</div>
				</div>
			)}
		</>
	)
}

export default Leaderboard
