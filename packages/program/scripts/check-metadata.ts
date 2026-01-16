import {
	fetchMetadata,
	findMetadataPda,
	mplTokenMetadata
} from "@metaplex-foundation/mpl-token-metadata"
import { publicKey } from "@metaplex-foundation/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"

async function checkTokenMetadata(mintAddress: string) {
	console.log(`🔍 Checking metadata for token: ${mintAddress}`)

	try {
		// Setup UMI
		const umi = createUmi(clusterApiUrl("devnet")).use(mplTokenMetadata())

		// Convert string to UMI PublicKey
		const mint = publicKey(mintAddress)

		// Find metadata PDA
		const metadataPda = findMetadataPda(umi, { mint })
		console.log(`📄 Metadata account: ${metadataPda[0]}`)

		// Fetch metadata
		const metadata = await fetchMetadata(umi, metadataPda[0])

		console.log("\n✅ Metadata found!")
		console.log(`📛 Name: ${metadata.name}`)
		console.log(`🎯 Symbol: ${metadata.symbol}`)
		console.log(`🖼️  Image URI: ${metadata.uri}`)
		console.log(`👑 Update Authority: ${metadata.updateAuthority}`)
		console.log(`🔒 Is Mutable: ${metadata.isMutable}`)
		console.log(`💰 Seller Fee: ${metadata.sellerFeeBasisPoints}%`)

		// Try to fetch the actual JSON metadata from URI
		if (metadata.uri) {
			console.log("\n🌐 Fetching JSON metadata from URI...")
			try {
				const response = await fetch(metadata.uri)
				if (response.ok) {
					const jsonMetadata = await response.json()
					console.log("📋 JSON Metadata:")
					console.log(JSON.stringify(jsonMetadata, null, 2))
				} else {
					console.log(
						"⚠️ Could not fetch JSON metadata (might be just an image URL)"
					)
				}
			} catch (e) {
				console.log(
					"⚠️ URI is probably a direct image link, not JSON metadata"
				)
			}
		}
	} catch (error: any) {
		console.error("❌ Error fetching metadata:", error.message)

		// Check if token exists at all
		try {
			const connection = new Connection(clusterApiUrl("devnet"))
			const mintInfo = await connection.getParsedAccountInfo(
				new PublicKey(mintAddress)
			)

			if (mintInfo.value) {
				console.log("✅ Token mint exists, but no metadata found")
				console.log("📋 Token info:", mintInfo.value.data)
			} else {
				console.log("❌ Token mint does not exist")
			}
		} catch (e) {
			console.log("❌ Could not verify token existence")
		}
	}
}

// Get token address from command line
const tokenAddress = process.argv[2]
if (!tokenAddress) {
	console.log("Usage: ts-node check-metadata.ts <token-address>")
	process.exit(1)
}

checkTokenMetadata(tokenAddress)
