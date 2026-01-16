use anchor_lang::prelude::*;

/// Individual logo placement account
/// Each logo gets its own account, costs ~0.2-0.3 SOL rent
#[account]
pub struct LogoPlacement {
    /// Coordinates in microdegrees [lat, lng]
    pub coordinates: [i32; 2],
    /// Token contract address
    pub token_mint: Pubkey,
    /// Resolved logo URL (max 200 chars)
    pub logo_uri: String,
    /// Content hash for integrity verification
    pub logo_hash: [u8; 32],
    /// User wallet address that placed this token
    pub placed_by: Pubkey,
    /// Unix timestamp when placed
    pub placed_at: i64,
    /// Number of times this position has been overwritten
    pub overwrite_count: u16,
    /// PDA bump seed
    pub bump: u8,
}

impl LogoPlacement {
    /// Calculate space needed for account
    /// 8 (discriminator) + 8 (coordinates) + 32 (token_mint) + 4 (string length) + 200 (logo_uri) + 32 (logo_hash) + 32 (placed_by) + 8 (placed_at) + 2 (overwrite_count) + 1 (bump)
    pub const SIZE: usize = 8 + 8 + 32 + 4 + 200 + 32 + 32 + 8 + 2 + 1;
}

/// Helper function to generate PDA for a logo placement
pub fn get_logo_placement_pda(lat: i32, lng: i32, program_id: &Pubkey) -> (Pubkey, u8) {
    use crate::constants::LOGO_PLACEMENT_SEED;
    
    Pubkey::find_program_address(
        &[
            LOGO_PLACEMENT_SEED,
            &lat.to_le_bytes(),
            &lng.to_le_bytes(),
        ],
        program_id,
    )
}

/// Helper function to validate coordinates
pub fn validate_coordinates(lat: i32, lng: i32) -> Result<()> {
    use crate::constants::*;
    use crate::error::SolplaceError;
    
    require!(
        lat >= MIN_LATITUDE && lat <= MAX_LATITUDE,
        SolplaceError::InvalidLatitude
    );
    require!(
        lng >= MIN_LONGITUDE && lng <= MAX_LONGITUDE,
        SolplaceError::InvalidLongitude
    );
    Ok(())
}
