/**
 * Client-specific types and interfaces
 */
import type {
	PublicKey,
	Transaction,
	VersionedTransaction
} from "@solana/web3.js"
import type { LogoPlacement } from "../types"

/**
 * AnchorWallet interface for wallet adapter compatibility
 */
export interface AnchorWallet {
	publicKey: PublicKey
	signTransaction<T extends Transaction | VersionedTransaction>(
		tx: T
	): Promise<T>
	signAllTransactions<T extends Transaction | VersionedTransaction>(
		txs: T[]
	): Promise<T[]>
}

/**
 * Client configuration options
 */
export interface SolplaceClientConfig {
	/** Enable logo caching */
	enableCaching?: boolean
	/** Cache expiry time in milliseconds */
	cacheExpiry?: number
	/** Enable real-time subscriptions */
	enableSubscriptions?: boolean
	/** Maximum number of cached logos */
	maxCachedLogos?: number
}

/**
 * Result of logo loading operation
 */
export interface LogoLoadResult {
	/** The loaded logo (null if doesn't exist) */
	logo: LogoPlacement | null
	/** Whether logo was loaded from cache */
	fromCache: boolean
	/** Load timestamp */
	loadedAt: number
}

/**
 * Subscription callback for coordinate updates
 */
export type CoordinateUpdateCallback = (
	coordinates: [number, number],
	logo: LogoPlacement | null
) => void

/**
 * Subscription callback for logo placement events
 */
export type LogoEventCallback = (event: {
	coordinates: [number, number]
	tokenMint: string
	placedBy: string
	timestamp: number
	wasOverwrite: boolean
}) => void

/**
 * Active subscription tracking
 */
export interface ActiveSubscription {
	id: number
	coordinates: [number, number]
	callback: CoordinateUpdateCallback
	startedAt: number
}
