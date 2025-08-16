import type { LogoPlacement, MapBounds, PlacementFee } from "@solplace/shared"
import type { StateCreator } from "zustand"
import type { SolplaceStore, UISlice } from "../types"

export const createUISlice: StateCreator<SolplaceStore, [], [], UISlice> = (
	set,
	get
) => ({
	// State
	showPlacer: false,
	showLeaderboard: false,
	selectedLocation: null,
	placementFee: null,
	currentCellLogo: null,
	currentBounds: null,
	isLoadingFee: false,

	// Actions
	setSelectedLocation: (location: { lat: number; lng: number } | null) => {
		set({ selectedLocation: location })
	},

	setPlacementFee: (fee: PlacementFee | null) => {
		set({ placementFee: fee })
	},

	setCurrentCellLogo: (logo: LogoPlacement | null) => {
		set({ currentCellLogo: logo })
	},

	setCurrentBounds: (bounds: MapBounds | null) => {
		set({ currentBounds: bounds })
	},

	calculateFee: async (lat: number, lng: number) => {
		const { client } = get()
		if (!client) {
			console.warn("Client not initialized")
			return
		}

		set({ isLoadingFee: true })

		try {
			const fee = await client.calculateFee(lat, lng)
			set({
				placementFee: fee,
				isLoadingFee: false
			})
		} catch (error) {
			console.error("Failed to calculate fee:", error)
			set({
				placementFee: null,
				isLoadingFee: false
			})
		}
	},

	loadCellLogo: async (lat: number, lng: number) => {
		const { client } = get()
		if (!client) {
			console.warn("Client not initialized")
			return
		}

		try {
			const logo = await client.getLogoAtCoordinates(lat, lng)
			set({ currentCellLogo: logo })
		} catch (error) {
			console.error("Failed to load cell logo:", error)
			set({ currentCellLogo: null })
		}
	},

	setShowPlacer: (show: boolean) => {
		set({ showPlacer: show })

		// Clear fee and logo when closing placer
		if (!show) {
			set({
				placementFee: null,
				currentCellLogo: null,
				selectedLocation: null
			})
		}
	},

	setShowLeaderboard: (show: boolean) => {
		set({ showLeaderboard: show })
	}
})
