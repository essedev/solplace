use anchor_lang::prelude::*;
use crate::state::*;

/// This struct exists solely to expose our account types to the Anchor IDL generator
/// The instruction should never be called - it's only for TypeScript type generation
#[derive(Accounts)]
pub struct ExposeTypes<'info> {
    /// Expose LogoPlacement type to IDL
    pub logo_placement: Account<'info, LogoPlacement>,
    
    /// Expose UserCooldown type to IDL  
    pub user_cooldown: Account<'info, UserCooldown>,
}
