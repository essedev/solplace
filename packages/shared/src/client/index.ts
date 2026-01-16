import { Connection, PublicKey } from "@solana/web3.js"
import type {
	LogoPlacement,
	MapBounds,
	PlacementFee,
	TokenMetadata,
	UserCooldown
} from "../types"
import type { AnchorWallet, SolplaceClientConfig } from "./types"

import { CoreClient } from "./core-client"
import { LogoManager } from "./logo-manager"

/**
 * Complete Solplace client with all features
 * Updated for individual logo architecture
 */
export class SolplaceClient {
	private core: CoreClient
	private logos: LogoManager

	constructor(
		connection: Connection,
		wallet: AnchorWallet,
		programId: PublicKey,
		config: SolplaceClientConfig = {}
	) {
		this.core = new CoreClient(connection, wallet, programId)
		this.logos = new LogoManager(this.core, config)
	}

	// ===== CORE OPERATIONS =====

	/**
	 * Place a logo on the map
	 */
	async placeLogo(
		lat: number,
		lng: number,
		tokenMint: PublicKey,
		logoUri: string,
		treasuryAddress: PublicKey
	): Promise<string> {
		return this.core.placeLogo(
			lat,
			lng,
			tokenMint,
			logoUri,
			treasuryAddress
		)
	}

	/**
	 * Validate that a public key is a valid SPL token mint
	 */
	async validateTokenMint(tokenMint: PublicKey): Promise<boolean> {
		return this.core.validateTokenMint(tokenMint)
	}

	/**
	 * Calculate placement fee for coordinates
	 */
	async calculateFee(lat: number, lng: number): Promise<PlacementFee> {
		return this.core.calculateFee(lat, lng)
	}

	/**
	 * Check if user can place (not on cooldown)
	 */
	async canUserPlace(userPublicKey?: PublicKey): Promise<boolean> {
		return this.core.canUserPlace(userPublicKey)
	}

	/**
	 * Get user cooldown info
	 */
	async getUserCooldown(
		userPublicKey?: PublicKey
	): Promise<UserCooldown | null> {
		return this.core.getUserCooldown(userPublicKey)
	}

	/**
	 * Get remaining cooldown time in seconds
	 */
	async getRemainingCooldown(userPublicKey?: PublicKey): Promise<number> {
		return this.core.getRemainingCooldown(userPublicKey)
	}

	// ===== LOGO MANAGEMENT =====

	/**
	 * Load logo at specific coordinates
	 */
	async getLogoAtCoordinates(
		lat: number,
		lng: number
	): Promise<LogoPlacement | null> {
		const result = await this.logos.loadLogo(lat, lng)
		return result.logo
	}

	/**
	 * Load multiple logos at coordinates
	 */
	async getLogosAtCoordinates(
		coordinates: Array<[number, number]>
	): Promise<Array<LogoPlacement | null>> {
		return this.core.loadLogosAtCoordinates(coordinates)
	}

	/**
	 * Load all logos visible in map bounds
	 */
	async getLogosInBounds(bounds: MapBounds): Promise<LogoPlacement[]> {
		return this.logos.loadLogosInBounds(bounds)
	}

	/**
	 * Invalidate logo cache at coordinates
	 */
	invalidateLogoAt(lat: number, lng: number): void {
		this.logos.invalidateLogo(lat, lng)
	}

	/**
	 * Clear all cached data
	 */
	clearCache(): void {
		this.logos.clearCache()
	}

	// ===== UTILITY METHODS =====

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number } {
		return this.logos.getCacheStats()
	}

	/**
	 * Get connection for external use
	 */
	getConnection(): Connection {
		return this.core.getConnection()
	}

	/**
	 * Get program ID
	 */
	getProgramId(): PublicKey {
		return this.core.getProgramId()
	}

	/**
	 * Get wallet public key
	 */
	getWalletPublicKey(): PublicKey {
		return this.core.getWalletPublicKey()
	}

	/**
	 * Get global token statistics (leaderboard data)
	 * This scans popular areas for a more complete picture
	 */
	async getTokenLeaderboard(): Promise<
		Array<{ tokenMint: string; spotCount: number; logoUri?: string }>
	> {
		return this.logos.getGlobalTokenLeaderboard()
	}

	/**
	 * Get tokens visible in the current map area
	 */
	async getVisibleTokens(bounds: MapBounds): Promise<
		Array<{
			tokenMint: string
			logoUri?: string
			coordinates: [number, number]
			name?: string
			symbol?: string
			metadata?: TokenMetadata
		}>
	> {
		return this.logos.getVisibleTokens(bounds)
	}

	/**
	 * Get local token statistics (from cache only)
	 * Fast but limited to areas the user has visited
	 */
	async getLocalTokenLeaderboard(): Promise<
		Array<{ tokenMint: string; spotCount: number; logoUri?: string }>
	> {
		return this.logos.getTokenLeaderboard()
	}

	/**
	 * Health check - test connection to program
	 */
	async healthCheck(): Promise<{
		connection: boolean
		program: boolean
		wallet: boolean
	}> {
		try {
			// Test connection
			const connectionTest = await this.core.canUserPlace()
			return {
				connection: true,
				program: true,
				wallet: typeof connectionTest === "boolean"
			}
		} catch (error) {
			return {
				connection: false,
				program: false,
				wallet: false
			}
		}
	}

	// ===== CLEANUP =====

	/**
	 * Cleanup resources when done
	 */
	dispose(): void {
		this.clearCache()
	}
}
