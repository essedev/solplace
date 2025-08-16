import type { LogoPlacement, MapBounds } from "@solplace/shared"
import type { StateCreator } from "zustand"
import type { MapSlice, SolplaceStore } from "../types"

export const createMapSlice: StateCreator<SolplaceStore, [], [], MapSlice> = (
	set
) => ({
	// State
	mapBounds: null,
	visibleLogos: [],
	mapZoom: 10,
	isMapLoaded: false,
	isLoadingLogos: false,

	// Actions
	setMapBounds: (bounds: MapBounds) => {
		set({ mapBounds: bounds })
	},

	setVisibleLogos: (logos: LogoPlacement[]) => {
		set({
			visibleLogos: logos,
			isLoadingLogos: false
		})
	},

	setMapZoom: (zoom: number) => {
		set({ mapZoom: zoom })
	},

	setMapLoaded: (loaded: boolean) => {
		set({ isMapLoaded: loaded })
	}
})
