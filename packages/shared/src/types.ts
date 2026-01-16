import { PublicKey } from "@solana/web3.js"

/**
 * Represents an individual logo placement on the map
 * Mirrors the Rust LogoPlacement struct - NEW ARCHITECTURE
 */
export interface LogoPlacement {
	/** Coordinates in microdegrees [lat, lng] */
	coordinates: [number, number]
	/** Token contract address */
	tokenMint: string
	/** Resolved logo URL (max 200 chars) */
	logoUri: string
	/** Content hash for integrity verification */
	logoHash: Uint8Array
	/** User wallet address that placed this token */
	placedBy: string
	/** Unix timestamp when placed */
	placedAt: number
	/** Number of times this logo has been overwritten */
	overwriteCount: number
	/** PDA bump seed */
	bump: number
	/** Optional token metadata (resolved client-side) */
	metadata?: TokenMetadata
}

/**
 * Represents user placement cooldown state
 * Mirrors the Rust UserCooldown struct
 */
export interface UserCooldown {
	/** User wallet address */
	user: string
	/** Unix timestamp of last placement */
	lastPlacement: number
	/** Total number of placements by this user */
	placementCount: number
	/** PDA bump seed */
	bump: number
}

/**
 * Geographic coordinates in standard lat/lng format
 */
export interface Coordinates {
	/** Latitude in degrees (-90 to +90) */
	lat: number
	/** Longitude in degrees (-180 to +180) */
	lng: number
}

/**
 * Geographic bounds for map areas
 */
export interface MapBounds {
	/** Minimum latitude */
	minLat: number
	/** Maximum latitude */
	maxLat: number
	/** Minimum longitude */
	minLng: number
	/** Maximum longitude */
	maxLng: number
	/** Current zoom level */
	zoom: number
}

/**
 * Placement fee calculation result
 */
export interface PlacementFee {
	/** Fee amount in lamports */
	amount: number
	/** Whether this is an overwrite (higher fee) */
	isOverwrite: boolean
	/** Base fee in lamports */
	baseFee: number
	/** Multiplier applied for overwrites */
	multiplier: number
}

/**
 * Result of logo resolution
 */
export interface ResolvedLogo {
	/** Token mint address */
	mintAddress: string
	/** Resolved logo URL */
	logoUri: string
	/** Source that provided the logo */
	source: string
	/** When this was resolved */
	resolvedAt: number
	/** Content hash for verification */
	hash: string
}

/**
 * Token metadata information
 */
export interface TokenMetadata {
	/** Token mint address */
	mintAddress: string
	/** Token name */
	name: string
	/** Token symbol */
	symbol: string
	/** Token description */
	description?: string
	/** Number of decimals */
	decimals?: number
	/** Image URI */
	image?: string
	/** Source that provided the metadata */
	source: string
	/** When this was resolved */
	resolvedAt: number
}

/**
 * Logo source configuration
 */
export interface LogoSource {
	/** Source name (e.g., "metaplex", "pump_fun") */
	name: string
	/** Priority level (lower = higher priority) */
	priority: number
	/** Function to resolve logo from mint address */
	resolve(mintAddress: string): Promise<string | null>
}

/**
 * Event emitted when a logo is placed
 */
export interface LogoPlacedEvent {
	/** Cell coordinates in microdegrees */
	coordinates: [number, number]
	/** Token mint address */
	tokenMint: string
	/** User who placed the logo */
	placedBy: string
	/** Unix timestamp */
	timestamp: number
	/** Whether this was an overwrite */
	wasOverwrite: boolean
	/** Fee paid in lamports */
	feePaid: number
}

/**
 * PDA derivation result
 */
export interface PDAResult {
	/** The derived public key */
	publicKey: PublicKey
	/** The bump seed used */
	bump: number
}

/**
 * Logo loading result for individual logos
 */
export interface LogoLoadResult {
	/** The loaded logo data */
	logo: LogoPlacement | null
	/** Whether the logo exists on-chain */
	exists: boolean
	/** Any error that occurred during loading */
	error?: string
}
