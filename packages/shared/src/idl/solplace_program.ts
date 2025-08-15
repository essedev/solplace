/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solplace_program.json`.
 */
export type SolplaceProgram = {
  "address": "Fw64bA7dMN1nzc1X82vsLydU63yHuBSNGHyozsZAqQBP",
  "metadata": {
    "name": "solplaceProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "exposeTypes",
      "docs": [
        "This instruction exists solely to expose LogoPlacement and UserCooldown types to the IDL",
        "It should never be called directly"
      ],
      "discriminator": [
        252,
        180,
        222,
        102,
        33,
        96,
        232,
        36
      ],
      "accounts": [
        {
          "name": "logoPlacement",
          "docs": [
            "Expose LogoPlacement type to IDL"
          ]
        },
        {
          "name": "userCooldown",
          "docs": [
            "Expose UserCooldown type to IDL"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "placeLogo",
      "discriminator": [
        117,
        193,
        212,
        91,
        93,
        151,
        217,
        151
      ],
      "accounts": [
        {
          "name": "logoPlacement",
          "docs": [
            "Individual logo placement account (PDA from coordinates)"
          ],
          "writable": true
        },
        {
          "name": "userCooldown",
          "docs": [
            "User cooldown account (PDA from user address)"
          ],
          "writable": true
        },
        {
          "name": "tokenMint",
          "docs": [
            "The token mint account that must be a valid SPL token"
          ]
        },
        {
          "name": "treasury",
          "docs": [
            "Treasury account that receives all fees"
          ],
          "writable": true
        },
        {
          "name": "user",
          "docs": [
            "User account that pays for the placement"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lat",
          "type": "i32"
        },
        {
          "name": "lng",
          "type": "i32"
        },
        {
          "name": "tokenMint",
          "type": "pubkey"
        },
        {
          "name": "logoUri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "logoPlacement",
      "discriminator": [
        73,
        115,
        45,
        46,
        171,
        45,
        114,
        126
      ]
    },
    {
      "name": "userCooldown",
      "discriminator": [
        198,
        114,
        196,
        140,
        118,
        165,
        129,
        190
      ]
    }
  ],
  "events": [
    {
      "name": "logoPlacedEvent",
      "discriminator": [
        98,
        67,
        200,
        17,
        51,
        0,
        21,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidLatitude",
      "msg": "Invalid coordinates: latitude must be between -90° and +90°"
    },
    {
      "code": 6001,
      "name": "invalidLongitude",
      "msg": "Invalid coordinates: longitude must be between -180° and +180°"
    },
    {
      "code": 6002,
      "name": "invalidCoordinates",
      "msg": "Invalid coordinates provided"
    },
    {
      "code": 6003,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint: account does not exist or is not a valid SPL token"
    },
    {
      "code": 6004,
      "name": "uninitializedMint",
      "msg": "Token mint is not initialized"
    },
    {
      "code": 6005,
      "name": "userOnCooldown",
      "msg": "User is still on cooldown. Please wait before placing another logo"
    },
    {
      "code": 6006,
      "name": "logoUriTooLong",
      "msg": "Logo URI is too long. Maximum 200 characters allowed"
    },
    {
      "code": 6007,
      "name": "insufficientFunds",
      "msg": "Insufficient funds to pay placement fee"
    },
    {
      "code": 6008,
      "name": "invalidTreasury",
      "msg": "Invalid treasury account"
    },
    {
      "code": 6009,
      "name": "invalidLogoPlacement",
      "msg": "Invalid logo placement PDA"
    },
    {
      "code": 6010,
      "name": "invalidCooldown",
      "msg": "Invalid cooldown PDA"
    },
    {
      "code": 6011,
      "name": "invalidAccount",
      "msg": "Invalid account: discriminator mismatch"
    }
  ],
  "types": [
    {
      "name": "logoPlacedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "lat",
            "type": "i32"
          },
          {
            "name": "lng",
            "type": "i32"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "logoUri",
            "type": "string"
          },
          {
            "name": "feePaid",
            "type": "u64"
          },
          {
            "name": "isOverwrite",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "logoPlacement",
      "docs": [
        "Individual logo placement account",
        "Each logo gets its own account, costs ~0.2-0.3 SOL rent"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coordinates",
            "docs": [
              "Coordinates in microdegrees [lat, lng]"
            ],
            "type": {
              "array": [
                "i32",
                2
              ]
            }
          },
          {
            "name": "tokenMint",
            "docs": [
              "Token contract address"
            ],
            "type": "pubkey"
          },
          {
            "name": "logoUri",
            "docs": [
              "Resolved logo URL (max 200 chars)"
            ],
            "type": "string"
          },
          {
            "name": "logoHash",
            "docs": [
              "Content hash for integrity verification"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "placedBy",
            "docs": [
              "User wallet address that placed this token"
            ],
            "type": "pubkey"
          },
          {
            "name": "placedAt",
            "docs": [
              "Unix timestamp when placed"
            ],
            "type": "i64"
          },
          {
            "name": "overwriteCount",
            "docs": [
              "Number of times this position has been overwritten"
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userCooldown",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "lastPlacement",
            "type": "i64"
          },
          {
            "name": "placementCount",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
