pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use error::*;

declare_id!("Fw64bA7dMN1nzc1X82vsLydU63yHuBSNGHyozsZAqQBP");

#[program]
pub mod solplace_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn place_logo(
        ctx: Context<PlaceLogo>,
        lat: i32,
        lng: i32,
        token_mint: Pubkey,
        logo_uri: String,
    ) -> Result<()> {
        instructions::place_logo::handler(ctx, lat, lng, token_mint, logo_uri)
    }

    /// This instruction exists solely to expose LogoPlacement and UserCooldown types to the IDL
    /// It should never be called directly
    pub fn _expose_types(_ctx: Context<ExposeTypes>) -> Result<()> {
        // This instruction is never meant to be executed
        // It only exists to force Anchor to include our account types in the IDL
        err!(error::SolplaceError::InvalidCoordinates)
    }
}
