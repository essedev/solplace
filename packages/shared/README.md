# @solplace/shared

Shared TypeScript utilities, types, and client for the Solplace platform.

## Overview

This package contains shared code for interacting with the Solplace Solana program, including:

-   **TypeScript types** that mirror the Rust program structs
-   **Utility functions** for coordinate conversion and fee calculation
-   **Logo resolution system** for fetching token logos from multiple sources
-   **Client library** for interacting with the Solplace program
-   **Constants** synchronized with the Solana program

## Installation

```bash
npm install @solplace/shared
# or
pnpm add @solplace/shared
```

## Quick Start

### Basic Usage

```typescript
import {
	SolplaceClient,
	coordinatesToMicrodegrees,
	calculatePlacementFee,
	LogoResolver
} from "@solplace/shared"
import { Connection, PublicKey } from "@solana/web3.js"

// Create connection and client
const connection = new Connection("https://api.devnet.solana.com")
const client = new SolplaceClient({ connection })

// Convert coordinates
const [latMicro, lngMicro] = coordinatesToMicrodegrees(40.7128, -74.006) // NYC

// Calculate cluster ID
const clusterId = getClusterId(40.7128, -74.006)

// Load cluster data
const cluster = await client.loadCluster(clusterId)

// Calculate placement fee
const fee = await client.calculateFee(40.7128, -74.006)
console.log(`Placement fee: ${fee.amount} lamports`)
```

### Logo Resolution

```typescript
import { LogoResolver } from "@solplace/shared"

const resolver = new LogoResolver()

// Resolve logo for a token
const logo = await resolver.resolveLogo(
	"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
)
console.log(`Logo URL: ${logo.logoUri}`)
console.log(`Source: ${logo.source}`)

// Batch resolve multiple tokens
const results = await resolver.resolveLogos([
	"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
	"EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" // WIF
])
```

### Placing Logos (with wallet)

```typescript
import { SolplaceClient } from "@solplace/shared"
import { Connection, PublicKey, Keypair } from "@solana/web3.js"

const connection = new Connection("https://api.devnet.solana.com")
const wallet = {
	/* your wallet adapter */
}
const client = new SolplaceClient({ connection, wallet })

const userKeypair = Keypair.generate()
const tokenMint = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")

// Place a logo at Times Square
const signature = await client.placeLogo(
	40.758, // lat
	-73.9855, // lng
	tokenMint,
	userKeypair
)

console.log(`Logo placed! Transaction: ${signature}`)
```

## API Reference

### Types

#### CellData

```typescript
interface CellData {
	coordinates: [number, number] // [lat, lng] in microdegrees
	tokenMint: string // Token contract address
	logoUri: string // Resolved logo URL
	logoHash: Uint8Array // Content hash for integrity
	placedBy: string // User wallet address
	placedAt: number // Unix timestamp
	overwriteCount: number // Times overwritten
}
```

#### CellCluster

```typescript
interface CellCluster {
	clusterId: bigint // Unique identifier
	bounds: [number, number, number, number] // Geographic bounds
	cellCount: number // Active cells
	cells: CellData[] // Cell placements
	lastUpdated: number // Last update timestamp
	bump: number // PDA bump
}
```

### Utility Functions

#### Coordinate Conversion

```typescript
// Convert decimal degrees to microdegrees
coordinatesToMicrodegrees(lat: number, lng: number): [number, number]

// Convert microdegrees to decimal degrees
microdegreesToCoordinates(latMicro: number, lngMicro: number): Coordinates

// Get cluster ID from coordinates
getClusterId(lat: number, lng: number): bigint

// Calculate cluster bounds
getClusterBounds(clusterId: bigint): [number, number, number, number]
```

#### Fee Calculation

```typescript
// Calculate placement fee
calculatePlacementFee(cluster: CellCluster | null, lat: number, lng: number): PlacementFee

// Check if coordinates are valid
validateCoordinates(lat: number, lng: number): boolean
```

#### PDA Derivation

```typescript
// Get cluster PDA
getClusterPDA(clusterId: bigint, programId: PublicKey): PDAResult

// Get user cooldown PDA
getUserCooldownPDA(userPublicKey: PublicKey, programId: PublicKey): PDAResult
```

### SolplaceClient

#### Configuration

```typescript
interface SolplaceClientConfig {
	connection: Connection // Solana RPC connection
	programId?: PublicKey // Program ID (optional)
	wallet?: any // Wallet adapter (optional)
	logoResolver?: LogoResolver // Custom logo resolver (optional)
}
```

#### Methods

```typescript
class SolplaceClient {
	// Load visible clusters for map bounds
	loadVisibleClusters(bounds: MapBounds): Promise<CellCluster[]>

	// Load single cluster
	loadCluster(clusterId: bigint): Promise<ClusterLoadResult>

	// Calculate placement fee
	calculateFee(lat: number, lng: number): Promise<PlacementFee>

	// Get user cooldown status
	getUserCooldown(userPublicKey: PublicKey): Promise<UserCooldown | null>

	// Check if user can place (not on cooldown)
	canUserPlace(userPublicKey: PublicKey): Promise<boolean>

	// Place a logo (requires wallet)
	placeLogo(
		lat: number,
		lng: number,
		tokenMint: PublicKey,
		userKeypair: Keypair
	): Promise<string>

	// Subscribe to real-time updates
	subscribeToClusterUpdates(clusterIds: bigint[], callback: Function): void
	subscribeToLogoEvents(callback: Function): number
}
```

### LogoResolver

#### Configuration

```typescript
interface LogoSource {
	name: string
	priority: number
	resolve(mintAddress: string): Promise<string | null>
}
```

#### Methods

```typescript
class LogoResolver {
	// Add custom logo source
	addSource(source: LogoSource): void

	// Resolve single logo
	resolveLogo(mintAddress: string): Promise<ResolvedLogo>

	// Batch resolve multiple logos
	resolveLogos(
		mintAddresses: string[]
	): Promise<Map<string, ResolvedLogo | Error>>

	// Preload logos for performance
	preloadLogos(mintAddresses: string[]): Promise<void>

	// Cache management
	clearCache(): void
	getCacheStats(): { size: number; hitRate: number }
}
```

## Constants

All constants are synchronized with the Solana program:

```typescript
// Fees
export const BASE_PLACEMENT_FEE = 1_000_000 // 0.001 SOL
export const OVERWRITE_MULTIPLIER = 5

// Rate limiting
export const COOLDOWN_PERIOD = 30 // seconds

// Coordinate bounds (microdegrees)
export const MIN_LATITUDE = -90_000_000
export const MAX_LATITUDE = 90_000_000
export const MIN_LONGITUDE = -180_000_000
export const MAX_LONGITUDE = 180_000_000

// Cluster configuration
export const CLUSTER_RESOLUTION = 100_000 // ~10km
export const MAX_CELLS_PER_CLUSTER = 400
```

## Logo Sources

The default logo resolver attempts these sources in order:

1. **Metaplex Token Metadata** (priority 1)
2. **Pump.fun API** (priority 2)
3. **Jupiter Token List** (priority 3)
4. **DexScreener API** (priority 4)
5. **Fallback Identicon** (priority 10)

### Custom Logo Sources

```typescript
const resolver = new LogoResolver()

// Add custom source
resolver.addSource({
	name: "my-custom-source",
	priority: 0, // Highest priority
	resolve: async (mintAddress) => {
		const response = await fetch(`https://my-api.com/token/${mintAddress}`)
		const data = await response.json()
		return data.logoUrl
	}
})
```

## Error Handling

```typescript
import { coordinatesToMicrodegrees, LogoResolver } from "@solplace/shared"

try {
	// This will throw if coordinates are invalid
	const coords = coordinatesToMicrodegrees(91, 0) // Invalid latitude
} catch (error) {
	console.error("Invalid coordinates:", error.message)
}

try {
	const resolver = new LogoResolver()
	const logo = await resolver.resolveLogo("invalid-mint-address")
} catch (error) {
	console.error("Logo resolution failed:", error.message)
}
```

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Type Checking

```bash
pnpm type-check
```

## License

MIT
