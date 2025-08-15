import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import type { LogoPlacement, MapBounds } from "@solplace/shared"
import { SOLPLACE_PROGRAM_ID, SolplaceClient } from "@solplace/shared"
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
}

const SolplaceMap: React.FC<SolplaceMapProps> = ({ onMapClick }) => {
	const mapContainer = useRef<HTMLDivElement>(null)
	const mapRef = useRef<maplibregl.Map | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)
	const [visibleLogos, setVisibleLogos] = useState<LogoPlacement[]>([])

	const { connection } = useConnection()
	const wallet = useAnchorWallet()

	// Initialize Solplace client
	const solplaceClient = useRef<SolplaceClient | null>(null)

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

			// Add layer
			map.addLayer({
				id: "logos",
				type: "symbol",
				source: "logos",
				layout: {
					"icon-image": "token-logo", // We'll need to load images dynamically
					"icon-size": 0.5,
					"icon-allow-overlap": true,
					"icon-ignore-placement": true
				}
			})

			// Add click handler for logo details
			map.on("click", "logos", (e) => {
				if (e.features && e.features[0]) {
					const feature = e.features[0]
					const properties = feature.properties

					new maplibregl.Popup()
						.setLngLat(e.lngLat)
						.setHTML(
							`
            <div class="p-2">
              <strong>Token:</strong> ${properties?.tokenMint}<br>
              <strong>Placed by:</strong> ${properties?.placedBy?.slice(
					0,
					8
				)}...<br>
              <strong>Overwrites:</strong> ${properties?.overwriteCount}
            </div>
          `
						)
						.addTo(map)
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
		[isLoaded]
	)

	// Update visible logos based on map bounds
	const updateVisibleLogos = useCallback(
		async (map: maplibregl.Map) => {
			if (!solplaceClient.current) return

			const bounds = map.getBounds()
			const mapBounds: MapBounds = {
				minLat: bounds.getSouth(),
				maxLat: bounds.getNorth(),
				minLng: bounds.getWest(),
				maxLng: bounds.getEast(),
				zoom: map.getZoom()
			}

			try {
				const logos = await solplaceClient.current.getLogosInBounds(
					mapBounds
				)
				setVisibleLogos(logos)

				// Update map display
				renderLogosOnMap(logos)
			} catch (error) {
				console.error("Failed to load logos:", error)
			}
		},
		[renderLogosOnMap]
	)

	// Initialize map
	useEffect(() => {
		if (!mapContainer.current || mapRef.current) return

		const map = new maplibregl.Map({
			container: mapContainer.current,
			style: MAP_STYLE,
			center: [-74.006, 40.7128], // NYC coordinates
			zoom: 10
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
				onMapClick?.(lat, lng)
			})

			// Add move handler for loading logos
			map.on("moveend", () => {
				updateVisibleLogos(map)
			})

			// Initial logo load
			updateVisibleLogos(map)
		})

		mapRef.current = map

		return () => {
			map.remove()
			mapRef.current = null
		}
	}, [connection, wallet, onMapClick, updateVisibleLogos])

	return (
		<div className="relative w-full h-full">
			<div ref={mapContainer} className="w-full h-full" />

			{/* Loading overlay */}
			{!isLoaded && (
				<div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
					<div className="text-white text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
						<p>Loading map...</p>
					</div>
				</div>
			)}

			{/* Map stats */}
			{isLoaded && (
				<div className="absolute bottom-4 left-4 bg-black/50 text-white p-2 rounded text-sm pointer-events-auto">
					<div>Logos loaded: {visibleLogos.length}</div>
					{visibleLogos.length > 0 && (
						<div>
							Last placed:{" "}
							{new Date(
								Math.max(
									...visibleLogos.map(
										(logo) => logo.placedAt * 1000
									)
								)
							).toLocaleTimeString()}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default SolplaceMap
