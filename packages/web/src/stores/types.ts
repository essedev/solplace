import type { AnchorWallet } from "@solana/wallet-adapter-react"
import type { Connection, PublicKey } from "@solana/web3.js"
import type {
	LogoPlacement,
	MapBounds,
	PlacementFee,
	SolplaceClient,
	UserCooldown
} from "@solplace/shared"

// Core Store State
export interface SolplaceStoreState {
	// Core Client & Connection
	client: SolplaceClient | null
	isClientInitialized: boolean
	connectionError: string | null

	// Map State
	mapBounds: MapBounds | null
	visibleLogos: LogoPlacement[]
	mapZoom: number
	isMapLoaded: boolean

	// User State
	userCooldown: UserCooldown | null
	isPlacing: boolean
	placementError: string | null

	// UI State
	showPlacer: boolean
	showLeaderboard: boolean
	selectedLocation: { lat: number; lng: number } | null

	// Current Cell State
	placementFee: PlacementFee | null
	currentCellLogo: LogoPlacement | null
	currentBounds: MapBounds | null

	// Loading States
	isLoadingFee: boolean
	isLoadingCooldown: boolean
	isLoadingLogos: boolean
}

// Store Actions
export interface SolplaceStoreActions {
	// Client Management
	initializeClient: (
		connection: Connection,
		wallet: AnchorWallet
	) => Promise<void>
	resetClient: () => void

	// Map Actions
	setMapBounds: (bounds: MapBounds) => void
	setVisibleLogos: (logos: LogoPlacement[]) => void
	setMapZoom: (zoom: number) => void
	setMapLoaded: (loaded: boolean) => void

	// Location & Cell Actions
	setSelectedLocation: (location: { lat: number; lng: number } | null) => void
	setPlacementFee: (fee: PlacementFee | null) => void
	setCurrentCellLogo: (logo: LogoPlacement | null) => void
	setCurrentBounds: (bounds: MapBounds | null) => void
	calculateFee: (lat: number, lng: number) => Promise<void>
	loadCellLogo: (lat: number, lng: number) => Promise<void>

	// User Actions
	loadUserCooldown: (publicKey: PublicKey) => Promise<void>
	setUserCooldown: (cooldown: UserCooldown | null) => void
	setIsPlacing: (placing: boolean) => void
	placeToken: (tokenMint: string) => Promise<string>

	// UI Actions
	setShowPlacer: (show: boolean) => void
	setShowLeaderboard: (show: boolean) => void

	// Utility Actions
	reset: () => void
	clearErrors: () => void
}

// Complete Store Interface
export interface SolplaceStore
	extends SolplaceStoreState,
		SolplaceStoreActions {}

// Store Slice Types
export interface ClientSlice {
	client: SolplaceClient | null
	isClientInitialized: boolean
	connectionError: string | null
	initializeClient: (
		connection: Connection,
		wallet: AnchorWallet
	) => Promise<void>
	resetClient: () => void
}

export interface MapSlice {
	mapBounds: MapBounds | null
	visibleLogos: LogoPlacement[]
	mapZoom: number
	isMapLoaded: boolean
	isLoadingLogos: boolean
	setMapBounds: (bounds: MapBounds) => void
	setVisibleLogos: (logos: LogoPlacement[]) => void
	setMapZoom: (zoom: number) => void
	setMapLoaded: (loaded: boolean) => void
}

export interface UserSlice {
	userCooldown: UserCooldown | null
	isPlacing: boolean
	placementError: string | null
	isLoadingCooldown: boolean
	loadUserCooldown: (publicKey: PublicKey) => Promise<void>
	setUserCooldown: (cooldown: UserCooldown | null) => void
	setIsPlacing: (placing: boolean) => void
	placeToken: (tokenMint: string) => Promise<string>
}

export interface UISlice {
	showPlacer: boolean
	showLeaderboard: boolean
	selectedLocation: { lat: number; lng: number } | null
	placementFee: PlacementFee | null
	currentCellLogo: LogoPlacement | null
	currentBounds: MapBounds | null
	isLoadingFee: boolean
	setSelectedLocation: (location: { lat: number; lng: number } | null) => void
	setPlacementFee: (fee: PlacementFee | null) => void
	setCurrentCellLogo: (logo: LogoPlacement | null) => void
	setCurrentBounds: (bounds: MapBounds | null) => void
	calculateFee: (lat: number, lng: number) => Promise<void>
	loadCellLogo: (lat: number, lng: number) => Promise<void>
	setShowPlacer: (show: boolean) => void
	setShowLeaderboard: (show: boolean) => void
}
