import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import type { LogoPlacement, MapBounds } from "@solplace/shared"
import {
	SOLPLACE_PROGRAM_ID,
	SolplaceClient,
	getGridCellBounds,
	getGridCellCenter,
	getVisibleGridCells,
	latLngToGridCell
} from "@solplace/shared"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useCallback, useEffect, useRef, useState } from "react"

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
	const [isLoaded, setIsLoaded] = useState(false)
	const [visibleLogos, setVisibleLogos] = useState<LogoPlacement[]>([])
	const [currentZoom, setCurrentZoom] = useState(10)

	const { connection } = useConnection()
	const wallet = useAnchorWallet()

	// Initialize Solplace client
	const solplaceClient = useRef<SolplaceClient | null>(null)

	const MIN_ZOOM_FOR_LOGOS = 16

	// Render individual logos on map
	const renderLogosOnMap = useCallback(
		(logos: LogoPlacement[]) => {
			if (!mapRef.current || !isLoaded) return

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
		[isLoaded, onLogoCellClick]
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
		[onBoundsChange]
	)

	// Update visible logos based on map bounds
	const updateVisibleLogos = useCallback(
		async (map: maplibregl.Map) => {
			if (!solplaceClient.current) return

			const zoom = map.getZoom()
			setCurrentZoom(zoom)

			// Nascondi loghi se zoom troppo basso
			if (zoom < MIN_ZOOM_FOR_LOGOS) {
				setVisibleLogos([])
				// Nascondi layer se esiste
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

			// Limita l'area massima per evitare troppe chiamate
			const latSpan = mapBounds.maxLat - mapBounds.minLat
			const lngSpan = mapBounds.maxLng - mapBounds.minLng
			const MAX_SPAN = 0.01 // ~1km circa

			if (latSpan > MAX_SPAN || lngSpan > MAX_SPAN) {
				console.warn(
					"Area troppo grande, zoom ulteriormente per caricare i loghi"
				)
				return
			}

			try {
				const logos = await solplaceClient.current.getLogosInBounds(
					mapBounds
				)
				console.log(
					`Loaded ${logos.length} logos for bounds:`,
					mapBounds
				)
				console.log("Logos:", logos)
				setVisibleLogos(logos)

				// Update map display
				renderLogosOnMap(logos)

				// Update grid display
				updateGridDisplay(map)

				// Mostra layer se era nascosto
				if (map.getLayer("logos")) {
					map.setLayoutProperty("logos", "visibility", "visible")
				}
			} catch (error) {
				console.error("Failed to load logos:", error)
			}
		},
		[renderLogosOnMap, updateGridDisplay, MIN_ZOOM_FOR_LOGOS]
	)

	// Initialize map
	useEffect(() => {
		if (!mapContainer.current || mapRef.current) return

		const map = new maplibregl.Map({
			container: mapContainer.current,
			style: MAP_STYLE,
			center: [-117.267998, 32.991602], // San Diego coordinates
			zoom: 10,
			attributionControl: false // Remove attribution control completely
		})

		// Initialize Solplace client when wallet is connected
		if (wallet) {
			try {
				const programId = new PublicKey(SOLPLACE_PROGRAM_ID)

				solplaceClient.current = new SolplaceClient(
					connection,
					wallet,
					programId,
					{
						enableCaching: true,
						cacheExpiry: 5 * 60 * 1000, // 5 minutes
						enableSubscriptions: true
					}
				)
			} catch (error) {
				console.error("Failed to initialize Solplace client:", error)
			}
		}

		map.on("load", () => {
			setIsLoaded(true)

			// Add click handler
			map.on("click", (e) => {
				const { lat, lng } = e.lngLat

				// Snap click to the nearest grid cell
				const [gridLat, gridLng] = latLngToGridCell(lat, lng)
				const [snappedLat, snappedLng] = getGridCellCenter(
					gridLat,
					gridLng
				)

				console.log(
					`Click at ${lat}, ${lng} snapped to grid cell ${gridLat}, ${gridLng} (center: ${snappedLat}, ${snappedLng})`
				)

				onMapClick?.(snappedLat, snappedLng)
			})

			// Add hover handlers for fee estimation
			map.on("mousemove", (e) => {
				const { lat, lng } = e.lngLat

				// Snap hover to the nearest grid cell
				const [gridLat, gridLng] = latLngToGridCell(lat, lng)
				const [snappedLat, snappedLng] = getGridCellCenter(
					gridLat,
					gridLng
				)

				onMapHover?.(snappedLat, snappedLng)
			})

			map.on("mouseleave", () => {
				onMapHoverEnd?.()
			})

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
	}, [
		connection,
		wallet,
		onMapClick,
		onMapHover,
		onMapHoverEnd,
		updateVisibleLogos
	])

	return (
		<div className="relative w-full h-full">
			<div ref={mapContainer} className="w-full h-full" />

			{/* Loading overlay */}
			{!isLoaded && (
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
			{isLoaded && (
				<div className="absolute bottom-4 left-4 floating-panel backdrop-blur-md pointer-events-auto w-60 sm:w-64 fade-in">
					<div className="p-3 space-y-2 text-[11px] leading-relaxed">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-slate-200/90">
								Zoom
							</span>
							<span className="font-mono text-slate-300">
								{currentZoom.toFixed(1)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-semibold text-slate-200/90">
								Logos
							</span>
							{currentZoom < MIN_ZOOM_FOR_LOGOS ? (
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
