import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
	ConnectionProvider,
	WalletProvider
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"
import { useCallback, useEffect, useMemo, useState } from "react"

import CooldownTimer from "./components/CooldownTimer"
import FeeEstimator from "./components/FeeEstimator"
import Leaderboard from "./components/Leaderboard"
import SolplaceMap from "./components/SolplaceMap"
import TokenPlacer from "./components/TokenPlacer"
import WalletConnector from "./components/WalletConnector"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import type { MapBounds, PlacementFee, UserCooldown } from "@solplace/shared"
import {
	SOLPLACE_PROGRAM_ID,
	SolplaceClient,
	TREASURY_WALLET
} from "@solplace/shared"

const DEVNET_RPC_ENDPOINT =
	import.meta.env.VITE_RPC_ENDPOINT ||
	clusterApiUrl(WalletAdapterNetwork.Devnet)

// Inner component that uses wallet context
const AppContent = () => {
	const [selectedLocation, setSelectedLocation] = useState<{
		lat: number
		lng: number
	} | null>(null)
	const [placementFee, setPlacementFee] = useState<PlacementFee | null>(null)
	const [userCooldown, setUserCooldown] = useState<UserCooldown | null>(null)
	const [isPlacing, setIsPlacing] = useState(false)
	const [showPlacer, setShowPlacer] = useState(false)
	const [showLeaderboard, setShowLeaderboard] = useState(false)
	const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)

	const wallet = useAnchorWallet()
	const { connection } = useConnection()

	// Derived state from wallet
	const connected = !!wallet
	const publicKey = wallet?.publicKey

	// Initialize client when wallet is available
	const client = useMemo(() => {
		if (!wallet) return null

		const programId = new PublicKey(SOLPLACE_PROGRAM_ID)

		return new SolplaceClient(connection, wallet, programId, {
			enableCaching: true,
			cacheExpiry: 5 * 60 * 1000,
			enableSubscriptions: true
		})
	}, [connection, wallet])

	// Handle map click
	const handleMapClick = useCallback(
		async (lat: number, lng: number) => {
			if (!connected || !publicKey) {
				alert("Please connect your wallet first")
				return
			}

			setSelectedLocation({ lat, lng })
			setShowPlacer(true)

			// Calculate fee for this location
			try {
				if (!client) {
					throw new Error("Wallet not connected")
				}
				const fee = await client.calculateFee(lat, lng)
				setPlacementFee(fee)

				// Check user cooldown
				const cooldown = await client.getUserCooldown(publicKey)
				setUserCooldown(cooldown)
			} catch (error) {
				console.error(
					"Failed to calculate fee or check cooldown:",
					error
				)
			}
		},
		[connected, publicKey, client]
	)

	// Load user cooldown on wallet connect
	useEffect(() => {
		if (connected && publicKey && client) {
			const loadCooldown = async () => {
				try {
					const cooldown = await client.getUserCooldown(publicKey)
					setUserCooldown(cooldown)
				} catch (error) {
					console.error("Failed to load user cooldown:", error)
				}
			}
			loadCooldown()
		}
	}, [connected, publicKey, client])

	// Handle token placement
	const handlePlaceToken = useCallback(
		async (tokenMint: string) => {
			if (!selectedLocation || !publicKey || !connected || !client) return

			setIsPlacing(true)
			try {
				// Check if user can place (cooldown check)
				const canPlace = await client.canUserPlace(publicKey)
				if (!canPlace) {
					alert(
						"You are still on cooldown. Please wait before placing another token."
					)
					return
				}

				// Resolve logo URI for the token
				const { LogoResolver } = await import("@solplace/shared")
				const logoResolver = new LogoResolver()
				const resolvedLogo = await logoResolver.resolveLogo(tokenMint)

				// Use configured treasury address
				const treasuryAddress = new PublicKey(TREASURY_WALLET)

				// Place the logo on-chain
				const signature = await client.placeLogo(
					selectedLocation.lat,
					selectedLocation.lng,
					new PublicKey(tokenMint),
					resolvedLogo.logoUri,
					treasuryAddress
				)

				console.log("Logo placed successfully! Signature:", signature)
				alert(`Logo placed successfully! Transaction: ${signature}`)

				// Close placer
				setShowPlacer(false)
				setSelectedLocation(null)
				setPlacementFee(null)
			} catch (error) {
				console.error("Failed to place token:", error)
				alert(
					`Failed to place token: ${
						error instanceof Error ? error.message : "Unknown error"
					}`
				)
			} finally {
				setIsPlacing(false)
			}
		},
		[selectedLocation, publicKey, connected, client]
	)

	return (
		<div className="relative h-screen w-screen overflow-hidden">
			{/* Map Component - Full Screen */}
			<SolplaceMap
				onMapClick={handleMapClick}
				onBoundsChange={setCurrentBounds}
			/>

			{/* UI Overlay */}
			<div className="absolute inset-0 pointer-events-none">
				{/* Top Bar */}
				<div className="absolute top-0 left-0 right-0 p-4 z-10">
					<div className="flex justify-between items-center">
						<div className="pointer-events-auto">
							<h1 className="text-2xl font-bold text-white drop-shadow-lg">
								SolPlace
							</h1>
							<p className="text-sm text-white/80 drop-shadow">
								Collaborative Solana token map
							</p>
						</div>

						<div className="pointer-events-auto">
							<WalletConnector />
						</div>
					</div>
				</div>

				{/* Token Placer Modal */}
				{showPlacer && selectedLocation && (
					<TokenPlacer
						location={selectedLocation}
						fee={placementFee}
						onPlaceToken={handlePlaceToken}
						onClose={() => {
							setShowPlacer(false)
							setSelectedLocation(null)
							setPlacementFee(null)
						}}
						isPlacing={isPlacing}
						validateTokenMint={client?.validateTokenMint.bind(
							client
						)}
					/>
				)}

				{/* Cooldown Timer */}
				{connected && userCooldown && (
					<CooldownTimer cooldown={userCooldown} />
				)}

				{/* Fee Estimator (when hovering) */}
				{placementFee && !showPlacer && (
					<FeeEstimator fee={placementFee} />
				)}

				{/* Leaderboard - Positioned above instructions */}
				<div className="absolute bottom-36 right-4">
					<Leaderboard
						client={client}
						isVisible={showLeaderboard}
						onToggle={() => setShowLeaderboard(!showLeaderboard)}
						currentBounds={currentBounds || undefined}
					/>
				</div>

				{/* Instructions */}
				<div className="absolute bottom-4 right-4 bg-black/50 text-white p-4 rounded text-sm max-w-xs pointer-events-auto">
					<h3 className="font-bold mb-2">How to use SolPlace:</h3>
					<ul className="space-y-1 text-xs">
						<li>1. Connect your wallet</li>
						<li>2. Click on the map to select a location</li>
						<li>3. Enter a valid Solana token address</li>
						<li>4. Pay the placement fee</li>
						<li>5. Watch your token appear on the map!</li>
					</ul>
					{!connected && (
						<div className="mt-3 p-2 bg-purple-600 rounded text-center text-xs">
							👆 Connect wallet to start
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

function App() {
	// Use empty wallets array since Standard Wallet adapters auto-detect
	const wallets = useMemo(() => [], [])

	return (
		<ConnectionProvider endpoint={DEVNET_RPC_ENDPOINT}>
			<WalletProvider wallets={wallets} autoConnect>
				<WalletModalProvider>
					<AppContent />
				</WalletModalProvider>
			</WalletProvider>
		</ConnectionProvider>
	)
}

export default App
