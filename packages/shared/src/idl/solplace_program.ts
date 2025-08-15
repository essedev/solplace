/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solplace_program.json`.
 */
export type SolplaceProgram = {
	address: "Fw64bA7dMN1nzc1X82vsLydU63yHuBSNGHyozsZAqQBP"
	metadata: {
		name: "solplaceProgram"
		version: "0.1.0"
		spec: "0.1.0"
		description: "Created with Anchor"
	}
	instructions: [
		{
			name: "exposeTypes"
			docs: [
				"This instruction exists solely to expose CellCluster and UserCooldown types to the IDL",
				"It should never be called directly"
			]
			discriminator: [252, 180, 222, 102, 33, 96, 232, 36]
			accounts: [
				{
					name: "cellCluster"
					docs: ["Expose CellCluster type to IDL"]
				},
				{
					name: "userCooldown"
					docs: ["Expose UserCooldown type to IDL"]
				}
			]
			args: []
		},
		{
			name: "initialize"
			discriminator: [175, 175, 109, 31, 13, 152, 155, 237]
			accounts: []
			args: []
		},
		{
			name: "placeLogo"
			discriminator: [117, 193, 212, 91, 93, 151, 217, 151]
			accounts: [
				{
					name: "cellCluster"
					writable: true
				},
				{
					name: "userCooldown"
					writable: true
				},
				{
					name: "tokenMint"
					docs: [
						"The token mint account that must be a valid SPL token"
					]
				},
				{
					name: "treasury"
					docs: ["Treasury account that receives all fees"]
					writable: true
				},
				{
					name: "user"
					docs: ["User account that pays for the placement"]
					writable: true
					signer: true
				},
				{
					name: "systemProgram"
					address: "11111111111111111111111111111111"
				}
			]
			args: [
				{
					name: "lat"
					type: "i32"
				},
				{
					name: "lng"
					type: "i32"
				},
				{
					name: "tokenMint"
					type: "pubkey"
				},
				{
					name: "logoUri"
					type: "string"
				}
			]
		}
	]
	accounts: [
		{
			name: "cellCluster"
			discriminator: [198, 234, 129, 80, 180, 141, 8, 33]
		},
		{
			name: "userCooldown"
			discriminator: [198, 114, 196, 140, 118, 165, 129, 190]
		}
	]
	events: [
		{
			name: "logoPlacedEvent"
			discriminator: [98, 67, 200, 17, 51, 0, 21, 192]
		}
	]
	errors: [
		{
			code: 6000
			name: "invalidLatitude"
			msg: "Invalid coordinates: latitude must be between -90° and +90°"
		},
		{
			code: 6001
			name: "invalidLongitude"
			msg: "Invalid coordinates: longitude must be between -180° and +180°"
		},
		{
			code: 6002
			name: "invalidTokenMint"
			msg: "Invalid token mint: account does not exist or is not a valid SPL token"
		},
		{
			code: 6003
			name: "uninitializedMint"
			msg: "Token mint is not initialized"
		},
		{
			code: 6004
			name: "userOnCooldown"
			msg: "User is still on cooldown. Please wait before placing another logo"
		},
		{
			code: 6005
			name: "clusterFull"
			msg: "Cluster is full. Maximum number of cells reached"
		},
		{
			code: 6006
			name: "logoUriTooLong"
			msg: "Logo URI is too long. Maximum 200 characters allowed"
		},
		{
			code: 6007
			name: "insufficientFunds"
			msg: "Insufficient funds to pay placement fee"
		},
		{
			code: 6008
			name: "invalidTreasury"
			msg: "Invalid treasury account"
		},
		{
			code: 6009
			name: "invalidCluster"
			msg: "Invalid cluster PDA"
		},
		{
			code: 6010
			name: "invalidCooldown"
			msg: "Invalid cooldown PDA"
		}
	]
	types: [
		{
			name: "cellCluster"
			type: {
				kind: "struct"
				fields: [
					{
						name: "clusterId"
						type: "u64"
					},
					{
						name: "bounds"
						type: {
							array: ["i32", 4]
						}
					},
					{
						name: "cellCount"
						type: "u32"
					},
					{
						name: "cells"
						type: {
							vec: {
								defined: {
									name: "cellData"
								}
							}
						}
					},
					{
						name: "lastUpdated"
						type: "i64"
					},
					{
						name: "bump"
						type: "u8"
					}
				]
			}
		},
		{
			name: "cellData"
			type: {
				kind: "struct"
				fields: [
					{
						name: "coordinates"
						type: {
							array: ["i32", 2]
						}
					},
					{
						name: "tokenMint"
						type: "pubkey"
					},
					{
						name: "logoUri"
						type: "string"
					},
					{
						name: "logoHash"
						type: {
							array: ["u8", 32]
						}
					},
					{
						name: "placedBy"
						type: "pubkey"
					},
					{
						name: "placedAt"
						type: "i64"
					},
					{
						name: "overwriteCount"
						type: "u16"
					}
				]
			}
		},
		{
			name: "logoPlacedEvent"
			type: {
				kind: "struct"
				fields: [
					{
						name: "user"
						type: "pubkey"
					},
					{
						name: "clusterId"
						type: "u64"
					},
					{
						name: "lat"
						type: "i32"
					},
					{
						name: "lng"
						type: "i32"
					},
					{
						name: "tokenMint"
						type: "pubkey"
					},
					{
						name: "logoUri"
						type: "string"
					},
					{
						name: "feePaid"
						type: "u64"
					},
					{
						name: "isOverwrite"
						type: "bool"
					},
					{
						name: "timestamp"
						type: "i64"
					}
				]
			}
		},
		{
			name: "userCooldown"
			type: {
				kind: "struct"
				fields: [
					{
						name: "user"
						type: "pubkey"
					},
					{
						name: "lastPlacement"
						type: "i64"
					},
					{
						name: "placementCount"
						type: "u32"
					},
					{
						name: "bump"
						type: "u8"
					}
				]
			}
		}
	]
}
