import { getVisibleGridCells, GRID_CELL_SIZE } from "../grid-utils"
import type { LogoPlacement, MapBounds } from "../types"
import { CoreClient } from "./core-client"
import type { LogoLoadResult, SolplaceClientConfig } from "./types"

/**
 * Manages logo loading, caching, and batch operations
 * Transitional implementation for individual logo architecture
 */
export class LogoManager {
	private cache = new Map<
		string,
		{ logo: LogoPlacement | null; cachedAt: number }
	>()
	private config: Required<SolplaceClientConfig>

	constructor(
		private coreClient: CoreClient,
		config: SolplaceClientConfig = {}
	) {
		this.config = {
			enableCaching: config.enableCaching ?? true,
			cacheExpiry: config.cacheExpiry ?? 5 * 60 * 1000, // 5 minutes
			enableSubscriptions: config.enableSubscriptions ?? true,
			maxCachedLogos: config.maxCachedLogos ?? 1000
		}
	}

	/**
	 * Load logo at coordinates with caching support
	 */
	async loadLogo(lat: number, lng: number): Promise<LogoLoadResult> {
		const logoKey = `${lat},${lng}`

		// Check cache first
		if (this.config.enableCaching) {
			const cached = this.cache.get(logoKey)
			if (cached && this.isCacheValid(cached.cachedAt)) {
				return {
					logo: cached.logo,
					fromCache: true,
					loadedAt: cached.cachedAt
				}
			}
		}

		// Load from blockchain
		const logo = await this.coreClient.loadLogoAtCoordinates(lat, lng)
		const now = Date.now()

		// Cache the result
		if (this.config.enableCaching) {
			this.cache.set(logoKey, { logo, cachedAt: now })
			this.enforceMaxCacheSize()
		}

		return {
			logo,
			fromCache: false,
			loadedAt: now
		}
	}

	/**
	 * Load multiple logos in bounds using the grid system
	 */
	async loadLogosInBounds(bounds: MapBounds): Promise<LogoPlacement[]> {
		// Get all grid cells visible in the bounds
		const gridCells = getVisibleGridCells(bounds)

		console.log(
			`Loading ${gridCells.length} grid cells for bounds:`,
			bounds
		)

		// Convert grid coordinates to the center coordinates for the core client
		const coordinates: Array<[number, number]> = gridCells.map(
			([gridLat, gridLng]) => {
				// Use grid cell center, which is where logos are actually placed
				const centerLat = (gridLat + GRID_CELL_SIZE / 2) / 1_000_000
				const centerLng = (gridLng + GRID_CELL_SIZE / 2) / 1_000_000
				return [centerLat, centerLng]
			}
		)

		// Load all logos at once
		const logos = await this.coreClient.loadLogosAtCoordinates(coordinates)

		// Cache the results if caching is enabled
		if (this.config.enableCaching) {
			const now = Date.now()
			coordinates.forEach((coord, index) => {
				const logoKey = `${coord[0]},${coord[1]}`
				this.cache.set(logoKey, {
					logo: logos[index],
					cachedAt: now
				})
			})
			this.enforceMaxCacheSize()
		}

		// Filter out null results and return only existing logos
		return logos.filter((logo): logo is LogoPlacement => logo !== null)
	}

	/**
	 * Invalidate cached logo
	 */
	invalidateLogo(lat: number, lng: number): void {
		const logoKey = `${lat},${lng}`
		this.cache.delete(logoKey)
	}

	/**
	 * Clear all cache
	 */
	clearCache(): void {
		this.cache.clear()
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: this.config.maxCachedLogos
		}
	}

	/**
	 * Check if cached entry is still valid
	 */
	private isCacheValid(cachedAt: number): boolean {
		return Date.now() - cachedAt < this.config.cacheExpiry
	}

	/**
	 * Enforce maximum cache size using LRU
	 */
	private enforceMaxCacheSize(): void {
		if (this.cache.size <= this.config.maxCachedLogos) return

		// Remove oldest entries until we're under the limit
		const entries = Array.from(this.cache.entries())
		entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt)

		const toRemove = this.cache.size - this.config.maxCachedLogos
		for (let i = 0; i < toRemove; i++) {
			this.cache.delete(entries[i][0])
		}
	}

	/**
	 * Get tokens visible in a specific area (simplified leaderboard)
	 */
	async getVisibleTokens(
		bounds: MapBounds
	): Promise<
		Array<{
			tokenMint: string
			logoUri?: string
			coordinates: [number, number]
		}>
	> {
		// Load logos in the current bounds
		const logos = await this.loadLogosInBounds(bounds)

		// Convert to simplified format
		return logos.map((logo) => ({
			tokenMint: logo.tokenMint,
			logoUri: logo.logoUri,
			coordinates: logo.coordinates
		}))
	}

	/**
	 * Get token leaderboard from cached data
	 * NOTE: This only shows tokens that have been loaded in the current session
	 */
	async getTokenLeaderboard(): Promise<
		Array<{ tokenMint: string; spotCount: number; logoUri?: string }>
	> {
		const tokenCounts = new Map<
			string,
			{ count: number; logoUri?: string }
		>()

		// Analizza tutti i loghi nella cache
		for (const [, cachedData] of this.cache) {
			if (cachedData.logo) {
				const existing = tokenCounts.get(cachedData.logo.tokenMint)
				if (existing) {
					existing.count++
				} else {
					tokenCounts.set(cachedData.logo.tokenMint, {
						count: 1,
						logoUri: cachedData.logo.logoUri
					})
				}
			}
		}

		// Converti in array e ordina per count
		const leaderboard = Array.from(tokenCounts.entries()).map(
			([tokenMint, data]) => ({
				tokenMint,
				spotCount: data.count,
				...(data.logoUri && { logoUri: data.logoUri })
			})
		)

		// Ordina per numero di spot (decrescente)
		return leaderboard.sort((a, b) => b.spotCount - a.spotCount)
	}

	/**
	 * Get global token leaderboard by scanning popular areas
	 * This performs actual blockchain queries to get a more complete picture
	 */
	async getGlobalTokenLeaderboard(): Promise<
		Array<{ tokenMint: string; spotCount: number; logoUri?: string }>
	> {
		const tokenCounts = new Map<
			string,
			{ count: number; logoUri?: string }
		>()

		// Define popular areas to scan (major cities, crypto hubs, etc.)
		const popularAreas = [
			// New York City
			{
				minLat: 40.7,
				maxLat: 40.8,
				minLng: -74.1,
				maxLng: -73.9,
				zoom: 16
			},
			// San Francisco
			{
				minLat: 37.7,
				maxLat: 37.8,
				minLng: -122.5,
				maxLng: -122.3,
				zoom: 16
			},
			// London
			{ minLat: 51.4, maxLat: 51.6, minLng: -0.2, maxLng: 0.1, zoom: 16 },
			// Tokyo
			{
				minLat: 35.6,
				maxLat: 35.7,
				minLng: 139.6,
				maxLng: 139.8,
				zoom: 16
			}
		]

		// Scan each popular area
		for (const area of popularAreas) {
			try {
				const logos = await this.loadLogosInBounds(area)

				for (const logo of logos) {
					const existing = tokenCounts.get(logo.tokenMint)
					if (existing) {
						existing.count++
					} else {
						tokenCounts.set(logo.tokenMint, {
							count: 1,
							logoUri: logo.logoUri
						})
					}
				}
			} catch (error) {
				console.warn(`Failed to scan area:`, area, error)
			}
		}

		// Merge with cached data to get complete picture
		for (const [, cachedData] of this.cache) {
			if (cachedData.logo) {
				const existing = tokenCounts.get(cachedData.logo.tokenMint)
				if (existing) {
					existing.count++
				} else {
					tokenCounts.set(cachedData.logo.tokenMint, {
						count: 1,
						logoUri: cachedData.logo.logoUri
					})
				}
			}
		}

		// Converti in array e ordina per count
		const leaderboard = Array.from(tokenCounts.entries()).map(
			([tokenMint, data]) => ({
				tokenMint,
				spotCount: data.count,
				...(data.logoUri && { logoUri: data.logoUri })
			})
		)

		// Ordina per numero di spot (decrescente)
		return leaderboard.sort((a, b) => b.spotCount - a.spotCount)
	}
}
