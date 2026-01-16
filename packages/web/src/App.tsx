import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
	ConnectionProvider,
	WalletProvider
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"
import { useCallback, useEffect, useMemo, useRef } from "react"

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
import { TREASURY_WALLET } from "@solplace/shared"
import { useSolplaceClient, useSolplaceUI, useSolplaceUser } from "./stores"

const DEVNET_RPC_ENDPOINT =
	import.meta.env.VITE_RPC_ENDPOINT ||
	clusterApiUrl(WalletAdapterNetwork.Devnet)

// Inner component that uses wallet context
const AppContent = () => {
	// Use Zustand stores instead of local state
	const {
		selectedLocation,
		placementFee,
		showPlacer,
		showLeaderboard,
		currentBounds,
		currentCellLogo,
		setSelectedLocation,
		setPlacementFee,
		setShowPlacer,
		setShowLeaderboard,
		setCurrentBounds,
		setCurrentCellLogo
	} = useSolplaceUI()

	const { userCooldown, isPlacing, setUserCooldown, setIsPlacing } =
		useSolplaceUser()

	const { client, initializeClient } = useSolplaceClient()

	const wallet = useAnchorWallet()
	const { connection } = useConnection()

	// Derived state from wallet
	const connected = !!wallet
	const publicKey = wallet?.publicKey

	// Initialize client when wallet is available
	useEffect(() => {
		if (wallet && connection) {
			initializeClient(connection, wallet).catch((error) => {
				console.error("Failed to initialize client:", error)
			})
		}
	}, [connection, wallet, initializeClient])

	// Handle map click
	const handleMapClick = useCallback(
		async (lat: number, lng: number) => {
			if (!connected || !publicKey) {
				alert("Please connect your wallet first")
				return
			}

			setSelectedLocation({ lat, lng })
			// Fetch existing logo in that cell (if any)
			try {
				if (client) {
					const existing = await client.getLogoAtCoordinates(lat, lng)
					setCurrentCellLogo(existing)
				}
			} catch (e) {
				console.warn("Failed to fetch existing logo", e)
			}
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
		[
			connected,
			publicKey,
			client,
			setCurrentCellLogo,
			setPlacementFee,
			setSelectedLocation,
			setShowPlacer,
			setUserCooldown
		]
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
	}, [connected, publicKey, client, setUserCooldown])

	// Handle token placement
	const handlePlaceToken = useCallback(
		async (tokenMint: string, logoUri?: string) => {
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

				// Always resolve metadata to get the most reliable image URL
				const { tokenMetadataResolver } = await import(
					"@solplace/shared"
				)
				const metadata = await tokenMetadataResolver.resolveMetadata(
					tokenMint
				)

				// Use metadata image as primary source, fallback to provided logoUri, then to identicon
				const finalLogoUri =
					metadata?.image ||
					logoUri ||
					`https://api.dicebear.com/7.x/identicon/svg?seed=${tokenMint}&size=64`

				console.log(
					"📸 Using logo URI:",
					finalLogoUri,
					"from source:",
					metadata?.source || "fallback"
				)

				// Use configured treasury address
				const treasuryAddress = new PublicKey(TREASURY_WALLET)

				// Place the logo on-chain
				const signature = await client.placeLogo(
					selectedLocation.lat,
					selectedLocation.lng,
					new PublicKey(tokenMint),
					finalLogoUri,
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
		[
			selectedLocation,
			publicKey,
			connected,
			client,
			setIsPlacing,
			setPlacementFee,
			setSelectedLocation,
			setShowPlacer
		]
	)

	// Handle map hover for fee estimation with debounce
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const handleMapHover = useCallback(
		async (lat: number, lng: number) => {
			if (!connected || !client || showPlacer) {
				return
			}

			// Clear previous timeout
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current)
			}

			// Set new timeout for debounced fee calculation
			hoverTimeoutRef.current = setTimeout(async () => {
				try {
					const [fee, logo] = await Promise.all([
						client.calculateFee(lat, lng),
						client.getLogoAtCoordinates(lat, lng)
					])
					setPlacementFee(fee)
					setCurrentCellLogo(logo)
				} catch (error) {
					console.error("Failed to calculate hover fee:", error)
				}
			}, 300)
		},
		[connected, client, showPlacer, setCurrentCellLogo, setPlacementFee]
	)

	// Handle map hover end
	const handleMapHoverEnd = useCallback(() => {
		// Clear pending hover timeout
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current)
			hoverTimeoutRef.current = null
		}

		if (!showPlacer) {
			setPlacementFee(null)
			setCurrentCellLogo(null)
		}
	}, [showPlacer, setCurrentCellLogo, setPlacementFee])

	return (
		<div className="relative h-screen w-screen overflow-hidden">
			{/* Map Component - Full Screen */}
			<SolplaceMap
				onMapClick={handleMapClick}
				onBoundsChange={setCurrentBounds}
				onMapHover={handleMapHover}
				onMapHoverEnd={handleMapHoverEnd}
			/>

			{/* UI Overlay */}
			<div className="absolute inset-0 pointer-events-none">
				{/* Top Bar */}
				<div className="absolute top-0 left-0 right-0 p-4 z-10">
					<div className="flex justify-between items-start gap-4">
						<div className="pointer-events-auto select-none">
							<h1 className="text-3xl font-extrabold tracking-tight brand-gradient drop-shadow-sm">
								SolPlace
							</h1>
							<p className="text-xs md:text-sm text-slate-300/80 mt-1 max-w-sm leading-relaxed">
								A collaborative on-chain token placement map on
								Solana.
							</p>
						</div>
						<div className="pointer-events-auto flex items-center gap-3">
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
							setCurrentCellLogo(null)
						}}
						isPlacing={isPlacing}
						validateTokenMint={client?.validateTokenMint.bind(
							client
						)}
						existingLogo={currentCellLogo}
					/>
				)}

				{/* Cooldown Timer */}
				{connected && userCooldown && (
					<CooldownTimer cooldown={userCooldown} />
				)}

				{/* Fee Estimator (when hovering) */}
				{placementFee && !showPlacer && (
					<FeeEstimator
						fee={placementFee}
						existingLogo={currentCellLogo}
					/>
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
				<div className="absolute bottom-4 right-4 floating-panel backdrop-blur-md pointer-events-auto w-72 sm:w-80 fade-in">
					<div className="p-4 pb-3">
						<h3 className="text-xs font-semibold tracking-wide uppercase text-slate-300/90 flex items-center gap-2">
							<span className="text-sm">🧭</span>Quick Guide
						</h3>
						<ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-slate-300/90">
							<li className="flex gap-1">
								<span className="text-slate-400">1.</span>
								<span>Connect wallet</span>
							</li>
							<li className="flex gap-1">
								<span className="text-slate-400">2.</span>
								<span>Click a grid cell</span>
							</li>
							<li className="flex gap-1">
								<span className="text-slate-400">3.</span>
								<span>Enter token mint</span>
							</li>
							<li className="flex gap-1">
								<span className="text-slate-400">4.</span>
								<span>Confirm & pay</span>
							</li>
							<li className="flex gap-1">
								<span className="text-slate-400">5.</span>
								<span>Logo appears live</span>
							</li>
						</ul>
						{!connected && (
							<div className="mt-3 text-center">
								<div className="badge-soft w-full justify-center bg-purple-600/30 text-purple-100 ring-1 ring-inset ring-purple-500/40">
									👆 Connect wallet to start
								</div>
							</div>
						)}
					</div>
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
