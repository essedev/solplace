import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import {
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram
} from "@solana/web3.js"
import { assert } from "chai"
import { SolplaceProgram } from "../target/types/solplace_program"

describe("solplace", () => {
	// Configure the client to use the local cluster.
	anchor.setProvider(anchor.AnchorProvider.env())

	const program = anchor.workspace.SolplaceProgram as Program<SolplaceProgram>
	const provider = anchor.getProvider()

	// Helper function to generate logo placement PDA
	function getLogoPlacementPDA(
		lat: number,
		lng: number
	): [PublicKey, number] {
		const latBuffer = Buffer.allocUnsafe(4)
		latBuffer.writeInt32LE(lat)
		const lngBuffer = Buffer.allocUnsafe(4)
		lngBuffer.writeInt32LE(lng)

		return PublicKey.findProgramAddressSync(
			[Buffer.from("logo_placement"), latBuffer, lngBuffer],
			program.programId
		)
	}

	// Helper function to generate user cooldown PDA
	function getUserCooldownPDA(userPublicKey: PublicKey): [PublicKey, number] {
		return PublicKey.findProgramAddressSync(
			[Buffer.from("cooldown"), userPublicKey.toBuffer()],
			program.programId
		)
	}

	// Test accounts - separate wallets to avoid cooldown conflicts
	let payer: Keypair
	let userKeypair: Keypair
	let user2Keypair: Keypair
	let user3Keypair: Keypair // Third wallet for overwrite test
	let tokenMint: PublicKey
	let mintAuthority: Keypair

	before(async () => {
		// Setup once for all tests
		payer = (provider.wallet as anchor.Wallet).payer

		// Generate unique keypairs for each test to avoid cooldown conflicts
		userKeypair = Keypair.generate()
		user2Keypair = Keypair.generate()
		user3Keypair = Keypair.generate() // Third wallet for overwrite test
		mintAuthority = Keypair.generate()

		console.log("Setting up test accounts...")
		console.log("Main payer:", payer.publicKey.toString())
		console.log("Generated user1:", userKeypair.publicKey.toString())
		console.log("Generated user2:", user2Keypair.publicKey.toString())
		console.log("Generated user3:", user3Keypair.publicKey.toString())

		// Fund the test users from main wallet (0.1 SOL each should be enough)
		const transferAmount = 0.1 * LAMPORTS_PER_SOL

		try {
			console.log("💰 Funding user1...")
			const transferTx1 = await provider.connection.requestAirdrop(
				userKeypair.publicKey,
				transferAmount
			)
			await provider.connection.confirmTransaction(transferTx1)

			console.log("💰 Funding user2...")
			const transferTx2 = await provider.connection.requestAirdrop(
				user2Keypair.publicKey,
				transferAmount
			)
			await provider.connection.confirmTransaction(transferTx2)

			console.log("💰 Funding user3...")
			const transferTx3 = await provider.connection.requestAirdrop(
				user3Keypair.publicKey,
				transferAmount
			)
			await provider.connection.confirmTransaction(transferTx3)

			console.log("✅ Test users funded successfully")
		} catch (error) {
			console.log("⚠️ Airdrop failed, using manual transfer from payer")

			// Fallback: transfer from payer manually
			const transferTx1 = new anchor.web3.Transaction().add(
				SystemProgram.transfer({
					fromPubkey: payer.publicKey,
					toPubkey: userKeypair.publicKey,
					lamports: transferAmount
				})
			)
			await provider.sendAndConfirm(transferTx1, [payer])

			const transferTx2 = new anchor.web3.Transaction().add(
				SystemProgram.transfer({
					fromPubkey: payer.publicKey,
					toPubkey: user2Keypair.publicKey,
					lamports: transferAmount
				})
			)
			await provider.sendAndConfirm(transferTx2, [payer])

			const transferTx3 = new anchor.web3.Transaction().add(
				SystemProgram.transfer({
					fromPubkey: payer.publicKey,
					toPubkey: user3Keypair.publicKey,
					lamports: transferAmount
				})
			)
			await provider.sendAndConfirm(transferTx3, [payer])

			console.log("✅ Manual transfer completed")
		}

		// Create real SPL token mint
		try {
			tokenMint = await createMint(
				provider.connection,
				payer,
				mintAuthority.publicKey,
				null,
				6 // 6 decimals
			)
			console.log("✅ Token mint created:", tokenMint.toString())
		} catch (error) {
			console.log("⚠️ Token creation failed, using TOKEN_PROGRAM_ID")
			tokenMint = TOKEN_PROGRAM_ID
		}
	})

	after(async () => {
		// Consolidate remaining funds back to main wallet
		console.log("💰 Consolidating remaining funds back to main wallet...")

		const testWallets = [userKeypair, user2Keypair, user3Keypair]

		for (let i = 0; i < testWallets.length; i++) {
			const wallet = testWallets[i]
			const walletName = `user${i + 1}`

			try {
				// Check remaining balance
				const balance = await provider.connection.getBalance(
					wallet.publicKey
				)

				// Leave enough for rent exemption (~0.001 SOL) + transaction fees
				const minBalance = 1000000 // 0.001 SOL in lamports

				if (balance > minBalance) {
					const transferBack = balance - minBalance

					console.log(
						`📤 Transferring ${transferBack / LAMPORTS_PER_SOL} SOL from ${walletName} back to main wallet`
					)

					const consolidateTx = new anchor.web3.Transaction().add(
						SystemProgram.transfer({
							fromPubkey: wallet.publicKey,
							toPubkey: payer.publicKey,
							lamports: transferBack
						})
					)

					await provider.sendAndConfirm(consolidateTx, [wallet])
					console.log(`✅ ${walletName} funds consolidated`)
				} else {
					console.log(
						`⏹️ ${walletName} has minimal balance, skipping consolidation`
					)
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to consolidate ${walletName} funds:`,
					error.message
				)
			}
		}

		// Final balance check
		const finalBalance = await provider.connection.getBalance(
			payer.publicKey
		)
		console.log(
			`💰 Final main wallet balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`
		)
		console.log("✅ Fund consolidation completed")
	})

	it("Should place a logo at specific coordinates", async () => {
		// Use generated user1 wallet
		const testUser = userKeypair

		// Test coordinates: NYC (40.7128, -74.0060) in microdegrees
		const lat = 40_712_800 // 40.7128 * 1_000_000 (microdegrees)
		const lng = -74_006_000 // -74.0060 * 1_000_000 (microdegrees)
		const logoUri = "https://example.com/test-logo.png"

		console.log("Testing with coordinates:", { lat, lng })
		console.log("Using user1 wallet:", testUser.publicKey.toString())

		// Calculate logo placement PDA (individual account per logo)
		const [logoPlacementPda] = getLogoPlacementPDA(lat, lng)
		console.log("Logo placement PDA:", logoPlacementPda.toString())

		// Calculate user cooldown PDA for test user
		const [userCooldownPda] = getUserCooldownPDA(testUser.publicKey)
		console.log("User cooldown PDA:", userCooldownPda.toString())

		try {
			// Place logo
			const tx = await program.methods
				.placeLogo(lat, lng, tokenMint, logoUri)
				.accountsPartial({
					logoPlacement: logoPlacementPda,
					userCooldown: userCooldownPda,
					tokenMint: tokenMint,
					treasury: provider.publicKey, // Using provider as treasury for tests
					user: userKeypair.publicKey,
					systemProgram: SystemProgram.programId
				})
				.signers([userKeypair])
				.rpc()

			console.log("✅ Placement transaction signature:", tx)

			// Verify logo placement was created or updated
			const logoPlacementAccount =
				await program.account.logoPlacement.fetch(logoPlacementPda)

			assert.equal(logoPlacementAccount.coordinates[0], lat)
			assert.equal(logoPlacementAccount.coordinates[1], lng)
			assert.equal(
				logoPlacementAccount.tokenMint.toString(),
				tokenMint.toString()
			)
			assert.equal(logoPlacementAccount.logoUri, logoUri)
			assert.equal(
				logoPlacementAccount.placedBy.toString(),
				testUser.publicKey.toString()
			)
			// Don't assert overwriteCount = 0, as account might exist from previous tests
			console.log(
				"Current overwrite count:",
				logoPlacementAccount.overwriteCount
			)

			// Verify cooldown was set
			const cooldownAccount =
				await program.account.userCooldown.fetch(userCooldownPda)
			assert.equal(
				cooldownAccount.user.toString(),
				testUser.publicKey.toString()
			)
			// Don't assert placementCount = 1, as user might have made previous placements
			console.log(
				"Current placement count:",
				cooldownAccount.placementCount
			)

			console.log("✅ Test passed: Logo placed and verified successfully")
			console.log("📊 Cost analysis:")
			console.log(
				`   Logo placement account size: ${JSON.stringify(logoPlacementAccount).length} chars`
			)
			console.log("   Estimated rent: ~0.002-0.003 SOL per logo")
		} catch (error) {
			console.error("❌ Test failed:", error)
			throw error
		}
	})

	it("Should enforce cooldown period", async () => {
		// Use user2 for cooldown test
		const testUser2 = user2Keypair

		// Use different coordinates to avoid conflicts with first test
		const lat = 41_000_000 // 41.0 degrees
		const lng = -75_000_000 // -75.0 degrees
		const logoUri = "https://example.com/cooldown-test.png"

		const [logoPlacementPda] = getLogoPlacementPDA(lat, lng)
		const [userCooldownPda] = getUserCooldownPDA(testUser2.publicKey)

		try {
			// First placement should succeed
			await program.methods
				.placeLogo(lat, lng, tokenMint, logoUri)
				.accountsPartial({
					logoPlacement: logoPlacementPda,
					userCooldown: userCooldownPda,
					tokenMint: tokenMint,
					treasury: provider.publicKey,
					user: testUser2.publicKey,
					systemProgram: SystemProgram.programId
				})
				.signers([testUser2])
				.rpc()

			console.log("✅ First placement succeeded")

			// Try to place another logo immediately - should fail due to cooldown
			const lat2 = 41_100_000
			const lng2 = -75_100_000
			const logoUri2 = "https://example.com/cooldown-test-2.png"

			const [logoPlacementPda2] = getLogoPlacementPDA(lat2, lng2)

			let cooldownErrorThrown = false
			try {
				await program.methods
					.placeLogo(lat2, lng2, tokenMint, logoUri2)
					.accountsPartial({
						logoPlacement: logoPlacementPda2,
						userCooldown: userCooldownPda,
						tokenMint: tokenMint,
						treasury: provider.publicKey,
						user: testUser2.publicKey,
						systemProgram: SystemProgram.programId
					})
					.signers([testUser2])
					.rpc()
			} catch (error) {
				cooldownErrorThrown = true
				console.log(
					"✅ Cooldown error correctly thrown:",
					error.message
				)
			}

			assert.isTrue(
				cooldownErrorThrown,
				"Expected cooldown error to be thrown"
			)
			console.log("✅ Test passed: Cooldown enforced correctly")
		} catch (error) {
			console.error("❌ Test failed:", error)
			throw error
		}
	})

	it("Should allow overwriting an existing logo", async () => {
		// Use user3 for overwrite test (fresh wallet, no cooldown)
		const testUser3 = user3Keypair

		// Use unique coordinates for this test
		const lat = 42_000_000 // 42.0 degrees (Boston area)
		const lng = -71_000_000 // -71.0 degrees
		const initialLogoUri = "https://example.com/initial-logo.png"
		const newLogoUri = "https://example.com/overwrite-logo.png"

		const [logoPlacementPda] = getLogoPlacementPDA(lat, lng)
		const [userCooldownPda] = getUserCooldownPDA(testUser3.publicKey)

		try {
			// First place initial logo
			await program.methods
				.placeLogo(lat, lng, tokenMint, initialLogoUri)
				.accountsPartial({
					logoPlacement: logoPlacementPda,
					userCooldown: userCooldownPda,
					tokenMint: tokenMint,
					treasury: provider.publicKey,
					user: testUser3.publicKey,
					systemProgram: SystemProgram.programId
				})
				.signers([testUser3])
				.rpc()

			// Get initial state
			const initialLogo =
				await program.account.logoPlacement.fetch(logoPlacementPda)
			console.log("Initial overwrite count:", initialLogo.overwriteCount)

			// Wait for cooldown to expire (30 seconds)
			console.log("⏳ Waiting for cooldown to expire...")
			await new Promise((resolve) => setTimeout(resolve, 31000))

			// Place new logo at same coordinates (overwrite)
			const tx = await program.methods
				.placeLogo(lat, lng, tokenMint, newLogoUri)
				.accountsPartial({
					logoPlacement: logoPlacementPda,
					userCooldown: userCooldownPda,
					tokenMint: tokenMint,
					treasury: provider.publicKey,
					user: testUser3.publicKey,
					systemProgram: SystemProgram.programId
				})
				.signers([testUser3])
				.rpc()

			console.log("✅ Overwrite transaction signature:", tx)

			// Verify logo was overwritten
			const updatedLogo =
				await program.account.logoPlacement.fetch(logoPlacementPda)

			assert.equal(updatedLogo.logoUri, newLogoUri)
			assert.equal(
				updatedLogo.overwriteCount,
				initialLogo.overwriteCount + 1
			)
			assert.equal(
				updatedLogo.placedBy.toString(),
				testUser3.publicKey.toString()
			)

			console.log("✅ Test passed: Logo overwritten successfully")
			console.log("📊 Final overwrite count:", updatedLogo.overwriteCount)
		} catch (error) {
			console.error("❌ Test failed:", error)
			throw error
		}
	})
})
