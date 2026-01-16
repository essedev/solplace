#!/usr/bin/env ts-node

/**
 * Utility script to extract secret key from a Solana wallet file
 * Usage: ts-node extract-wallet-key.ts <path-to-wallet-file>
 */

import * as fs from "fs"
import * as path from "path"

function extractSecretKey(walletFilePath: string): string {
	try {
		console.log("🔑 Extracting secret key from:", walletFilePath)

		if (!fs.existsSync(walletFilePath)) {
			throw new Error(`Wallet file not found: ${walletFilePath}`)
		}

		const walletData = fs.readFileSync(walletFilePath, "utf8")
		const secretKeyArray = JSON.parse(walletData)

		if (!Array.isArray(secretKeyArray) || secretKeyArray.length !== 64) {
			throw new Error(
				"Invalid wallet file format. Expected array of 64 numbers."
			)
		}

		console.log("✅ Secret key extracted successfully!")
		console.log("📋 Use this with --payer-key option:")
		console.log(JSON.stringify(secretKeyArray))

		return JSON.stringify(secretKeyArray)
	} catch (error: any) {
		console.error("❌ Error extracting secret key:", error.message)
		process.exit(1)
	}
}

// CLI usage
if (require.main === module) {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.log(
			"Usage: ts-node extract-wallet-key.ts <path-to-wallet-file>"
		)
		console.log("\nExample:")
		console.log("  ts-node extract-wallet-key.ts ~/.config/solana/id.json")
		process.exit(1)
	}

	const walletPath = args[0]
	extractSecretKey(walletPath)
}

export { extractSecretKey }
