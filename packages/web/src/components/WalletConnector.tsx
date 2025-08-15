import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import React from "react"

const WalletConnector: React.FC = () => {
	const { connected, publicKey } = useWallet()

	return (
		<div className="flex items-center space-x-4">
			{connected && publicKey && (
				<div className="text-white text-sm bg-black/50 px-3 py-2 rounded">
					<div className="font-medium">Connected</div>
					<div className="text-xs opacity-80">
						{publicKey.toString().slice(0, 4)}...
						{publicKey.toString().slice(-4)}
					</div>
				</div>
			)}

			<WalletMultiButton className="!bg-purple-600 !text-white hover:!bg-purple-700 !border-0 !rounded-lg !px-4 !py-2 !text-sm !font-medium transition-colors" />
		</div>
	)
}

export default WalletConnector
