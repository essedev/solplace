import { PublicKey } from "@solana/web3.js"
import {
	BASE_PLACEMENT_FEE,
	CLUSTER_RESOLUTION,
	CLUSTER_SEED,
	COOLDOWN_SEED,
	LOGO_PLACEMENT_SEED,
	MAX_LATITUDE,
	MAX_LONGITUDE,
	MIN_LATITUDE,
	MIN_LONGITUDE,
	OVERWRITE_MULTIPLIER
} from "./constants"
import type {
	Coordinates,
	LogoPlacement,
	PDAResult,
	PlacementFee
} from "./types"

/**
 * Convert decimal degrees to microdegrees
 */
export function coordinatesToMicrodegrees(
	lat: number,
	lng: number
): [number, number] {
	const latMicro = Math.round(lat * 1_000_000)
	const lngMicro = Math.round(lng * 1_000_000)

	// Validate bounds
	if (latMicro < MIN_LATITUDE || latMicro > MAX_LATITUDE) {
		throw new Error(`Latitude ${lat} is out of bounds (-90 to +90 degrees)`)
	}

	if (lngMicro < MIN_LONGITUDE || lngMicro > MAX_LONGITUDE) {
		throw new Error(
			`Longitude ${lng} is out of bounds (-180 to +180 degrees)`
		)
	}

	return [latMicro, lngMicro]
}

/**
 * Convert microdegrees to decimal degrees
 */
export function microdegreesToCoordinates(
	latMicro: number,
	lngMicro: number
): Coordinates {
	return {
		lat: latMicro / 1_000_000,
		lng: lngMicro / 1_000_000
	}
}

/**
 * Calculate placement fee based on whether a logo already exists at coordinates
 */
export function calculatePlacementFee(
	existingLogo: LogoPlacement | null
): PlacementFee {
	const isOverwrite = !!existingLogo
	const multiplier = isOverwrite ? OVERWRITE_MULTIPLIER : 1
	const amount = BASE_PLACEMENT_FEE * multiplier

	return {
		amount,
		isOverwrite,
		baseFee: BASE_PLACEMENT_FEE,
		multiplier
	}
}

/**
 * Derive logo placement PDA for specific coordinates
 */
export function getLogoPlacementPDA(
	lat: number,
	lng: number,
	programId: PublicKey
): PDAResult {
	const [latMicro, lngMicro] = coordinatesToMicrodegrees(lat, lng)

	const latBuffer = Buffer.alloc(4)
	const lngBuffer = Buffer.alloc(4)
	latBuffer.writeInt32LE(latMicro, 0)
	lngBuffer.writeInt32LE(lngMicro, 0)

	const [publicKey, bump] = PublicKey.findProgramAddressSync(
		[Buffer.from(LOGO_PLACEMENT_SEED), latBuffer, lngBuffer],
		programId
	)

	return { publicKey, bump }
}

/**
 * Derive user cooldown PDA
 */
export function getUserCooldownPDA(
	userPublicKey: PublicKey,
	programId: PublicKey
): PDAResult {
	const [publicKey, bump] = PublicKey.findProgramAddressSync(
		[Buffer.from(COOLDOWN_SEED), userPublicKey.toBuffer()],
		programId
	)

	return { publicKey, bump }
}

/**
 * Check if coordinates are occupied by looking up the logo placement
 * This would typically be used with a client to check on-chain data
 */
export function coordinatesToPDAAddress(
	lat: number,
	lng: number,
	programId: PublicKey
): PublicKey {
	return getLogoPlacementPDA(lat, lng, programId).publicKey
}

/**
 * Generate coordinate pairs within bounds for bulk loading
 * Useful for efficiently loading multiple logos in a viewport
 */
export function generateCoordinateGrid(
	bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
	stepSizeDegrees: number = 0.001 // ~100m resolution
): Array<[number, number]> {
	const coordinates: Array<[number, number]> = []

	for (
		let lat = bounds.minLat;
		lat <= bounds.maxLat;
		lat += stepSizeDegrees
	) {
		for (
			let lng = bounds.minLng;
			lng <= bounds.maxLng;
			lng += stepSizeDegrees
		) {
			if (validateCoordinates(lat, lng)) {
				coordinates.push([lat, lng])
			}
		}
	}

	return coordinates
}

/**
 * Validate if coordinates are within allowed bounds
 */
export function validateCoordinates(lat: number, lng: number): boolean {
	try {
		coordinatesToMicrodegrees(lat, lng)
		return true
	} catch {
		return false
	}
}

/**
 * Check if a user is currently on cooldown
 */
export function isUserOnCooldown(
	lastPlacement: number,
	currentTime?: number
): boolean {
	const now = currentTime ?? Math.floor(Date.now() / 1000)
	const timeSinceLast = now - lastPlacement
	return timeSinceLast < 30 // COOLDOWN_PERIOD
}

/**
 * Calculate remaining cooldown time in seconds
 */
export function getRemainingCooldown(
	lastPlacement: number,
	currentTime?: number
): number {
	const now = currentTime ?? Math.floor(Date.now() / 1000)
	const timeSinceLast = now - lastPlacement
	return Math.max(0, 30 - timeSinceLast) // COOLDOWN_PERIOD - timeSinceLast
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
	lat: number,
	lng: number,
	precision: number = 6
): string {
	const latStr = lat.toFixed(precision)
	const lngStr = lng.toFixed(precision)
	const latDir = lat >= 0 ? "N" : "S"
	const lngDir = lng >= 0 ? "E" : "W"

	return `${Math.abs(parseFloat(latStr))}°${latDir}, ${Math.abs(
		parseFloat(lngStr)
	)}°${lngDir}`
}

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 6371 // Earth's radius in kilometers
	const dLat = ((lat2 - lat1) * Math.PI) / 180
	const dLng = ((lng2 - lng1) * Math.PI) / 180

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2)

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return R * c
}

// ===== TEMPORARY CLUSTER-BASED FUNCTIONS FOR TRANSITIONAL SUPPORT =====

/**
 * Calculate cluster ID from coordinates (temporary for transitional support)
 */
export function getClusterId(lat: number, lng: number): bigint {
	const [latMicro, lngMicro] = coordinatesToMicrodegrees(lat, lng)

	const clusterLat = Math.floor(latMicro / CLUSTER_RESOLUTION)
	const clusterLng = Math.floor(lngMicro / CLUSTER_RESOLUTION)

	// Combine into 64-bit cluster ID (lat in upper 32 bits, lng in lower 32 bits)
	return (BigInt(clusterLat) << 32n) | BigInt(clusterLng >>> 0)
}

/**
 * Derive cluster PDA (temporary for transitional support)
 */
export function getClusterPDA(
	clusterId: bigint,
	programId: PublicKey
): PDAResult {
	const clusterIdBuffer = Buffer.alloc(8)
	clusterIdBuffer.writeBigUInt64LE(clusterId, 0)

	const [publicKey, bump] = PublicKey.findProgramAddressSync(
		[Buffer.from(CLUSTER_SEED), clusterIdBuffer],
		programId
	)

	return { publicKey, bump }
}
