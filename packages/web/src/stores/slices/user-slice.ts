import { PublicKey } from "@solana/web3.js"
import { LogoResolver, TREASURY_WALLET } from "@solplace/shared"
import type { StateCreator } from "zustand"
import type { SolplaceStore, UserSlice } from "../types"

export const createUserSlice: StateCreator<SolplaceStore, [], [], UserSlice> = (
	set,
	get
) => ({
	// State
	userCooldown: null,
	isPlacing: false,
	placementError: null,
	isLoadingCooldown: false,

	// Actions
	setUserCooldown: (cooldown) => {
		set({ userCooldown: cooldown })
	},

	setIsPlacing: (placing) => {
		set({ isPlacing: placing })
	},

	loadUserCooldown: async (publicKey: PublicKey) => {
		const { client } = get()
		if (!client) {
			console.warn("Client not initialized")
			return
		}

		set({ isLoadingCooldown: true })

		try {
			const cooldown = await client.getUserCooldown(publicKey)
			set({
				userCooldown: cooldown,
				isLoadingCooldown: false
			})
		} catch (error) {
			console.error("Failed to load user cooldown:", error)
			set({
				userCooldown: null,
				isLoadingCooldown: false
			})
		}
	},

	placeToken: async (tokenMint: string) => {
		const { client, selectedLocation, userCooldown } = get()

		if (!client) {
			throw new Error("Client not initialized")
		}

		if (!selectedLocation) {
			throw new Error("No location selected")
		}

		// Check cooldown
		if (userCooldown) {
			const COOLDOWN_SECONDS = 300 // 5 minutes
			const timeSinceLastPlacement =
				Math.floor(Date.now() / 1000) - userCooldown.lastPlacement
			const canPlace = timeSinceLastPlacement >= COOLDOWN_SECONDS

			if (!canPlace) {
				const remainingSeconds =
					COOLDOWN_SECONDS - timeSinceLastPlacement
				throw new Error(
					`You are still on cooldown. Please wait ${remainingSeconds} seconds before placing another token.`
				)
			}
		}

		set({
			isPlacing: true,
			placementError: null
		})

		try {
			// Resolve logo URI for the token
			const logoResolver = new LogoResolver()
			const resolvedLogo = await logoResolver.resolveLogo(tokenMint)

			// Use configured treasury address
			const treasuryAddress = new PublicKey(TREASURY_WALLET)

			// Place the logo on-chain
			const signature = await client.placeLogo(
				selectedLocation.lat,
				selectedLocation.lng,
				new PublicKey(tokenMint),
				resolvedLogo.logoUri,
				treasuryAddress
			)

			console.log("Logo placed successfully! Signature:", signature)

			// Reset placement state
			set({
				isPlacing: false,
				selectedLocation: null,
				placementFee: null,
				currentCellLogo: null,
				showPlacer: false
			})

			return signature
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error"
			console.error("Failed to place token:", error)

			set({
				isPlacing: false,
				placementError: errorMessage
			})

			throw error
		}
	}
})
