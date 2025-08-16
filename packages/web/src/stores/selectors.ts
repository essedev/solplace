import type { SolplaceStore } from "./types"

/**
 * Computed selectors for common state combinations
 */
export const selectors = {
	// Check if user can place a token
	canPlaceToken: (state: SolplaceStore) => {
		if (!state.client || !state.selectedLocation || state.isPlacing) {
			return false
		}

		// Check cooldown
		if (state.userCooldown) {
			const COOLDOWN_SECONDS = 300 // 5 minutes
			const timeSinceLastPlacement =
				Math.floor(Date.now() / 1000) - state.userCooldown.lastPlacement
			return timeSinceLastPlacement >= COOLDOWN_SECONDS
		}

		return true
	},

	// Check if any modal is active
	hasActiveModal: (state: SolplaceStore) =>
		state.showPlacer || state.showLeaderboard,

	// Check if map is ready for interaction
	isMapReady: (state: SolplaceStore) =>
		state.isMapLoaded && state.isClientInitialized,

	// Get remaining cooldown time in seconds
	remainingCooldownSeconds: (state: SolplaceStore) => {
		if (!state.userCooldown) return 0

		const COOLDOWN_SECONDS = 300 // 5 minutes
		const timeSinceLastPlacement =
			Math.floor(Date.now() / 1000) - state.userCooldown.lastPlacement
		const remaining = COOLDOWN_SECONDS - timeSinceLastPlacement

		return Math.max(0, remaining)
	},

	// Check if currently loading any async operation
	isLoading: (state: SolplaceStore) =>
		state.isLoadingFee ||
		state.isLoadingCooldown ||
		state.isLoadingLogos ||
		state.isPlacing,

	// Get current error state
	currentError: (state: SolplaceStore) =>
		state.connectionError || state.placementError,

	// Get map center from bounds
	mapCenter: (state: SolplaceStore) => {
		if (!state.mapBounds) return null

		return {
			lat: (state.mapBounds.minLat + state.mapBounds.maxLat) / 2,
			lng: (state.mapBounds.minLng + state.mapBounds.maxLng) / 2
		}
	}
}

/**
 * Selector hook factory for easy use in components
 */
export const createSelector = <T>(selector: (state: SolplaceStore) => T) =>
	selector
