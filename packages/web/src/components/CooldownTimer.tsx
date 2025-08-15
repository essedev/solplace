import type { UserCooldown } from "@solplace/shared"
import { isUserOnCooldown } from "@solplace/shared"
import React, { useEffect, useState } from "react"

interface CooldownTimerProps {
	cooldown: UserCooldown
}

const CooldownTimer: React.FC<CooldownTimerProps> = ({ cooldown }) => {
	const [timeRemaining, setTimeRemaining] = useState(0)
	const [isOnCooldown, setIsOnCooldown] = useState(false)

	useEffect(() => {
		const updateTimer = () => {
			const onCooldown = isUserOnCooldown(cooldown.lastPlacement)
			setIsOnCooldown(onCooldown)

			if (onCooldown) {
				// Calculate remaining time (30 seconds cooldown)
				const elapsed = Date.now() - cooldown.lastPlacement * 1000
				const remaining = Math.max(0, 30000 - elapsed) // 30 seconds in ms
				setTimeRemaining(Math.ceil(remaining / 1000))
			} else {
				setTimeRemaining(0)
			}
		}

		// Update immediately
		updateTimer()

		// Update every second if on cooldown
		const interval = setInterval(updateTimer, 1000)

		return () => clearInterval(interval)
	}, [cooldown.lastPlacement])

	if (!isOnCooldown) {
		return null
	}

	const formatTime = (seconds: number) => {
		if (seconds <= 0) return "0s"
		return `${seconds}s`
	}

	return (
		<div className="absolute top-20 right-4 bg-orange-500 text-white p-3 rounded-lg shadow-lg pointer-events-auto">
			<div className="flex items-center space-x-2">
				<div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
				<div>
					<div className="font-medium text-sm">Cooldown Active</div>
					<div className="text-xs opacity-90">
						Next placement in: {formatTime(timeRemaining)}
					</div>
				</div>
			</div>

			{/* Progress bar */}
			<div className="mt-2 w-full bg-orange-600 rounded-full h-1">
				<div
					className="bg-white h-1 rounded-full transition-all duration-1000"
					style={{
						width: `${Math.max(
							0,
							((30 - timeRemaining) / 30) * 100
						)}%`
					}}
				/>
			</div>
		</div>
	)
}

export default CooldownTimer
