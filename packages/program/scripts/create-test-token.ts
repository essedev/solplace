import {
	createMint,
	getOrCreateAssociatedTokenAccount,
	mintTo
} from "@solana/spl-token"
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js"
import { program } from "commander"
import * as fs from "fs"
import * as path from "path"

interface TokenConfig {
	name: string
	symbol: string
	decimals: number
	initialSupply: number
	uri?: string
	description?: string
	payerSecretKey?: string // Hex string of secret key for funding
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

	// Poll for balance every 5 seconds
	const requiredBalance = 0.05 * 1e9 // 0.05 SOL in lamports
	let attempts = 0
	const maxAttempts = 24 // 2 minutes total

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

async function uploadImageToIPFS(imagePath: string): Promise<string> {
	// Placeholder per futura implementazione IPFS
	// Per ora restituiamo un URL di esempio
	console.log("📸 Image upload to IPFS not implemented yet")
	console.log("🔗 You can use any public URL for now")
	return "https://example.com/token-image.png"
}

async function createTestToken(config: TokenConfig): Promise<void> {
	console.log(
		`🚀 Creating test SPL token "${config.name}" (${config.symbol}) on devnet...`
	)

	// Connect to devnet
	const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

	let payer: Keypair
	let shouldFundPayer = true

	// Use existing wallet if secret key is provided
	if (config.payerSecretKey) {
		try {
			const secretKeyArray = JSON.parse(config.payerSecretKey)
			payer = Keypair.fromSecretKey(new Uint8Array(secretKeyArray))
			console.log("🔑 Using provided wallet:", payer.publicKey.toString())
			shouldFundPayer = false

			// Check balance
			const balance = await connection.getBalance(payer.publicKey)
			console.log("💰 Current balance:", balance / 1e9, "SOL")

			if (balance < 0.05 * 1e9) {
				// Less than 0.05 SOL
				console.log(
					"⚠️ Wallet balance is low, you may need more SOL for transactions"
				)
			}
		} catch (error) {
			console.log("⚠️ Invalid secret key format, generating new keypair")
			payer = Keypair.generate()
		}
	} else {
		// Create new keypair for this script
		payer = Keypair.generate()
		console.log("🔑 Generated new keypair:", payer.publicKey.toString())
	}

	// Fund the payer if needed
	if (shouldFundPayer) {
		try {
			console.log("💧 Requesting airdrop...")
			const airdropTx = await connection.requestAirdrop(
				payer.publicKey,
				2e9
			) // 2 SOL
			await connection.confirmTransaction(airdropTx)
			console.log("✅ Airdrop successful")

			// Wait a bit to ensure balance is updated
			await new Promise((resolve) => setTimeout(resolve, 2000))

			const balance = await connection.getBalance(payer.publicKey)
			console.log("💰 Current balance:", balance / 1e9, "SOL")
		} catch (error: any) {
			console.log("⚠️ Airdrop failed:", error.message)
			console.log("🔄 Trying fallback: manual funding required...")

			// Fallback: ask user for manual funding
			await requestManualFunding(connection, payer)
		}
	}

	try {
		// Create mint authority keypair
		const mintAuthority = Keypair.generate()

		console.log("🏭 Creating standard SPL token mint...")
		// Create standard SPL token (per ora creiamo solo token standard)
		const mintAddress = await createMint(
			connection,
			payer, // Fee payer
			mintAuthority.publicKey, // Mint authority
			null, // Freeze authority (none)
			config.decimals // Decimals
		)

		console.log("🎉 Token mint created!")
		console.log("📋 Token Mint Address:", mintAddress.toString())
		console.log("🔑 Mint Authority:", mintAuthority.publicKey.toString())
		console.log("🏷️ Name:", config.name)
		console.log("🎯 Symbol:", config.symbol)
		if (config.uri) console.log("🖼️ Image URI:", config.uri)
		if (config.description)
			console.log("📝 Description:", config.description)

		// Create associated token account for the payer
		console.log("🏦 Creating associated token account...")
		const tokenAccount = await getOrCreateAssociatedTokenAccount(
			connection,
			payer,
			mintAddress,
			payer.publicKey
		)

		// Mint some tokens to the account
		console.log("🪙 Minting initial supply...")
		await mintTo(
			connection,
			payer,
			mintAddress,
			tokenAccount.address,
			mintAuthority,
			config.initialSupply * Math.pow(10, config.decimals)
		)

		// Save token info to file
		const tokenInfo: TokenInfo = {
			mint: mintAddress.toString(),
			mintAuthority: mintAuthority.publicKey.toString(),
			mintAuthoritySecretKey: Array.from(mintAuthority.secretKey),
			payerSecretKey: Array.from(payer.secretKey),
			tokenAccount: tokenAccount.address.toString(),
			name: config.name,
			symbol: config.symbol,
			decimals: config.decimals,
			initialSupply: config.initialSupply,
			uri: config.uri,
			description: config.description,
			network: "devnet",
			createdAt: new Date().toISOString()
		}

		// Create tokens directory if it doesn't exist
		const tokensDir = path.join(process.cwd(), "scripts", "tokens")
		if (!fs.existsSync(tokensDir)) {
			fs.mkdirSync(tokensDir, { recursive: true })
		}

		// Generate filename with timestamp and token symbol
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
		const filename = `${config.symbol.toLowerCase()}-${timestamp}.json`
		const outputPath = path.join(tokensDir, filename)
		fs.writeFileSync(outputPath, JSON.stringify(tokenInfo, null, 2))

		console.log("\n✅ Test token created successfully!")
		console.log("📄 Token info saved to:", outputPath)
		console.log("\n🔗 Use this address in your app:")
		console.log("   ", mintAddress.toString())
		console.log("\n🌐 Verify on Solana Explorer:")
		console.log(
			"   ",
			`https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`
		)
		console.log(
			"\n💡 You can now use this token address in your application!"
		)
		console.log(
			"\n📝 Note: Token metadata (name, symbol, image) is stored in the JSON file for reference."
		)
		console.log(
			"    For on-chain metadata, consider using a metadata service like Metaplex."
		)
	} catch (error: any) {
		console.error("❌ Error creating token:", error)
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
		console.log(`   📄 File: ${file}\n`)
	})
}

// CLI setup
program
	.name("create-test-token")
	.description("Create a test SPL token on Solana devnet")
	.version("1.0.0")

program
	.command("create")
	.description("Create a new token")
	.option("-n, --name <name>", "Token name", "Test Token")
	.option("-s, --symbol <symbol>", "Token symbol", "TEST")
	.option("-d, --decimals <decimals>", "Token decimals", "6")
	.option("-i, --initial-supply <supply>", "Initial token supply", "1000000")
	.option("-u, --uri <uri>", "Token image URI (optional)")
	.option("--description <description>", "Token description (optional)")
	.option(
		"--image-file <path>",
		"Local image file to upload (future feature)"
	)
	.option(
		"--payer-key <key>",
		"Payer wallet secret key as JSON array (optional)"
	)
	.action(async (options) => {
		let imageUri = options.uri

		// Se viene fornito un file immagine locale, caricalo (per ora solo placeholder)
		if (options.imageFile && !options.uri) {
			console.log("🚧 Local image upload feature coming soon!")
			console.log("💡 For now, please use --uri with a public URL")
			console.log("📁 Image file specified:", options.imageFile)
			// imageUri = await uploadImageToIPFS(options.imageFile);
		}

		const config: TokenConfig = {
			name: options.name,
			symbol: options.symbol,
			decimals: parseInt(options.decimals),
			initialSupply: parseInt(options.initialSupply),
			uri: imageUri,
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

// Parse command line arguments
if (require.main === module) {
	program.parse()
}

export { createTestToken, TokenConfig, TokenInfo }
