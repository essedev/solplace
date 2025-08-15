import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import React from "react"

const WalletConnector: React.FC = () => {
	const { connected, publicKey } = useWallet()

	return (
		<div className="flex items-center gap-4">
			{connected && publicKey && (
				<div className="hidden sm:block floating-panel px-4 py-2 min-w-[140px] relative group transition-colors">
					<div className="flex items-center gap-2">
						<span className="relative flex h-2.5 w-2.5">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
						</span>
						<span className="text-[11px] uppercase tracking-wide text-emerald-300/90 font-semibold">
							Connected
						</span>
					</div>
					<div className="font-mono text-xs mt-1 text-slate-300">
						{publicKey.toString().slice(0, 4)}…
						{publicKey.toString().slice(-4)}
					</div>
					<div className="absolute inset-0 rounded-xl ring-1 ring-white/10 group-hover:ring-purple-400/40 transition" />
				</div>
			)}

			<WalletMultiButton className="!btn !btn-primary !btn-md !shadow-lg !shadow-purple-900/30 !border-0 !ring-1 !ring-white/10 hover:!ring-purple-300/40 !focus-visible:ring-offset-slate-900" />
		</div>
	)
}

export default WalletConnector
