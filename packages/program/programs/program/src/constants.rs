use anchor_lang::prelude::*;

// PDA Seeds
pub const COOLDOWN_SEED: &[u8] = b"cooldown";
pub const LOGO_PLACEMENT_SEED: &[u8] = b"logo_placement";

// Fee Configuration
pub const BASE_PLACEMENT_FEE: u64 = 1_000_000;    // 0.001 SOL in lamports
pub const OVERWRITE_MULTIPLIER: u64 = 5;          // 5x fee for overwrites
pub const TREASURY_PERCENTAGE: u8 = 100;          // 100% to treasury

// Rate Limiting
pub const COOLDOWN_PERIOD: i64 = 30;              // 30 seconds between placements

// Coordinate Constraints
pub const MIN_LATITUDE: i32 = -90_000_000;        // -90° in microdegrees
pub const MAX_LATITUDE: i32 = 90_000_000;         // +90° in microdegrees
pub const MIN_LONGITUDE: i32 = -180_000_000;      // -180° in microdegrees
pub const MAX_LONGITUDE: i32 = 180_000_000;       // +180° in microdegrees

// Logo Constraints
pub const MAX_LOGO_URI_LENGTH: usize = 200;       // Max characters for logo URI

// Treasury address (replace with actual treasury)
pub const TREASURY_ADDRESS: Pubkey = anchor_lang::solana_program::pubkey!("3ojcMQjKYfME4qGmgE8Qb9odKcu4kSes1xhcVXD7DXCd");
