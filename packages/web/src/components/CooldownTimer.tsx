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
		<div className="absolute top-24 right-4 floating-panel panel-padding w-64 pointer-events-auto fade-in">
			<div className="flex items-start gap-3">
				<div className="relative flex h-5 w-5 items-center justify-center">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
					<span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between">
						<div className="text-xs font-semibold tracking-wide uppercase text-amber-300/90">
							Cooldown
						</div>
						<div className="text-[11px] text-slate-400">
							{formatTime(timeRemaining)}
						</div>
					</div>
					<div className="text-[11px] text-slate-300 mt-1">
						Next placement available soon
					</div>
					<div className="mt-2 h-1.5 rounded-full bg-slate-600/40 overflow-hidden">
						<div
							className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-1000"
							style={{
								width: `${Math.max(
									0,
									((30 - timeRemaining) / 30) * 100
								)}%`
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

export default CooldownTimer
