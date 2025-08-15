// Fee Configuration (matches Rust constants)
export const BASE_PLACEMENT_FEE = 1_000_000 // 0.001 SOL in lamports
export const OVERWRITE_MULTIPLIER = 5
export const TREASURY_PERCENTAGE = 100 // 100% to treasury

// Rate Limiting
export const COOLDOWN_PERIOD = 30 // seconds

// PDA Seeds (must match Rust program)
export const LOGO_PLACEMENT_SEED = "logo_placement"
export const COOLDOWN_SEED = "cooldown"
export const CLUSTER_SEED = "cluster" // Temporary for transitional support

// Coordinate Constraints (in microdegrees)
export const MIN_LATITUDE = -90_000_000 // -90° in microdegrees
export const MAX_LATITUDE = 90_000_000 // +90° in microdegrees
export const MIN_LONGITUDE = -180_000_000 // -180° in microdegrees
export const MAX_LONGITUDE = 180_000_000 // +180° in microdegrees

// Logo Constraints
export const MAX_LOGO_URI_LENGTH = 200 // Max characters for logo URI

// Cluster Configuration (temporary for transitional support)
export const CLUSTER_RESOLUTION = 100_000 // ~10km in microdegrees

// RPC Endpoints
export const RPC_ENDPOINTS = {
	devnet: "https://api.devnet.solana.com",
	mainnet: "https://api.mainnet-beta.solana.com"
}

// Program ID (from Anchor deployment)
export const SOLPLACE_PROGRAM_ID =
	"Fw64bA7dMN1nzc1X82vsLydU63yHuBSNGHyozsZAqQBP"

// Treasury wallet for fee collection (must match the program's TREASURY_ADDRESS)
export const TREASURY_WALLET = "3ojcMQjKYfME4qGmgE8Qb9odKcu4kSes1xhcVXD7DXCd"

// Common token mints for testing
export const WELL_KNOWN_TOKENS = {
	BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
	WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
	POPCAT: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
} as const
