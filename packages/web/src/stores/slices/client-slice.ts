import type { AnchorWallet } from "@solana/wallet-adapter-react"
import type { Connection } from "@solana/web3.js"
import { PublicKey } from "@solana/web3.js"
import { SOLPLACE_PROGRAM_ID, SolplaceClient } from "@solplace/shared"
import type { StateCreator } from "zustand"
import type { ClientSlice, SolplaceStore } from "../types"

export const createClientSlice: StateCreator<
	SolplaceStore,
	[],
	[],
	ClientSlice
> = (set, get) => ({
	// State
	client: null,
	isClientInitialized: false,
	connectionError: null,

	// Actions
	initializeClient: async (connection: Connection, wallet: AnchorWallet) => {
		try {
			// Clear any previous errors
			set({ connectionError: null })

			// Don't reinitialize if client already exists for same wallet
			const currentState = get()
			if (
				currentState.client &&
				currentState.isClientInitialized &&
				wallet.publicKey &&
				currentState.client
					.getWalletPublicKey()
					?.equals(wallet.publicKey)
			) {
				console.log("Client already initialized for this wallet")
				return
			}

			// Reset client if wallet changed
			if (
				currentState.client &&
				wallet.publicKey &&
				!currentState.client
					.getWalletPublicKey()
					?.equals(wallet.publicKey)
			) {
				console.log("Wallet changed, resetting client")
				get().resetClient()
			}

			console.log("Initializing SolplaceClient...")

			const programId = new PublicKey(SOLPLACE_PROGRAM_ID)

			const client = new SolplaceClient(connection, wallet, programId, {
				enableCaching: true,
				cacheExpiry: 5 * 60 * 1000, // 5 minutes
				enableSubscriptions: true
			})

			// Basic validation - try to get user cooldown as a connectivity test
			if (wallet.publicKey) {
				try {
					await client.getUserCooldown(wallet.publicKey)
				} catch (error) {
					// Cooldown not found is OK - means user hasn't placed anything yet
					const errorMsg =
						error instanceof Error ? error.message : String(error)
					if (!errorMsg.includes("Account does not exist")) {
						throw error
					}
				}
			}

			set({
				client,
				isClientInitialized: true,
				connectionError: null
			})

			console.log("SolplaceClient initialized successfully")
		} catch (error) {
			console.error("Failed to initialize SolplaceClient:", error)

			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown connection error"

			set({
				client: null,
				isClientInitialized: false,
				connectionError: errorMessage
			})

			throw error
		}
	},

	resetClient: () => {
		const currentClient = get().client

		// For now, just clear the reference
		// In future, we can add cleanup methods to SolplaceClient if needed
		if (currentClient) {
			console.log("Cleaning up SolplaceClient")
		}

		set({
			client: null,
			isClientInitialized: false,
			connectionError: null
		})

		console.log("SolplaceClient reset")
	}
})
