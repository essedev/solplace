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
	 * Load multiple logos in bounds
	 */
	async loadLogosInBounds(bounds: MapBounds): Promise<LogoPlacement[]> {
		// Generate coordinate grid for the bounds
		const coordinates = this.generateCoordinateGrid(bounds)

		// Load all logos at once
		const logos = await this.coreClient.loadLogosAtCoordinates(coordinates)

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
	 * Generate coordinate grid for bounds
	 * Simple implementation for now
	 */
	private generateCoordinateGrid(bounds: MapBounds): Array<[number, number]> {
		const coordinates: Array<[number, number]> = []

		// For now, just sample some points in the bounds
		// This should be made more sophisticated based on zoom level
		const stepSize = 0.001 // ~100m

		for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += stepSize) {
			for (
				let lng = bounds.minLng;
				lng <= bounds.maxLng;
				lng += stepSize
			) {
				coordinates.push([lat, lng])

				// Limit to avoid too many requests
				if (coordinates.length >= 100) {
					return coordinates
				}
			}
		}

		return coordinates
	}
}
