import type { PlacementFee } from "@solplace/shared"
import React from "react"

interface FeeEstimatorProps {
	fee: PlacementFee
}

const FeeEstimator: React.FC<FeeEstimatorProps> = ({ fee }) => {
	return (
		<div className="absolute top-20 left-4 bg-black/75 text-white p-3 rounded-lg shadow-lg pointer-events-auto max-w-xs">
			<div className="text-sm">
				<div className="font-medium mb-2">Placement Fee</div>

				<div className="space-y-1 text-xs">
					<div className="flex justify-between">
						<span>Base fee:</span>
						<span>{(fee.baseFee / 1e9).toFixed(3)} SOL</span>
					</div>

					{fee.isOverwrite && (
						<>
							<div className="flex justify-between text-orange-300">
								<span>Overwrite multiplier:</span>
								<span>x{fee.multiplier}</span>
							</div>
							<div className="text-xs text-orange-200 mt-1">
								💡 This location is already occupied
							</div>
						</>
					)}

					<div className="border-t border-gray-600 pt-1 mt-2">
						<div className="flex justify-between font-medium">
							<span>Total:</span>
							<span>{(fee.amount / 1e9).toFixed(3)} SOL</span>
						</div>
					</div>
				</div>

				<div className="mt-2 text-xs text-gray-400">
					Click to place your token here
				</div>
			</div>
		</div>
	)
}

export default FeeEstimator
