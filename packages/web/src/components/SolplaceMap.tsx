import type { LogoPlacement, MapBounds } from "@solplace/shared"
import {
	getGridCellBounds,
	getGridCellCenter,
	getVisibleGridCells,
	latLngToGridCell
} from "@solplace/shared"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useCallback, useEffect, useRef } from "react"
import { useSolplaceMap, useSolplaceStore } from "../stores"

// MapLibre GL JS style for a basic map
const MAP_STYLE: maplibregl.StyleSpecification = {
	version: 8,
	sources: {
		osm: {
			type: "raster",
			tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
			tileSize: 256,
			attribution: "© OpenStreetMap contributors"
		}
	},
	layers: [
		{
			id: "osm",
			type: "raster",
			source: "osm"
		}
	]
}

interface SolplaceMapProps {
	onMapClick?: (lat: number, lng: number) => void
	onBoundsChange?: (bounds: MapBounds) => void
	onMapHover?: (lat: number, lng: number) => void
	onMapHoverEnd?: () => void
	onLogoCellClick?: (logo: LogoPlacement) => void
}

const SolplaceMap: React.FC<SolplaceMapProps> = ({
	onMapClick,
	onBoundsChange,
	onMapHover,
	onMapHoverEnd,
	onLogoCellClick
}) => {
	const mapContainer = useRef<HTMLDivElement>(null)
	const mapRef = useRef<maplibregl.Map | null>(null)

	// Use store for map state - PROPERLY MEMOIZED!
	const {
		visibleLogos,
		mapZoom,
		isMapLoaded,
		setVisibleLogos,
		setMapZoom,
		setMapLoaded,
		setMapBounds
	} = useSolplaceMap()

	// Use store for client - NO INITIALIZATION HERE!
	const client = useSolplaceStore((state) => state.client)

	const MIN_ZOOM_FOR_LOGOS = 16

	// Render individual logos on map
	const renderLogosOnMap = useCallback(
		(logos: LogoPlacement[]) => {
			if (!mapRef.current || !isMapLoaded) return

			const map = mapRef.current

			// Remove existing logo layers
			if (map.getLayer("logos")) {
				map.removeLayer("logos")
			}
			if (map.getSource("logos")) {
				map.removeSource("logos")
			}

			// Load logo images into the map
			const loadLogoImages = async () => {
				for (const logo of logos) {
					const imageId = `logo-${logo.tokenMint}`

					// Skip if already loaded
					if (map.hasImage(imageId)) continue

					try {
						// Load the image
						const img = new Image()
						img.crossOrigin = "anonymous"

						await new Promise((resolve, reject) => {
							img.onload = resolve
							img.onerror = reject
							img.src = logo.logoUri
						})

						// Add to map
						map.addImage(imageId, img, { sdf: false })
					} catch (error) {
						console.warn(
							`Failed to load logo for ${logo.tokenMint}:`,
							error
						)

						// Add a fallback circle
						const canvas = document.createElement("canvas")
						canvas.width = 32
						canvas.height = 32
						const ctx = canvas.getContext("2d")!

						// Draw a colored circle based on token mint
						const hue =
							Math.abs(
								logo.tokenMint.split("").reduce((a, b) => {
									a = (a << 5) - a + b.charCodeAt(0)
									return a & a
								}, 0)
							) % 360

						ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
						ctx.beginPath()
						ctx.arc(16, 16, 12, 0, 2 * Math.PI)
						ctx.fill()

						// Convert canvas to ImageData
						const imageData = ctx.getImageData(0, 0, 32, 32)
						map.addImage(imageId, imageData)
					}
				}
			}

			// Load images first, then create the layer
			loadLogoImages().then(() => {
				// Create GeoJSON features for individual logos
				const features = logos.map((logo) => ({
					type: "Feature" as const,
					geometry: {
						type: "Point" as const,
						coordinates: [
							logo.coordinates[1] / 1_000_000, // lng
							logo.coordinates[0] / 1_000_000 // lat
						]
					},
					properties: {
						tokenMint: logo.tokenMint,
						logoUri: logo.logoUri,
						placedBy: logo.placedBy,
						placedAt: logo.placedAt,
						overwriteCount: logo.overwriteCount
					}
				}))

				// Add source
				map.addSource("logos", {
					type: "geojson",
					data: {
						type: "FeatureCollection",
						features
					}
				})

				// Add layer with dynamic icon references
				map.addLayer({
					id: "logos",
					type: "symbol",
					source: "logos",
					layout: {
						"icon-image": ["concat", "logo-", ["get", "tokenMint"]],
						"icon-size": 0.8,
						"icon-allow-overlap": true,
						"icon-ignore-placement": true
					}
				})
			})

			// Click handler for logo details -> delegate via callback
			map.on("click", "logos", (e) => {
				if (e.features && e.features[0]) {
					const feature = e
						.features[0] as maplibregl.MapGeoJSONFeature
					const props = feature.properties as unknown as Record<
						string,
						unknown
					>
					if (props && onLogoCellClick) {
						onLogoCellClick({
							coordinates: [
								props.coordinatesLat ?? props.lat ?? 0,
								props.coordinatesLng ?? props.lng ?? 0
							],
							logoUri: props.logoUri,
							tokenMint: props.tokenMint,
							placedBy: props.placedBy,
							placedAt: props.placedAt,
							overwriteCount: props.overwriteCount
						} as LogoPlacement)
					}
				}
			})

			// Change cursor on hover
			map.on("mouseenter", "logos", () => {
				if (mapRef.current) {
					mapRef.current.getCanvas().style.cursor = "pointer"
				}
			})

			map.on("mouseleave", "logos", () => {
				if (mapRef.current) {
					mapRef.current.getCanvas().style.cursor = ""
				}
			})
		},
		[isMapLoaded, onLogoCellClick]
	)

	// Show/hide grid overlay based on zoom level
	const updateGridDisplay = useCallback(
		(map: maplibregl.Map) => {
			const zoom = map.getZoom()
			const bounds = map.getBounds()
			const mapBounds = {
				minLat: bounds.getSouth(),
				maxLat: bounds.getNorth(),
				minLng: bounds.getWest(),
				maxLng: bounds.getEast(),
				zoom: zoom
			}

			// Update store with current bounds and zoom
			setMapBounds(mapBounds)
			setMapZoom(zoom)

			// Always notify parent component of bounds change
			onBoundsChange?.(mapBounds)

			// Show grid at high zoom levels
			if (zoom >= 18) {
				// Get visible grid cells
				const gridCells = getVisibleGridCells(mapBounds)

				// Don't show too many grid lines
				if (gridCells.length <= 100) {
					// Remove existing grid
					if (map.getLayer("grid")) {
						map.removeLayer("grid")
					}
					if (map.getSource("grid")) {
						map.removeSource("grid")
					}

					// Create grid lines
					const gridFeatures = gridCells.map(([gridLat, gridLng]) => {
						const bounds = getGridCellBounds(gridLat, gridLng)
						return {
							type: "Feature" as const,
							geometry: {
								type: "Polygon" as const,
								coordinates: [
									[
										[bounds.minLng, bounds.minLat],
										[bounds.maxLng, bounds.minLat],
										[bounds.maxLng, bounds.maxLat],
										[bounds.minLng, bounds.maxLat],
										[bounds.minLng, bounds.minLat]
									]
								]
							},
							properties: {}
						}
					})

					// Add grid source
					map.addSource("grid", {
						type: "geojson",
						data: {
							type: "FeatureCollection",
							features: gridFeatures
						}
					})

					// Add grid layer
					map.addLayer({
						id: "grid",
						type: "line",
						source: "grid",
						paint: {
							"line-color": "#ffffff",
							"line-width": 1,
							"line-opacity": 0.3
						}
					})
				}
			} else {
				// Hide grid at lower zoom levels
				if (map.getLayer("grid")) {
					map.removeLayer("grid")
				}
				if (map.getSource("grid")) {
					map.removeSource("grid")
				}
			}
		},
		[onBoundsChange, setMapBounds, setMapZoom]
	)

	// Update visible logos based on map bounds
	const updateVisibleLogos = useCallback(
		async (map: maplibregl.Map) => {
			if (!client) return

			const zoom = map.getZoom()
			setMapZoom(zoom)

			// Hide logos if zoom too low
			if (zoom < MIN_ZOOM_FOR_LOGOS) {
				setVisibleLogos([])
				// Hide layer if exists
				if (map.getLayer("logos")) {
					map.setLayoutProperty("logos", "visibility", "none")
				}
				return
			}

			const bounds = map.getBounds()
			const mapBounds: MapBounds = {
				minLat: bounds.getSouth(),
				maxLat: bounds.getNorth(),
				minLng: bounds.getWest(),
				maxLng: bounds.getEast(),
				zoom: zoom
			}

			// Limit maximum area to avoid too many calls
			const latSpan = mapBounds.maxLat - mapBounds.minLat
			const lngSpan = mapBounds.maxLng - mapBounds.minLng
			const MAX_SPAN = 0.01 // ~1km approximately

			if (latSpan > MAX_SPAN || lngSpan > MAX_SPAN) {
				console.warn("Area too large, zoom in further to load logos")
				return
			}

			try {
				const logos = await client.getLogosInBounds(mapBounds)
				console.log(
					`Loaded ${logos.length} logos for bounds:`,
					mapBounds
				)
				setVisibleLogos(logos)

				// Show layer if it was hidden
				if (map.getLayer("logos")) {
					map.setLayoutProperty("logos", "visibility", "visible")
				}
			} catch (error) {
				console.error("Failed to load logos:", error)
			}
		},
		[client, setMapZoom, setVisibleLogos] // FIXED: Removed unstable callback dependencies
	)

	// CRITICAL FIX: Initialize map separately from client
	// This prevents the map from being recreated when modal state changes!
	useEffect(() => {
		if (!mapContainer.current || mapRef.current) return

		const map = new maplibregl.Map({
			container: mapContainer.current,
			style: MAP_STYLE,
			center: [-117.267998, 32.991602], // San Diego coordinates
			zoom: 10,
			attributionControl: false
		})

		map.on("load", () => {
			setMapLoaded(true)

			// Add move handler for loading logos with debouncing
			let timeoutId: NodeJS.Timeout
			const debouncedUpdate = () => {
				clearTimeout(timeoutId)
				timeoutId = setTimeout(() => {
					updateVisibleLogos(map)
				}, 300) // 300ms debounce
			}

			map.on("moveend", debouncedUpdate)
			map.on("zoomend", debouncedUpdate)

			// Initial logo load
			updateVisibleLogos(map)
		})

		mapRef.current = map

		return () => {
			map.remove()
			mapRef.current = null
		}
		// CRITICAL: Only depend on static values - no callback dependencies!
	}, [setMapLoaded, updateVisibleLogos])

	// SEPARATE useEffect for updating event handlers
	// This allows callbacks to change without recreating the map
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded) return

		const map = mapRef.current

		// Store current handlers to avoid memory leaks
		const clickHandler = (e: maplibregl.MapMouseEvent) => {
			const { lat, lng } = e.lngLat
			const [gridLat, gridLng] = latLngToGridCell(lat, lng)
			const [snappedLat, snappedLng] = getGridCellCenter(gridLat, gridLng)
			onMapClick?.(snappedLat, snappedLng)
		}

		const mouseMoveHandler = (e: maplibregl.MapMouseEvent) => {
			const { lat, lng } = e.lngLat
			const [gridLat, gridLng] = latLngToGridCell(lat, lng)
			const [snappedLat, snappedLng] = getGridCellCenter(gridLat, gridLng)
			onMapHover?.(snappedLat, snappedLng)
		}

		const mouseLeaveHandler = () => {
			onMapHoverEnd?.()
		}

		// Add handlers
		map.on("click", clickHandler)
		map.on("mousemove", mouseMoveHandler)
		map.on("mouseleave", mouseLeaveHandler)

		// Cleanup function
		return () => {
			map.off("click", clickHandler)
			map.off("mousemove", mouseMoveHandler)
			map.off("mouseleave", mouseLeaveHandler)
		}
	}, [onMapClick, onMapHover, onMapHoverEnd, isMapLoaded])

	// Update grid display when map loads or zoom changes
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded) return
		updateGridDisplay(mapRef.current)
	}, [isMapLoaded, mapZoom, updateGridDisplay])

	// Render logos when they change
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded || !visibleLogos.length) return
		renderLogosOnMap(visibleLogos)
	}, [visibleLogos, isMapLoaded, renderLogosOnMap])

	return (
		<div className="relative w-full h-full">
			<div ref={mapContainer} className="w-full h-full" />

			{/* Loading overlay */}
			{!isMapLoaded && (
				<div className="absolute inset-0 backdrop-blur-sm bg-slate-900/80 flex items-center justify-center z-10">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-transparent mx-auto mb-5"></div>
						<p className="text-sm font-medium tracking-wide text-slate-300">
							Loading map…
						</p>
					</div>
				</div>
			)}

			{/* Status panel */}
			{isMapLoaded && (
				<div className="absolute bottom-4 left-4 floating-panel backdrop-blur-md pointer-events-auto w-60 sm:w-64 fade-in">
					<div className="p-3 space-y-2 text-[11px] leading-relaxed">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-slate-200/90">
								Zoom
							</span>
							<span className="font-mono text-slate-300">
								{mapZoom.toFixed(1)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-semibold text-slate-200/90">
								Logos
							</span>
							{mapZoom < MIN_ZOOM_FOR_LOGOS ? (
								<span className="text-amber-300 flex items-center gap-1">
									⚠️{" "}
									<span className="hidden sm:inline">
										Zoom {MIN_ZOOM_FOR_LOGOS}+ to view
									</span>
								</span>
							) : (
								<span className="font-mono text-slate-300">
									{visibleLogos.length}
								</span>
							)}
						</div>
						{visibleLogos.length > 0 && (
							<div className="flex items-center justify-between">
								<span className="font-semibold text-slate-200/90">
									Last placed
								</span>
								<span className="font-mono text-slate-300">
									{new Date(
										Math.max(
											...visibleLogos.map(
												(logo) => logo.placedAt * 1000
											)
										)
									).toLocaleTimeString()}
								</span>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

export default SolplaceMap
