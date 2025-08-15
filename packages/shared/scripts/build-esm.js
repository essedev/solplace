const fs = require("fs")
const path = require("path")

// Copy and rename ESM files
const esmDir = path.join(__dirname, "../dist/esm")
const distDir = path.join(__dirname, "../dist")

if (fs.existsSync(esmDir)) {
	// Copy index.js to index.esm.js
	const indexPath = path.join(esmDir, "index.js")
	const targetPath = path.join(distDir, "index.esm.js")

	if (fs.existsSync(indexPath)) {
		fs.copyFileSync(indexPath, targetPath)
		console.log("Created index.esm.js")
	}

	// Clean up ESM directory
	fs.rmSync(esmDir, { recursive: true, force: true })
}
