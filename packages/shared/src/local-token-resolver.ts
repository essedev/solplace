import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { TokenMetadata } from "./types"

/**
 * Local token database resolver
 * Reads metadata from local JSON files created by our token creation script
 */
export class LocalTokenResolver {
	private tokenCache = new Map<string, TokenMetadata>()
	private tokensDir: string

	constructor(tokensDir?: string) {
		// In browser environment, this won't work, but we can provide fallback
		this.tokensDir = tokensDir || ""
	}

	/**
	 * Load token metadata from local JSON files
	 */
	async resolveMetadata(mintAddress: string): Promise<TokenMetadata | null> {
		// Check cache first
		if (this.tokenCache.has(mintAddress)) {
			return this.tokenCache.get(mintAddress)!
		}

		// In browser, return null (this resolver only works in Node.js)
		if (typeof window !== "undefined") {
			return null
		}

		try {
			// Try to find the token in local files
			const tokenData = this.findTokenInLocalFiles(mintAddress)
			if (!tokenData) return null

			const metadata: TokenMetadata = {
				mintAddress,
				name: tokenData.name,
				symbol: tokenData.symbol,
				description: tokenData.description,
				image: tokenData.uri,
				source: "local-file",
				resolvedAt: Date.now()
			}

			this.tokenCache.set(mintAddress, metadata)
			return metadata
		} catch (error) {
			console.warn(
				`Failed to resolve local metadata for ${mintAddress}:`,
				error
			)
			return null
		}
	}

	/**
	 * Find token data in local JSON files
	 */
	private findTokenInLocalFiles(mintAddress: string): any | null {
		if (!this.tokensDir || !existsSync(this.tokensDir)) {
			return null
		}

		try {
			const fs = require("fs")
			const files = fs
				.readdirSync(this.tokensDir)
				.filter((file: string) => file.endsWith(".json"))

			for (const file of files) {
				const filePath = join(this.tokensDir, file)
				const tokenData = JSON.parse(readFileSync(filePath, "utf8"))

				if (tokenData.mint === mintAddress) {
					return tokenData
				}
			}
		} catch (error) {
			console.warn("Error reading local token files:", error)
		}

		return null
	}

	/**
	 * Add hardcoded token metadata for known tokens
	 */
	addKnownToken(metadata: TokenMetadata): void {
		this.tokenCache.set(metadata.mintAddress, metadata)
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.tokenCache.clear()
	}
}

// Export singleton with known tokens
export const localTokenResolver = new LocalTokenResolver()

// Add your known GAME token
localTokenResolver.addKnownToken({
	mintAddress: "zFwKtsfnBjSqSEBpqXJgbTcWKquqqphHGtgbWM4kLBY",
	name: "Game Token",
	symbol: "GAME",
	description: "Token ufficiale gaming",
	image: "https://m.media-amazon.com/images/I/91UU6JskvtL.jpg",
	source: "local-known",
	resolvedAt: Date.now()
})
