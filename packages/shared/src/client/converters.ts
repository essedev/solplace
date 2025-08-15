import type { LogoPlacement, UserCooldown } from "../types"

/**
 * Convert Anchor account data to our TypeScript types
 */

/**
 * Convert raw Anchor LogoPlacement account to our LogoPlacement type
 */
export function convertAnchorLogo(anchorLogo: any): LogoPlacement {
	return {
		coordinates: anchorLogo.coordinates as [number, number],
		tokenMint: anchorLogo.tokenMint.toString(),
		logoUri: anchorLogo.logoUri,
		logoHash: new Uint8Array(anchorLogo.logoHash),
		placedBy: anchorLogo.placedBy.toString(),
		placedAt: anchorLogo.placedAt.toNumber(),
		overwriteCount: anchorLogo.overwriteCount,
		bump: anchorLogo.bump
	}
}

/**
 * Convert raw Anchor UserCooldown account to our UserCooldown type
 */
export function convertAnchorCooldown(anchorCooldown: any): UserCooldown {
	return {
		user: anchorCooldown.user.toString(),
		lastPlacement: anchorCooldown.lastPlacement.toNumber(),
		placementCount: anchorCooldown.placementCount,
		bump: anchorCooldown.bump
	}
}
