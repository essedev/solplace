import { selectors } from "../stores/selectors"
import { useSolplaceStore } from "../stores/solplace-store"

/**
 * Main hook to access the Solplace store
 */
export { useSolplaceStore }

/**
 * Hook for accessing computed selectors
 */
export const useSolplaceSelectors = () => ({
	canPlaceToken: useSolplaceStore(selectors.canPlaceToken),
	hasActiveModal: useSolplaceStore(selectors.hasActiveModal),
	isMapReady: useSolplaceStore(selectors.isMapReady),
	remainingCooldownSeconds: useSolplaceStore(
		selectors.remainingCooldownSeconds
	),
	isLoading: useSolplaceStore(selectors.isLoading),
	currentError: useSolplaceStore(selectors.currentError),
	mapCenter: useSolplaceStore(selectors.mapCenter)
})

/**
 * Hook for accessing specific store slices WITH STABLE REFERENCES
 */
export const useSolplaceClient = () => {
	const client = useSolplaceStore((state) => state.client)
	const isClientInitialized = useSolplaceStore(
		(state) => state.isClientInitialized
	)
	const connectionError = useSolplaceStore((state) => state.connectionError)
	const initializeClient = useSolplaceStore((state) => state.initializeClient)
	const resetClient = useSolplaceStore((state) => state.resetClient)

	return {
		client,
		isClientInitialized,
		connectionError,
		initializeClient,
		resetClient
	}
}

export const useSolplaceMap = () => {
	const mapBounds = useSolplaceStore((state) => state.mapBounds)
	const visibleLogos = useSolplaceStore((state) => state.visibleLogos)
	const mapZoom = useSolplaceStore((state) => state.mapZoom)
	const isMapLoaded = useSolplaceStore((state) => state.isMapLoaded)
	const isLoadingLogos = useSolplaceStore((state) => state.isLoadingLogos)
	const setMapBounds = useSolplaceStore((state) => state.setMapBounds)
	const setVisibleLogos = useSolplaceStore((state) => state.setVisibleLogos)
	const setMapZoom = useSolplaceStore((state) => state.setMapZoom)
	const setMapLoaded = useSolplaceStore((state) => state.setMapLoaded)

	return {
		mapBounds,
		visibleLogos,
		mapZoom,
		isMapLoaded,
		isLoadingLogos,
		setMapBounds,
		setVisibleLogos,
		setMapZoom,
		setMapLoaded
	}
}

export const useSolplaceUser = () => {
	const userCooldown = useSolplaceStore((state) => state.userCooldown)
	const isPlacing = useSolplaceStore((state) => state.isPlacing)
	const placementError = useSolplaceStore((state) => state.placementError)
	const isLoadingCooldown = useSolplaceStore(
		(state) => state.isLoadingCooldown
	)
	const loadUserCooldown = useSolplaceStore((state) => state.loadUserCooldown)
	const setUserCooldown = useSolplaceStore((state) => state.setUserCooldown)
	const setIsPlacing = useSolplaceStore((state) => state.setIsPlacing)
	const placeToken = useSolplaceStore((state) => state.placeToken)

	return {
		userCooldown,
		isPlacing,
		placementError,
		isLoadingCooldown,
		loadUserCooldown,
		setUserCooldown,
		setIsPlacing,
		placeToken
	}
}

export const useSolplaceUI = () => {
	const showPlacer = useSolplaceStore((state) => state.showPlacer)
	const showLeaderboard = useSolplaceStore((state) => state.showLeaderboard)
	const selectedLocation = useSolplaceStore((state) => state.selectedLocation)
	const placementFee = useSolplaceStore((state) => state.placementFee)
	const currentCellLogo = useSolplaceStore((state) => state.currentCellLogo)
	const currentBounds = useSolplaceStore((state) => state.currentBounds)
	const isLoadingFee = useSolplaceStore((state) => state.isLoadingFee)
	const setSelectedLocation = useSolplaceStore(
		(state) => state.setSelectedLocation
	)
	const setPlacementFee = useSolplaceStore((state) => state.setPlacementFee)
	const setCurrentCellLogo = useSolplaceStore(
		(state) => state.setCurrentCellLogo
	)
	const setCurrentBounds = useSolplaceStore((state) => state.setCurrentBounds)
	const calculateFee = useSolplaceStore((state) => state.calculateFee)
	const loadCellLogo = useSolplaceStore((state) => state.loadCellLogo)
	const setShowPlacer = useSolplaceStore((state) => state.setShowPlacer)
	const setShowLeaderboard = useSolplaceStore(
		(state) => state.setShowLeaderboard
	)

	return {
		showPlacer,
		showLeaderboard,
		selectedLocation,
		placementFee,
		currentCellLogo,
		currentBounds,
		isLoadingFee,
		setSelectedLocation,
		setPlacementFee,
		setCurrentCellLogo,
		setCurrentBounds,
		calculateFee,
		loadCellLogo,
		setShowPlacer,
		setShowLeaderboard
	}
}

/**
 * Hook for global store actions
 */
export const useSolplaceActions = () => {
	const reset = useSolplaceStore((state) => state.reset)
	const clearErrors = useSolplaceStore((state) => state.clearErrors)

	return {
		reset,
		clearErrors
	}
}
