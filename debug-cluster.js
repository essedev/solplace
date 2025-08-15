// Test cluster ID calculation
const lat = 40_712_800
const lng = -74_006_000

console.log("Input coordinates:", { lat, lng })

// Convert to i32 first (Rust function takes i32)
const latI32 = Math.floor(lat) | 0 // Convert to 32-bit signed integer
const lngI32 = Math.floor(lng) | 0 // Convert to 32-bit signed integer

console.log("i32 coordinates:", { latI32, lngI32 })

// Test different division approaches
console.log("\n=== Testing division behavior ===")
console.log(
	"JavaScript Math.floor(-74006000 / 100000):",
	Math.floor(-74006000 / 100000)
)
console.log(
	"JavaScript Math.trunc(-74006000 / 100000):",
	Math.trunc(-74006000 / 100000)
)
console.log(
	"JavaScript parseInt(-74006000 / 100000):",
	parseInt(-74006000 / 100000)
)

// In Rust, integer division truncates towards zero, not floor
// So -74006000 / 100000 = -740 (truncate), not -741 (floor)
const clusterLat = Math.trunc(latI32 / 100_000) // Use trunc instead of floor
const clusterLng = Math.trunc(lngI32 / 100_000) // Use trunc instead of floor

console.log("Cluster coordinates (with trunc):", { clusterLat, clusterLng })

// Test the EXACT Rust conversion: i32 -> u64
function i32ToU64Rust(value) {
	if (value >= 0) {
		return BigInt(value)
	} else {
		// For negative i32 values in Rust: sign extension to 64 bits
		return BigInt(0x10000000000000000) + BigInt(value)
	}
}

const clusterLatU64 = i32ToU64Rust(clusterLat)
const clusterLngU64 = i32ToU64Rust(clusterLng)

console.log("Rust-style u64 values:", {
	clusterLatU64: clusterLatU64.toString(),
	clusterLngU64: clusterLngU64.toString()
})

const rustResult = (clusterLatU64 << BigInt(32)) | clusterLngU64
console.log("Rust-style result (with trunc):", rustResult.toString())

console.log("\n=== Comparison with expected ===")
console.log("Rust calculated (from logs): 18446744073709550876")
console.log("Our calculation (with trunc):", rustResult.toString())
console.log("Match?", rustResult.toString() === "18446744073709550876")

// Debug the -740 vs -741 difference
console.log("\n=== Debug -740 vs -741 ===")
console.log("-740 as u64:", i32ToU64Rust(-740).toString())
console.log("-741 as u64:", i32ToU64Rust(-741).toString())
console.log("Difference:", i32ToU64Rust(-740) - i32ToU64Rust(-741))
