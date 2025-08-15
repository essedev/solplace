import type { PlacementFee } from "@solplace/shared"
import React from "react"

interface FeeEstimatorProps {
	fee: PlacementFee
	existingLogo?: {
		logoUri: string
		tokenMint: string
		placedBy: string
		placedAt: number
		overwriteCount: number
	} | null
}

const FeeEstimator: React.FC<FeeEstimatorProps> = ({ fee, existingLogo }) => {
	return (
		<div className="absolute top-24 left-4 floating-panel panel-padding w-64 pointer-events-auto fade-in">
			<div className="flex items-start justify-between mb-1">
				<h4 className="text-xs font-semibold tracking-wide uppercase text-purple-300/90">
					Placement Fee
				</h4>
				<span className="badge">
					{(fee.amount / 1e9).toFixed(3)} SOL
				</span>
			</div>
			<div className="space-y-1 text-[11px] text-slate-300">
				<div className="flex justify-between">
					<span className="text-slate-400">Base:</span>
					<span className="font-mono">
						{(fee.baseFee / 1e9).toFixed(3)} SOL
					</span>
				</div>
				{fee.isOverwrite && (
					<div className="flex flex-col gap-1 mt-1">
						<div className="flex justify-between text-amber-300">
							<span>Overwrite x{fee.multiplier}</span>
							<span className="font-mono">
								{((fee.baseFee * fee.multiplier) / 1e9).toFixed(
									3
								)}{" "}
								SOL
							</span>
						</div>
						<div className="text-[10px] text-amber-200/80">
							Location occupied - higher fee applies
						</div>
						{existingLogo && (
							<div className="mt-1 flex items-center gap-2 p-2 rounded-md bg-white/5 border border-white/10">
								{existingLogo.logoUri && (
									<img
										src={existingLogo.logoUri}
										alt="token"
										className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
										onError={(e) => {
											;(
												e.target as HTMLImageElement
											).style.display = "none"
										}}
									/>
								)}
								<div className="flex-1 min-w-0">
									<div className="font-mono truncate text-[10px] text-slate-300">
										{existingLogo.tokenMint.slice(0, 8)}...
									</div>
									<div className="text-[9px] text-slate-400">
										Overwrites:{" "}
										{existingLogo.overwriteCount}
									</div>
								</div>
							</div>
						)}
					</div>
				)}
				<div className="panel-divider mb-0" />
				<div className="flex justify-between items-center text-[11px]">
					<span className="text-slate-300">Total due:</span>
					<span className="font-semibold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
						{(fee.amount / 1e9).toFixed(3)} SOL
					</span>
				</div>
			</div>
			<p className="mt-3 text-[10px] text-slate-400">
				Click a grid cell to place your token logo
			</p>
		</div>
	)
}

export default FeeEstimator
