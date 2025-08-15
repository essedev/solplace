import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor"
import {
	Connection,
	PublicKey,
	Transaction,
	VersionedTransaction
} from "@solana/web3.js"
import { SolplaceProgram } from "../idl/solplace_program"
import type { LogoPlacement, PlacementFee, UserCooldown } from "../types"
import {
	calculatePlacementFee,
	getClusterId,
	getClusterPDA,
	getUserCooldownPDA
} from "../utils"
import { convertAnchorCooldown } from "./converters"

// Import IDL JSON for program initialization
import idlJson from "../idl/solplace_program.json"

// Local AnchorWallet interface
interface AnchorWallet {
	publicKey: PublicKey
	signTransaction<T extends Transaction | VersionedTransaction>(
		tx: T
	): Promise<T>
	signAllTransactions<T extends Transaction | VersionedTransaction>(
		txs: T[]
	): Promise<T[]>
}

/**
 * Core client for essential Solplace operations
 * Transitional implementation using cluster architecture but with logo-focused interface
 */
export class CoreClient {
	private program: Program<SolplaceProgram> | null = null

	constructor(
		private connection: Connection,
		private wallet: AnchorWallet,
		private programId: PublicKey
	) {}

	/**
	 * Initialize the Anchor program instance
	 */
	private async getProgram(): Promise<Program<SolplaceProgram>> {
		if (this.program) {
			return this.program
		}

		const provider = new AnchorProvider(
			this.connection,
			this.wallet,
			AnchorProvider.defaultOptions()
		)

		this.program = new Program<SolplaceProgram>(
			idlJson as Idl,
			provider
		) as Program<SolplaceProgram>

		return this.program
	}

	/**
	 * Load logo placement at specific coordinates
	 * Implementation using cluster architecture (transitional)
	 */
	async loadLogoAtCoordinates(
		lat: number,
		lng: number
	): Promise<LogoPlacement | null> {
		try {
			const program = await this.getProgram()
			const clusterId = getClusterId(lat, lng)
			const clusterPDA = getClusterPDA(clusterId, this.programId)

			// Try to fetch the cluster
			const clusterAccount = await program.account.cellCluster.fetch(
				clusterPDA.publicKey
			)

			// Convert coordinates to microdegrees for comparison
			const latMicro = Math.round(lat * 1_000_000)
			const lngMicro = Math.round(lng * 1_000_000)

			// Find the specific cell at these coordinates
			const cell = clusterAccount.cells.find(
				(cell: any) =>
					cell.coordinates[0] === latMicro &&
					cell.coordinates[1] === lngMicro
			)

			if (!cell) return null

			// Convert to LogoPlacement format
			return {
				coordinates: [latMicro, lngMicro] as [number, number],
				tokenMint: cell.tokenMint.toString(),
				logoUri: cell.logoUri,
				logoHash: new Uint8Array(cell.logoHash),
				placedBy: cell.placedBy.toString(),
				placedAt: cell.placedAt.toNumber(),
				overwriteCount: cell.overwriteCount,
				bump: 0 // Not applicable for cluster architecture
			}
		} catch (error) {
			// Cluster doesn't exist or coordinates not found
			return null
		}
	}

	/**
	 * Load multiple logos at specified coordinates
	 * Implementation using cluster architecture (transitional)
	 */
	async loadLogosAtCoordinates(
		coordinateList: Array<[number, number]>
	): Promise<Array<LogoPlacement | null>> {
		// Process each coordinate and load logos
		const logoPromises = coordinateList.map(([lat, lng]) =>
			this.loadLogoAtCoordinates(lat, lng)
		)

		return Promise.all(logoPromises)
	}

	/**
	 * Calculate placement fee for coordinates
	 */
	async calculateFee(lat: number, lng: number): Promise<PlacementFee> {
		const existingLogo = await this.loadLogoAtCoordinates(lat, lng)
		return calculatePlacementFee(existingLogo)
	}

	/**
	 * Get user cooldown state
	 */
	async getUserCooldown(
		userPublicKey?: PublicKey
	): Promise<UserCooldown | null> {
		try {
			const program = await this.getProgram()
			const userKey = userPublicKey || this.wallet.publicKey
			const userCooldownPDA = getUserCooldownPDA(userKey, this.programId)

			const cooldownAccount = await program.account.userCooldown.fetch(
				userCooldownPDA.publicKey
			)
			return convertAnchorCooldown(cooldownAccount)
		} catch (error) {
			// Account doesn't exist = no cooldown
			return null
		}
	}

	/**
	 * Check if user can place logo (no cooldown)
	 */
	async canUserPlace(userPublicKey?: PublicKey): Promise<boolean> {
		const cooldown = await this.getUserCooldown(userPublicKey)
		if (!cooldown) return true

		const now = Math.floor(Date.now() / 1000)
		const timeSinceLastPlacement = now - cooldown.lastPlacement
		const COOLDOWN_SECONDS = 30

		return timeSinceLastPlacement >= COOLDOWN_SECONDS
	}

	/**
	 * Get remaining cooldown time in seconds
	 */
	async getRemainingCooldown(userPublicKey?: PublicKey): Promise<number> {
		const cooldown = await this.getUserCooldown(userPublicKey)

		if (!cooldown) {
			return 0
		}

		const now = Math.floor(Date.now() / 1000)
		const timeSinceLastPlacement = now - cooldown.lastPlacement
		const COOLDOWN_SECONDS = 30

		return Math.max(0, COOLDOWN_SECONDS - timeSinceLastPlacement)
	}

	/**
	 * Place a logo at specific coordinates
	 * Implementation using cluster architecture (transitional)
	 */
	async placeLogo(
		lat: number,
		lng: number,
		tokenMint: PublicKey,
		logoUri: string,
		treasuryAddress: PublicKey
	): Promise<string> {
		try {
			const program = await this.getProgram()

			// Convert coordinates to microdegrees
			const latMicro = Math.round(lat * 1_000_000)
			const lngMicro = Math.round(lng * 1_000_000)

			// Calculate PDAs
			const clusterId = getClusterId(lat, lng)
			const clusterPDA = getClusterPDA(clusterId, this.programId)
			const userCooldownPDA = getUserCooldownPDA(
				this.wallet.publicKey,
				this.programId
			)

			// Execute transaction using cluster architecture
			const txSignature = await program.methods
				.placeLogo(latMicro, lngMicro, tokenMint, logoUri)
				.accounts({
					cellCluster: clusterPDA.publicKey,
					userCooldown: userCooldownPDA.publicKey,
					tokenMint: tokenMint,
					treasury: treasuryAddress,
					user: this.wallet.publicKey
					// systemProgram and rent are automatically included by Anchor
				})
				.rpc()

			return txSignature
		} catch (error) {
			console.error("Error placing logo:", error)
			throw error
		}
	}

	/**
	 * Get connection for external use
	 */
	getConnection(): Connection {
		return this.connection
	}

	/**
	 * Get program ID
	 */
	getProgramId(): PublicKey {
		return this.programId
	}

	/**
	 * Get wallet public key
	 */
	getWalletPublicKey(): PublicKey {
		return this.wallet.publicKey
	}
}
