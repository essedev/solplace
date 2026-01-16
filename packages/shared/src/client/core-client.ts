import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor"
import { getMint } from "@solana/spl-token"
import {
	Connection,
	PublicKey,
	Transaction,
	VersionedTransaction
} from "@solana/web3.js"
import { SolplaceProgram } from "../idl/solplace_program"
import { tokenMetadataResolver } from "../token-metadata-resolver"
import type { LogoPlacement, PlacementFee, UserCooldown } from "../types"
import {
	calculatePlacementFee,
	getLogoPlacementPDA,
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
	 * Updated implementation using individual logo placement PDAs
	 */
	async loadLogoAtCoordinates(
		lat: number,
		lng: number
	): Promise<LogoPlacement | null> {
		try {
			const program = await this.getProgram()
			const logoPlacementPDA = getLogoPlacementPDA(
				lat,
				lng,
				this.programId
			)

			// Try to fetch the logo placement account
			const logoAccount = await program.account.logoPlacement.fetch(
				logoPlacementPDA.publicKey
			)

			// Convert to LogoPlacement format
			const logoPlacement: LogoPlacement = {
				coordinates: logoAccount.coordinates as [number, number],
				tokenMint: logoAccount.tokenMint.toString(),
				logoUri: logoAccount.logoUri,
				logoHash: new Uint8Array(logoAccount.logoHash),
				placedBy: logoAccount.placedBy.toString(),
				placedAt: logoAccount.placedAt.toNumber(),
				overwriteCount: logoAccount.overwriteCount,
				bump: logoAccount.bump
			}

			// Try to resolve token metadata
			try {
				const metadata = await tokenMetadataResolver.resolveMetadata(
					logoPlacement.tokenMint
				)
				if (metadata) {
					logoPlacement.metadata = metadata
				}
			} catch (error) {
				console.warn(
					`Failed to resolve metadata for token ${logoPlacement.tokenMint}:`,
					error
				)
			}

			return logoPlacement
		} catch (error) {
			// Account doesn't exist or coordinates not found
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
	 * Validate that a public key is a valid SPL token mint
	 */
	async validateTokenMint(tokenMint: PublicKey): Promise<boolean> {
		try {
			await getMint(this.connection, tokenMint)
			return true
		} catch (error) {
			console.warn("Invalid token mint:", error)
			return false
		}
	}

	/**
	 * Place a logo at specific coordinates
	 * Updated implementation using individual logo placement PDAs
	 */
	async placeLogo(
		lat: number,
		lng: number,
		tokenMint: PublicKey,
		logoUri: string,
		treasuryAddress: PublicKey
	): Promise<string> {
		try {
			// Validate that tokenMint is a valid SPL token mint
			const isValidMint = await this.validateTokenMint(tokenMint)
			if (!isValidMint) {
				throw new Error(
					"The provided address is not a valid SPL token mint. Please ensure you're using a valid token mint address."
				)
			}

			const program = await this.getProgram()

			// Convert coordinates to microdegrees
			const latMicro = Math.round(lat * 1_000_000)
			const lngMicro = Math.round(lng * 1_000_000)

			// Calculate PDAs using the new architecture
			const logoPlacementPDA = getLogoPlacementPDA(
				lat,
				lng,
				this.programId
			)
			const userCooldownPDA = getUserCooldownPDA(
				this.wallet.publicKey,
				this.programId
			)

			// Execute transaction using new architecture
			const txSignature = await program.methods
				.placeLogo(latMicro, lngMicro, tokenMint, logoUri)
				.accounts({
					logoPlacement: logoPlacementPDA.publicKey,
					userCooldown: userCooldownPDA.publicKey,
					tokenMint: tokenMint,
					treasury: treasuryAddress,
					user: this.wallet.publicKey
					// systemProgram is automatically included by Anchor
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
