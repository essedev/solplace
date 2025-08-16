import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { createClientSlice } from "./slices/client-slice"
import { createMapSlice } from "./slices/map-slice"
import { createUISlice } from "./slices/ui-slice"
import { createUserSlice } from "./slices/user-slice"
import type { SolplaceStore } from "./types"

export const useSolplaceStore = create<SolplaceStore>()(
	devtools(
		(...a) => ({
			// Combine all slices
			...createClientSlice(...a),
			...createMapSlice(...a),
			...createUserSlice(...a),
			...createUISlice(...a),

			// Global actions
			reset: () => {
				// Reset all state to initial values
				a[0]({
					// Client state
					client: null,
					isClientInitialized: false,
					connectionError: null,

					// Map state
					mapBounds: null,
					visibleLogos: [],
					mapZoom: 10,
					isMapLoaded: false,
					isLoadingLogos: false,

					// User state
					userCooldown: null,
					isPlacing: false,
					placementError: null,
					isLoadingCooldown: false,

					// UI state
					showPlacer: false,
					showLeaderboard: false,
					selectedLocation: null,
					placementFee: null,
					currentCellLogo: null,
					currentBounds: null,
					isLoadingFee: false
				})
			},

			clearErrors: () => {
				// Clear all error states
				a[0]({
					connectionError: null,
					placementError: null
				})
			}
		}),
		{
			name: "SolPlace Store"
		}
	)
)

// Export store type for TypeScript
export type SolplaceStoreType = typeof useSolplaceStore
