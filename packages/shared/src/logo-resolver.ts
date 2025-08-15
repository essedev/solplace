import type { LogoSource, ResolvedLogo } from "./types"

/**
 * Multi-source logo resolver for Solana tokens
 * Attempts to resolve logos from various sources in priority order
 */
export class LogoResolver {
	private sources: LogoSource[] = []
	private cache = new Map<string, ResolvedLogo>()
	private cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

	constructor() {
		this.initializeDefaultSources()
	}

	/**
	 * Initialize default logo sources in priority order
	 */
	private initializeDefaultSources(): void {
		// Priority 1: Metaplex Token Metadata
		this.addSource({
			name: "metaplex",
			priority: 1,
			resolve: async (mintAddress: string) => {
				try {
					// This would require @metaplex-foundation/js in production
					// For now, return null to fall through to other sources
					return null
				} catch (error) {
					console.warn(
						`Metaplex logo resolution failed for ${mintAddress}:`,
						error
					)
					return null
				}
			}
		})

		// Priority 2: Pump.fun API
		this.addSource({
			name: "pump_fun",
			priority: 2,
			resolve: async (mintAddress: string) => {
				try {
					const response = await fetch(
						`https://pump.fun/api/tokens/${mintAddress}`,
						{
							method: "GET",
							headers: {
								Accept: "application/json"
							}
						}
					)

					if (!response.ok) return null

					const data = (await response.json()) as {
						image_uri?: string
						image?: string
					}
					return data.image_uri || data.image || null
				} catch (error) {
					console.warn(
						`Pump.fun logo resolution failed for ${mintAddress}:`,
						error
					)
					return null
				}
			}
		})

		// Priority 3: Jupiter Token List
		this.addSource({
			name: "jupiter",
			priority: 3,
			resolve: async (mintAddress: string) => {
				try {
					const response = await fetch("https://cache.jup.ag/tokens")

					if (!response.ok) return null

					const tokens = (await response.json()) as Array<{
						address: string
						logoURI?: string
					}>
					const token = tokens.find((t) => t.address === mintAddress)
					return token?.logoURI || null
				} catch (error) {
					console.warn(
						`Jupiter logo resolution failed for ${mintAddress}:`,
						error
					)
					return null
				}
			}
		})

		// Priority 4: DexScreener API
		this.addSource({
			name: "dexscreener",
			priority: 4,
			resolve: async (mintAddress: string) => {
				try {
					const response = await fetch(
						`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
					)

					if (!response.ok) return null

					const data = (await response.json()) as {
						pairs?: Array<{
							info?: {
								imageUrl?: string
							}
						}>
					}
					return data.pairs?.[0]?.info?.imageUrl || null
				} catch (error) {
					console.warn(
						`DexScreener logo resolution failed for ${mintAddress}:`,
						error
					)
					return null
				}
			}
		})

		// Priority 10: Fallback identicon generator
		this.addSource({
			name: "fallback",
			priority: 10,
			resolve: async (mintAddress: string) => {
				return `https://api.dicebear.com/7.x/identicon/svg?seed=${mintAddress}&size=64&backgroundColor=1e293b&foregroundColor=ffffff`
			}
		})
	}

	/**
	 * Add a custom logo source
	 */
	addSource(source: LogoSource): void {
		this.sources.push(source)
		this.sources.sort((a, b) => a.priority - b.priority)
	}

	/**
	 * Remove a logo source by name
	 */
	removeSource(name: string): void {
		this.sources = this.sources.filter((source) => source.name !== name)
	}

	/**
	 * Resolve logo for a token mint address
	 */
	async resolveLogo(mintAddress: string): Promise<ResolvedLogo> {
		// Validate mint address format
		if (!this.isValidMintAddress(mintAddress)) {
			throw new Error(`Invalid mint address format: ${mintAddress}`)
		}

		// Check cache first
		const cached = this.getFromCache(mintAddress)
		if (cached && this.isCacheValid(cached)) {
			return cached
		}

		// Try sources in priority order
		for (const source of this.sources) {
			try {
				const logoUri = await source.resolve(mintAddress)
				if (logoUri && (await this.validateImageUrl(logoUri))) {
					const resolved: ResolvedLogo = {
						mintAddress,
						logoUri,
						source: source.name,
						resolvedAt: Date.now(),
						hash: await this.calculateContentHash(logoUri)
					}

					this.saveToCache(resolved)
					return resolved
				}
			} catch (error) {
				console.warn(
					`Logo source ${source.name} failed for ${mintAddress}:`,
					error
				)
			}
		}

		throw new Error(`Could not resolve logo for ${mintAddress}`)
	}

	/**
	 * Batch resolve logos for multiple mint addresses
	 */
	async resolveLogos(
		mintAddresses: string[]
	): Promise<Map<string, ResolvedLogo | Error>> {
		const results = new Map<string, ResolvedLogo | Error>()

		const promises = mintAddresses.map(async (mintAddress) => {
			try {
				const resolved = await this.resolveLogo(mintAddress)
				results.set(mintAddress, resolved)
			} catch (error) {
				results.set(mintAddress, error as Error)
			}
		})

		await Promise.all(promises)
		return results
	}

	/**
	 * Preload logos for better performance
	 */
	async preloadLogos(mintAddresses: string[]): Promise<void> {
		await this.resolveLogos(mintAddresses)
	}

	/**
	 * Clear the cache
	 */
	clearCache(): void {
		this.cache.clear()
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; hitRate: number } {
		return {
			size: this.cache.size,
			hitRate: 0 // TODO: Implement hit rate tracking
		}
	}

	/**
	 * Validate if a string is a valid Solana mint address
	 */
	private isValidMintAddress(address: string): boolean {
		// Basic validation: should be 32-44 characters, base58 encoded
		return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
	}

	/**
	 * Get cached logo if available
	 */
	private getFromCache(mintAddress: string): ResolvedLogo | null {
		return this.cache.get(mintAddress) || null
	}

	/**
	 * Check if cached entry is still valid
	 */
	private isCacheValid(cached: ResolvedLogo): boolean {
		return Date.now() - cached.resolvedAt < this.cacheExpiry
	}

	/**
	 * Save resolved logo to cache
	 */
	private saveToCache(resolved: ResolvedLogo): void {
		this.cache.set(resolved.mintAddress, resolved)
	}

	/**
	 * Validate that an image URL is accessible and valid
	 */
	private async validateImageUrl(url: string): Promise<boolean> {
		try {
			const response = await fetch(url, { method: "HEAD" })
			const contentType = response.headers.get("content-type")
			return response.ok && (contentType?.startsWith("image/") ?? false)
		} catch {
			return false
		}
	}

	/**
	 * Calculate content hash for image integrity
	 */
	private async calculateContentHash(url: string): Promise<string> {
		try {
			const response = await fetch(url)
			const arrayBuffer = await response.arrayBuffer()
			const hashBuffer = await crypto.subtle.digest(
				"SHA-256",
				arrayBuffer
			)
			const hashArray = Array.from(new Uint8Array(hashBuffer))
			return hashArray
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")
		} catch (error) {
			console.warn("Failed to calculate content hash:", error)
			return url // Fallback to URL as hash
		}
	}
}

/**
 * Create a default logo resolver instance
 */
export function createLogoResolver(): LogoResolver {
	return new LogoResolver()
}

/**
 * Helper function to resolve a single logo
 */
export async function resolveLogo(mintAddress: string): Promise<ResolvedLogo> {
	const resolver = createLogoResolver()
	return resolver.resolveLogo(mintAddress)
}

/**
 * Helper function to get fallback logo URL
 */
export function getFallbackLogoUrl(mintAddress: string): string {
	return `https://api.dicebear.com/7.x/identicon/svg?seed=${mintAddress}&size=64&backgroundColor=1e293b&foregroundColor=ffffff`
}
