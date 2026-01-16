import {
	createMint,
	getOrCreateAssociatedTokenAccount,
	mintTo
} from "@solana/spl-token"
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js"
import { program } from "commander"
import * as fs from "fs"
import * as path from "path"

// Metaplex UMI imports
import {
	createV1,
	mplTokenMetadata,
	TokenStandard
} from "@metaplex-foundation/mpl-token-metadata"
import {
	createSignerFromKeypair,
	generateSigner,
	keypairIdentity,
	percentAmount,
	publicKey
} from "@metaplex-foundation/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"

interface TokenConfig {
	name: string
	symbol: string
	decimals: number
	initialSupply: number
	uri?: string
	description?: string
	payerSecretKey?: string
}

interface TokenInfo {
	mint: string
	mintAuthority: string
	mintAuthoritySecretKey: number[]
	payerSecretKey: number[]
	tokenAccount: string
	name: string
	symbol: string
	decimals: number
	initialSupply: number
	uri?: string
	description?: string
	network: string
	createdAt: string
	metadataAccount?: string
}

async function requestManualFunding(
	connection: Connection,
	targetKeypair: Keypair
): Promise<void> {
	console.log("\n🆘 Manual funding required!")
	console.log("📋 Please fund this address with at least 0.1 SOL:")
	console.log("   ", targetKeypair.publicKey.toString())
	console.log("\n💡 You can:")
	console.log(
		"   1. Use Solana CLI: solana transfer <amount> " +
			targetKeypair.publicKey.toString() +
			" --url devnet"
	)
	console.log("   2. Use a faucet: https://faucet.solana.com")
	console.log("   3. Transfer from another wallet")
	console.log("\n⏳ Waiting for funding... (checking every 5 seconds)")

	const requiredBalance = 0.05 * 1e9
	let attempts = 0
	const maxAttempts = 24

	while (attempts < maxAttempts) {
		const balance = await connection.getBalance(targetKeypair.publicKey)

		if (balance >= requiredBalance) {
			console.log("✅ Funding detected!")
			console.log("💰 Current balance:", balance / 1e9, "SOL")
			return
		}

		attempts++
		console.log(
			`🔍 Attempt ${attempts}/${maxAttempts} - Balance: ${balance / 1e9} SOL`
		)

		if (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 5000))
		}
	}

	throw new Error(
		"❌ Timeout waiting for manual funding. Please fund the address and try again."
	)
}

/**
 * Get metadata account PDA for a token mint (legacy function - not needed with UMI)
 */
function getMetadataAccountPDA(mintAddress: PublicKey): PublicKey {
	// This is kept for reference but UMI handles PDA derivation automatically
	throw new Error("Use UMI instead - this function is deprecated")
}

async function createTestToken(config: TokenConfig): Promise<void> {
	console.log(
		`🚀 Creating SPL token with on-chain metadata "${config.name}" (${config.symbol}) on devnet...`
	)

	const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

	let payer: Keypair
	let shouldFundPayer = true

	if (config.payerSecretKey) {
		try {
			const secretKeyArray = JSON.parse(config.payerSecretKey)
			payer = Keypair.fromSecretKey(new Uint8Array(secretKeyArray))
			console.log("🔑 Using provided wallet:", payer.publicKey.toString())
			shouldFundPayer = false

			const balance = await connection.getBalance(payer.publicKey)
			console.log("💰 Current balance:", balance / 1e9, "SOL")

			if (balance < 0.1 * 1e9) {
				console.log(
					"⚠️ Wallet balance is low, you may need more SOL for transactions"
				)
			}
		} catch (error) {
			console.log("⚠️ Invalid secret key format, generating new keypair")
			payer = Keypair.generate()
		}
	} else {
		payer = Keypair.generate()
		console.log("🔑 Generated new keypair:", payer.publicKey.toString())
	}

	if (shouldFundPayer) {
		try {
			console.log("💧 Requesting airdrop...")
			const airdropTx = await connection.requestAirdrop(
				payer.publicKey,
				2e9
			)
			await connection.confirmTransaction(airdropTx)
			console.log("✅ Airdrop successful")

			await new Promise((resolve) => setTimeout(resolve, 2000))

			const balance = await connection.getBalance(payer.publicKey)
			console.log("💰 Current balance:", balance / 1e9, "SOL")
		} catch (error: any) {
			console.log("⚠️ Airdrop failed:", error.message)
			console.log("🔄 Trying fallback: manual funding required...")
			await requestManualFunding(connection, payer)
		}
	}

	try {
		// Setup UMI
		console.log("🛠️ Setting up UMI (Metaplex Universal Interface)...")
		const umi = createUmi(clusterApiUrl("devnet")).use(mplTokenMetadata())

		// Convert Web3.js keypair to UMI format
		const umiKeypair = umi.eddsa.createKeypairFromSecretKey(payer.secretKey)
		umi.use(keypairIdentity(umiKeypair))

		// Generate mint keypair
		const mint = generateSigner(umi)
		console.log("📋 Token Mint Address:", mint.publicKey.toString())

		// Create token with metadata using UMI
		console.log("🏭 Creating token with metadata...")
		await createV1(umi, {
			mint,
			authority: umi.identity,
			name: config.name,
			symbol: config.symbol,
			uri: config.uri || "",
			sellerFeeBasisPoints: percentAmount(0), // 0% royalty
			decimals: config.decimals,
			tokenStandard: TokenStandard.Fungible
		}).sendAndConfirm(umi)

		console.log("✅ Token and metadata created successfully!")

		// Now mint some tokens using Web3.js (since UMI doesn't handle minting easily)
		const mintPubkey = new PublicKey(mint.publicKey.toString())

		// Create associated token account
		console.log("🏦 Creating associated token account...")
		const tokenAccount = await getOrCreateAssociatedTokenAccount(
			connection,
			payer,
			mintPubkey,
			payer.publicKey
		)

		// Mint initial supply
		console.log("🪙 Minting initial supply...")
		await mintTo(
			connection,
			payer,
			mintPubkey,
			tokenAccount.address,
			payer, // mint authority is the payer
			config.initialSupply * Math.pow(10, config.decimals)
		)

		// Save token info
		const tokenInfo: TokenInfo = {
			mint: mintPubkey.toString(),
			mintAuthority: payer.publicKey.toString(),
			mintAuthoritySecretKey: Array.from(payer.secretKey),
			payerSecretKey: Array.from(payer.secretKey),
			tokenAccount: tokenAccount.address.toString(),
			name: config.name,
			symbol: config.symbol,
			decimals: config.decimals,
			initialSupply: config.initialSupply,
			uri: config.uri,
			description: config.description,
			network: "devnet",
			createdAt: new Date().toISOString(),
			metadataAccount: "auto-generated-by-umi"
		}

		const tokensDir = path.join(process.cwd(), "scripts", "tokens")
		if (!fs.existsSync(tokensDir)) {
			fs.mkdirSync(tokensDir, { recursive: true })
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
		const filename = `${config.symbol.toLowerCase()}-${timestamp}.json`
		const outputPath = path.join(tokensDir, filename)
		fs.writeFileSync(outputPath, JSON.stringify(tokenInfo, null, 2))

		console.log("\n✅ Token with on-chain metadata created successfully!")
		console.log("📄 Token info saved to:", outputPath)
		console.log("\n🔗 Use this address in your app:")
		console.log("   ", mintPubkey.toString())
		console.log("\n🌐 Verify on Solana Explorer:")
		console.log(
			"   ",
			`https://explorer.solana.com/address/${mintPubkey.toString()}?cluster=devnet`
		)
		console.log("\n🔍 Verify on Solscan:")
		console.log(
			"   ",
			`https://solscan.io/token/${mintPubkey.toString()}?cluster=devnet`
		)
		console.log(
			"\n✨ Your token now has on-chain metadata visible on all explorers!"
		)
		console.log(
			"\n💡 Wait a few minutes for explorers to index the metadata."
		)
	} catch (error: any) {
		console.error("❌ Error creating token:", error)
		if (error.cause) {
			console.error("📋 Cause:", error.cause)
		}
		process.exit(1)
	}
}

function listTokens(): void {
	const tokensDir = path.join(process.cwd(), "scripts", "tokens")

	if (!fs.existsSync(tokensDir)) {
		console.log("📭 No tokens found. Create your first token!")
		return
	}

	const tokenFiles = fs
		.readdirSync(tokensDir)
		.filter((file) => file.endsWith(".json"))

	if (tokenFiles.length === 0) {
		console.log("📭 No tokens found. Create your first token!")
		return
	}

	console.log(`\n🪙 Found ${tokenFiles.length} token(s):\n`)

	tokenFiles.forEach((file, index) => {
		const tokenPath = path.join(tokensDir, file)
		const tokenInfo = JSON.parse(fs.readFileSync(tokenPath, "utf8"))

		console.log(`${index + 1}. ${tokenInfo.name} (${tokenInfo.symbol})`)
		console.log(`   📋 Mint: ${tokenInfo.mint}`)
		console.log(
			`   📅 Created: ${new Date(tokenInfo.createdAt).toLocaleString()}`
		)
		console.log(`   💰 Supply: ${tokenInfo.initialSupply.toLocaleString()}`)
		if (tokenInfo.uri) console.log(`   🖼️  Image: ${tokenInfo.uri}`)
		if (tokenInfo.metadataAccount)
			console.log(`   📄 Metadata: ${tokenInfo.metadataAccount}`)
		console.log(`   📁 File: ${file}\n`)
	})
}

// CLI setup
program
	.name("create-test-token")
	.description("Create a test SPL token with metadata on Solana devnet")
	.version("2.0.0")

program
	.command("create")
	.description("Create a new token with on-chain metadata")
	.option("-n, --name <name>", "Token name", "Test Token")
	.option("-s, --symbol <symbol>", "Token symbol", "TEST")
	.option("-d, --decimals <decimals>", "Token decimals", "6")
	.option("-i, --initial-supply <supply>", "Initial token supply", "1000000")
	.option("-u, --uri <uri>", "Token image URI (optional)")
	.option("--description <description>", "Token description (optional)")
	.option(
		"--payer-key <key>",
		"Payer wallet secret key as JSON array (optional)"
	)
	.action(async (options) => {
		const config: TokenConfig = {
			name: options.name,
			symbol: options.symbol,
			decimals: parseInt(options.decimals),
			initialSupply: parseInt(options.initialSupply),
			uri: options.uri,
			description: options.description,
			payerSecretKey: options.payerKey
		}

		await createTestToken(config)
	})

program
	.command("list")
	.description("List all created tokens")
	.action(() => {
		listTokens()
	})

if (require.main === module) {
	program.parse()
}

export { createTestToken, TokenConfig, TokenInfo }
