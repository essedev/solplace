use anchor_lang::prelude::*;

#[error_code]
pub enum SolplaceError {
    #[msg("Invalid coordinates: latitude must be between -90° and +90°")]
    InvalidLatitude,
    
    #[msg("Invalid coordinates: longitude must be between -180° and +180°")]
    InvalidLongitude,
    
    #[msg("Invalid coordinates provided")]
    InvalidCoordinates,
    
    #[msg("Invalid token mint: account does not exist or is not a valid SPL token")]
    InvalidTokenMint,
    
    #[msg("Token mint is not initialized")]
    UninitializedMint,
    
    #[msg("User is still on cooldown. Please wait before placing another logo")]
    UserOnCooldown,
    
    #[msg("Logo URI is too long. Maximum 200 characters allowed")]
    LogoUriTooLong,
    
    #[msg("Insufficient funds to pay placement fee")]
    InsufficientFunds,
    
    #[msg("Invalid treasury account")]
    InvalidTreasury,

    #[msg("Invalid logo placement PDA")]
    InvalidLogoPlacement,

    #[msg("Invalid cooldown PDA")]
    InvalidCooldown,

    #[msg("Invalid account: discriminator mismatch")]
    InvalidAccount,
}
