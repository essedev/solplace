import type { TokenMetadata } from "./types"

/**
 * Multi-source token metadata resolver for Solana tokens
 * Attempts to resolve token metadata from various sources in priority order
 */
export class TokenMetadataResolver {
	private cache = new Map<string, TokenMetadata>()
	private cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

	/**
	 * Resolve token metadata from multiple sources
	 */
	async resolveMetadata(mintAddress: string): Promise<TokenMetadata | null> {
		// Check cache first
		const cached = this.cache.get(mintAddress)
		if (cached && Date.now() - cached.resolvedAt < this.cacheExpiry) {
			return cached
		}

		// Try Metaplex on-chain metadata first
		let metadata = await this.resolveFromMetaplex(mintAddress)
		if (metadata) {
			this.cache.set(mintAddress, metadata)
			return metadata
		}

		// Try Jupiter Token List (most comprehensive for popular tokens)
		metadata = await this.resolveFromJupiter(mintAddress)
		if (metadata) {
			this.cache.set(mintAddress, metadata)
			return metadata
		}

		// Try Solana Token List
		metadata = await this.resolveFromSolanaTokenList(mintAddress)
		if (metadata) {
			this.cache.set(mintAddress, metadata)
			return metadata
		}

		// Try DexScreener API
		metadata = await this.resolveFromDexScreener(mintAddress)
		if (metadata) {
			this.cache.set(mintAddress, metadata)
			return metadata
		}

		// Fallback: create minimal metadata with shortened address
		const fallbackMetadata: TokenMetadata = {
			mintAddress,
			name: `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
			symbol: "TOKEN",
			source: "fallback",
			resolvedAt: Date.now()
		}

		this.cache.set(mintAddress, fallbackMetadata)
		return fallbackMetadata
	}

	/**
	 * Resolve metadata from Metaplex on-chain metadata
	 */
	private async resolveFromMetaplex(
		mintAddress: string
	): Promise<TokenMetadata | null> {
		try {
			// Use a simple RPC call to get metadata - works in browser
			const connection = await this.getConnection()
			if (!connection) return null

			// Derive metadata PDA
			const metadataPDA = await this.getMetadataPDA(mintAddress)

			// Fetch metadata account
			const accountInfo = await connection.getAccountInfo(metadataPDA)
			if (!accountInfo) return null

			// Parse metadata (simplified parsing)
			const metadata = this.parseMetadataAccount(accountInfo.data)
			if (!metadata) return null

			return {
				mintAddress,
				name: metadata.name,
				symbol: metadata.symbol,
				image: metadata.uri, // URI might point to image or JSON
				source: "metaplex-onchain",
				resolvedAt: Date.now()
			}
		} catch (error) {
			console.warn(
				`Metaplex metadata resolution failed for ${mintAddress}:`,
				error
			)
			return null
		}
	}

	/**
	 * Get connection (browser-compatible)
	 */
	private async getConnection() {
		try {
			const { Connection, clusterApiUrl } = await import(
				"@solana/web3.js"
			)
			return new Connection(clusterApiUrl("devnet"), "confirmed")
		} catch (error) {
			console.warn("Could not create Solana connection:", error)
			return null
		}
	}

	/**
	 * Derive metadata PDA for a mint
	 */
	private async getMetadataPDA(mintAddress: string) {
		const { PublicKey } = await import("@solana/web3.js")

		const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
			"metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
		)
		const mint = new PublicKey(mintAddress)

		const [metadata] = PublicKey.findProgramAddressSync(
			[
				Buffer.from("metadata"),
				TOKEN_METADATA_PROGRAM_ID.toBuffer(),
				mint.toBuffer()
			],
			TOKEN_METADATA_PROGRAM_ID
		)

		return metadata
	}

	/**
	 * Parse metadata account data (simplified version)
	 */
	private parseMetadataAccount(
		data: Buffer
	): { name: string; symbol: string; uri: string } | null {
		try {
			// This is a simplified parser - in production you'd use the full Metaplex deserializer
			// Skip the first 9 bytes (discriminator + update authority)
			let offset = 1 + 32 // discriminator + update authority pubkey

			// Read mint (32 bytes)
			offset += 32

			// Read name length (4 bytes) then name
			const nameLength = data.readUInt32LE(offset)
			offset += 4
			const name = data
				.slice(offset, offset + nameLength)
				.toString("utf8")
				.replace(/\0/g, "")
			offset += nameLength

			// Read symbol length (4 bytes) then symbol
			const symbolLength = data.readUInt32LE(offset)
			offset += 4
			const symbol = data
				.slice(offset, offset + symbolLength)
				.toString("utf8")
				.replace(/\0/g, "")
			offset += symbolLength

			// Read URI length (4 bytes) then URI
			const uriLength = data.readUInt32LE(offset)
			offset += 4
			const uri = data
				.slice(offset, offset + uriLength)
				.toString("utf8")
				.replace(/\0/g, "")

			return { name, symbol, uri }
		} catch (error) {
			console.warn("Failed to parse metadata account:", error)
			return null
		}
	}

	/**
	 * Resolve metadata from Jupiter Token List
	 */
	private async resolveFromJupiter(
		mintAddress: string
	): Promise<TokenMetadata | null> {
		try {
			const response = await fetch("https://cache.jup.ag/tokens")
			if (!response.ok) return null

			const tokens = (await response.json()) as Array<{
				address: string
				name: string
				symbol: string
				decimals: number
				logoURI?: string
			}>

			const token = tokens.find((t) => t.address === mintAddress)
			if (!token) return null

			return {
				mintAddress,
				name: token.name,
				symbol: token.symbol,
				decimals: token.decimals,
				...(token.logoURI && { image: token.logoURI }),
				source: "jupiter",
				resolvedAt: Date.now()
			}
		} catch (error) {
			console.warn(
				`Jupiter metadata resolution failed for ${mintAddress}:`,
				error
			)
			return null
		}
	}

	/**
	 * Resolve metadata from Solana Token List
	 */
	private async resolveFromSolanaTokenList(
		mintAddress: string
	): Promise<TokenMetadata | null> {
		try {
			const response = await fetch(
				"https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json"
			)
			if (!response.ok) return null

			const data = (await response.json()) as {
				tokens: Array<{
					address: string
					name: string
					symbol: string
					decimals: number
					logoURI?: string
				}>
			}

			const token = data.tokens.find((t) => t.address === mintAddress)
			if (!token) return null

			return {
				mintAddress,
				name: token.name,
				symbol: token.symbol,
				decimals: token.decimals,
				...(token.logoURI && { image: token.logoURI }),
				source: "solana-token-list",
				resolvedAt: Date.now()
			}
		} catch (error) {
			console.warn(
				`Solana Token List metadata resolution failed for ${mintAddress}:`,
				error
			)
			return null
		}
	}

	/**
	 * Resolve metadata from DexScreener API
	 */
	private async resolveFromDexScreener(
		mintAddress: string
	): Promise<TokenMetadata | null> {
		try {
			const response = await fetch(
				`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
			)
			if (!response.ok) return null

			const data = (await response.json()) as {
				pairs?: Array<{
					baseToken: {
						address: string
						name: string
						symbol: string
					}
				}>
			}

			const pair = data.pairs?.[0]
			if (!pair || pair.baseToken.address !== mintAddress) return null

			return {
				mintAddress,
				name: pair.baseToken.name,
				symbol: pair.baseToken.symbol,
				source: "dexscreener",
				resolvedAt: Date.now()
			}
		} catch (error) {
			console.warn(
				`DexScreener metadata resolution failed for ${mintAddress}:`,
				error
			)
			return null
		}
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear()
	}

	/**
	 * Get cache size
	 */
	getCacheSize(): number {
		return this.cache.size
	}
}

// Export singleton instance
export const tokenMetadataResolver = new TokenMetadataResolver()
