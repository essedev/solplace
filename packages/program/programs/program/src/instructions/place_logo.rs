use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::constants::*;
use crate::error::SolplaceError;
use crate::state::*;

#[derive(Accounts)]
pub struct PlaceLogo<'info> {
    /// Individual logo placement account (PDA from coordinates)
    /// CHECK: This PDA is manually validated in the instruction handler
    #[account(mut)]
    pub logo_placement: UncheckedAccount<'info>,

    /// User cooldown account (PDA from user address)
    /// CHECK: This PDA is manually validated in the instruction handler
    #[account(mut)]
    pub user_cooldown: UncheckedAccount<'info>,

    /// The token mint account that must be a valid SPL token
    pub token_mint: Account<'info, Mint>,

    /// Treasury account that receives all fees
    /// CHECK: Treasury address is validated in instruction
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    /// User account that pays for the placement
    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PlaceLogo>,
    lat: i32,
    lng: i32,
    token_mint: Pubkey,
    logo_uri: String,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;

    // 1. Validate coordinates
    validate_coordinates(lat, lng)?;

    // 2. Validate logo URI length
    require!(
        logo_uri.len() <= MAX_LOGO_URI_LENGTH,
        SolplaceError::LogoUriTooLong
    );

    // 3. Validate token mint matches the account
    require!(
        ctx.accounts.token_mint.key() == token_mint,
        SolplaceError::InvalidTokenMint
    );

    // 4. Get logo placement PDA and validate
    let (logo_placement_pda, logo_bump) = get_logo_placement_pda(lat, lng, ctx.program_id);
    require!(
        ctx.accounts.logo_placement.key() == logo_placement_pda,
        SolplaceError::InvalidLogoPlacement
    );

    // 5. Get user cooldown PDA and validate
    let (cooldown_pda, cooldown_bump) = Pubkey::find_program_address(
        &[COOLDOWN_SEED, ctx.accounts.user.key().as_ref()],
        ctx.program_id,
    );
    require!(
        ctx.accounts.user_cooldown.key() == cooldown_pda,
        SolplaceError::InvalidCooldown
    );

    // 6. Initialize or load logo placement account
    let is_overwrite = !ctx.accounts.logo_placement.data_is_empty();
    let mut logo_data = if is_overwrite {
        // Load existing logo placement
        let logo_account_data = ctx.accounts.logo_placement.try_borrow_data()?;
        let mut logo_data_slice = &logo_account_data[..];
        LogoPlacement::try_deserialize(&mut logo_data_slice)?
    } else {
        // Create new logo placement account
        let space = LogoPlacement::SIZE;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        // Create account with PDA seeds
        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.logo_placement.to_account_info(),
                },
                &[&[
                    LOGO_PLACEMENT_SEED,
                    &lat.to_le_bytes(),
                    &lng.to_le_bytes(),
                    &[logo_bump],
                ]],
            ),
            lamports,
            space as u64,
            ctx.program_id,
        )?;

        // Initialize logo data
        LogoPlacement {
            coordinates: [lat, lng],
            token_mint: Pubkey::default(),  // Will be set below
            logo_uri: String::new(),        // Will be set below
            logo_hash: [0; 32],            // Will be set below
            placed_by: Pubkey::default(),   // Will be set below
            placed_at: 0,                  // Will be set below
            overwrite_count: 0,
            bump: logo_bump,
        }
    };

    // 7. Initialize or load user cooldown
    let mut cooldown_data = if ctx.accounts.user_cooldown.data_is_empty() {
        // Initialize new cooldown account
        let space = UserCooldown::SIZE;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        // Create account
        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.user_cooldown.to_account_info(),
                },
                &[&[
                    COOLDOWN_SEED,
                    ctx.accounts.user.key().as_ref(),
                    &[cooldown_bump],
                ]],
            ),
            lamports,
            space as u64,
            ctx.program_id,
        )?;

        UserCooldown {
            user: ctx.accounts.user.key(),
            last_placement: 0,
            placement_count: 0,
            bump: cooldown_bump,
        }
    } else {
        // Load existing cooldown
        let cooldown_account_data = ctx.accounts.user_cooldown.try_borrow_data()?;
        let mut cooldown_data_slice = &cooldown_account_data[..];
        UserCooldown::try_deserialize(&mut cooldown_data_slice)?
    };

    // 8. Check user cooldown
    if cooldown_data.last_placement != 0 {
        require!(
            !cooldown_data.is_on_cooldown(current_timestamp),
            SolplaceError::UserOnCooldown
        );
    }

    // 9. Calculate placement fee
    let placement_fee = if is_overwrite {
        BASE_PLACEMENT_FEE * OVERWRITE_MULTIPLIER
    } else {
        BASE_PLACEMENT_FEE
    };

    // 10. Collect fee (transfer SOL from user to treasury)
    collect_fee(&ctx, placement_fee)?;

    // 11. Calculate logo hash
    let logo_hash = hash_logo_uri(&logo_uri);

    // 12. Update logo placement data
    logo_data.coordinates = [lat, lng];
    logo_data.token_mint = token_mint;
    logo_data.logo_uri = logo_uri.clone();
    logo_data.logo_hash = logo_hash;
    logo_data.placed_by = ctx.accounts.user.key();
    logo_data.placed_at = current_timestamp;
    if is_overwrite {
        logo_data.overwrite_count += 1;
    }

    // 13. Update user cooldown
    cooldown_data.last_placement = current_timestamp;
    cooldown_data.placement_count += 1;

    // 14. Serialize and save logo placement data
    let mut logo_account_data = ctx.accounts.logo_placement.try_borrow_mut_data()?;
    
    // Use Anchor's built-in serialization which includes discriminator
    let mut dst = &mut logo_account_data[..];
    logo_data.try_serialize(&mut dst)?;

    // 15. Serialize and save cooldown data
    let mut cooldown_account_data = ctx.accounts.user_cooldown.try_borrow_mut_data()?;
    
    // Use Anchor's built-in serialization which includes discriminator
    let mut dst = &mut cooldown_account_data[..];
    cooldown_data.try_serialize(&mut dst)?;

    // 16. Emit event
    emit!(LogoPlacedEvent {
        user: ctx.accounts.user.key(),
        lat,
        lng,
        token_mint,
        logo_uri,
        fee_paid: placement_fee,
        is_overwrite,
        timestamp: current_timestamp,
    });

    Ok(())
}

// Helper functions
fn collect_fee(ctx: &Context<PlaceLogo>, amount: u64) -> Result<()> {
    // Check that treasury is the expected address
    require!(
        ctx.accounts.treasury.key() == TREASURY_ADDRESS,
        SolplaceError::InvalidTreasury
    );

    // Transfer SOL from user to treasury
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}

fn hash_logo_uri(logo_uri: &str) -> [u8; 32] {
    use anchor_lang::solana_program::hash::hash;
    hash(logo_uri.as_bytes()).to_bytes()
}

// Events
#[event]
pub struct LogoPlacedEvent {
    pub user: Pubkey,
    pub lat: i32,
    pub lng: i32,
    pub token_mint: Pubkey,
    pub logo_uri: String,
    pub fee_paid: u64,
    pub is_overwrite: bool,
    pub timestamp: i64,
}
