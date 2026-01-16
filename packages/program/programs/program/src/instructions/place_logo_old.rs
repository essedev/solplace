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

    // 4. Get cluster ID and check/initialize cluster account
    let cluster_id = get_cluster_id(lat, lng);
    
    let (cluster_pda, cluster_bump) = Pubkey::find_program_address(
        &[CLUSTER_SEED, &cluster_id.to_le_bytes()],
        ctx.program_id,
    );
    require!(
        ctx.accounts.cell_cluster.key() == cluster_pda,
        SolplaceError::InvalidCluster
    );

    // 5. Get user cooldown PDA and check
    let (cooldown_pda, cooldown_bump) = Pubkey::find_program_address(
        &[COOLDOWN_SEED, ctx.accounts.user.key().as_ref()],
        ctx.program_id,
    );
    require!(
        ctx.accounts.user_cooldown.key() == cooldown_pda,
        SolplaceError::InvalidCooldown
    );

    // 6. Initialize or load cluster account
    let mut cluster_data = if ctx.accounts.cell_cluster.data_is_empty() {
        // Initialize new cluster
        let space = CellCluster::MAX_SIZE;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        // Create account
        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.cell_cluster.to_account_info(),
                },
                &[&[CLUSTER_SEED, &cluster_id.to_le_bytes(), &[cluster_bump]]]
            ),
            lamports,
            space as u64,
            ctx.program_id,
        )?;

        // Initialize cluster data
        let mut cluster = CellCluster {
            cluster_id,
            bounds: get_cluster_bounds(cluster_id),
            cell_count: 0,
            cells: Vec::new(),
            last_updated: current_timestamp,
            bump: cluster_bump,
        };
        cluster
    } else {
        // Load existing cluster
        let cluster_account_data = ctx.accounts.cell_cluster.try_borrow_data()?;
        let mut cluster_data_slice = &cluster_account_data[8..]; // Skip discriminator
        CellCluster::try_deserialize(&mut cluster_data_slice)?
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
                &[&[COOLDOWN_SEED, ctx.accounts.user.key().as_ref(), &[cooldown_bump]]]
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
        let mut cooldown_data_slice = &cooldown_account_data[8..]; // Skip discriminator
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
    let (placement_fee, is_overwrite) = calculate_placement_fee(&cluster_data, lat, lng)?;

    // 10. Collect fee (transfer SOL from user to treasury)
    collect_fee(&ctx, placement_fee)?;

    // 11. Calculate logo hash
    let logo_hash = hash_logo_uri(&logo_uri);

    // 12. Create cell data
    let cell_data = CellData {
        coordinates: [lat, lng],
        token_mint,
        logo_uri: logo_uri.clone(),
        logo_hash,
        placed_by: ctx.accounts.user.key(),
        placed_at: current_timestamp,
        overwrite_count: if is_overwrite { 
            cluster_data
                .cells
                .iter()
                .find(|cell| cell.coordinates[0] == lat && cell.coordinates[1] == lng)
                .map(|cell| cell.overwrite_count + 1)
                .unwrap_or(1)
        } else { 
            0 
        },
    };

    // 13. Add or update cell in cluster
    cluster_data.add_or_update_cell(cell_data)?;
    cluster_data.last_updated = current_timestamp;

    // 14. Update user cooldown
    cooldown_data.last_placement = current_timestamp;
    cooldown_data.placement_count += 1;

    // 15. Serialize and save cluster data
    let mut cluster_account_data = ctx.accounts.cell_cluster.try_borrow_mut_data()?;
    let dst: &mut [u8] = &mut cluster_account_data;
    let mut cursor = std::io::Cursor::new(dst);
    cluster_data.try_serialize(&mut cursor)?;

    // 16. Serialize and save cooldown data
    let mut cooldown_account_data = ctx.accounts.user_cooldown.try_borrow_mut_data()?;
    let dst: &mut [u8] = &mut cooldown_account_data;
    let mut cursor = std::io::Cursor::new(dst);
    cooldown_data.try_serialize(&mut cursor)?;

    // 17. Emit event
    emit!(LogoPlacedEvent {
        user: ctx.accounts.user.key(),
        cluster_id,
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

fn validate_coordinates(lat: i32, lng: i32) -> Result<()> {
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

fn calculate_placement_fee(cluster: &CellCluster, lat: i32, lng: i32) -> Result<(u64, bool)> {
    if let Some(_) = cluster.find_cell_index(lat, lng) {
        // Overwrite existing cell
        let fee = BASE_PLACEMENT_FEE * OVERWRITE_MULTIPLIER;
        Ok((fee, true))
    } else {
        // New placement
        Ok((BASE_PLACEMENT_FEE, false))
    }
}

fn collect_fee(ctx: &Context<PlaceLogo>, amount: u64) -> Result<()> {
    // Transfer SOL from user to treasury
    let transfer_instruction = anchor_lang::system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };
    
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_instruction,
    );
    
    anchor_lang::system_program::transfer(cpi_context, amount)?;
    Ok(())
}

fn hash_logo_uri(logo_uri: &str) -> [u8; 32] {
    use anchor_lang::solana_program::hash::{hash, Hash};
    let hash_result: Hash = hash(logo_uri.as_bytes());
    hash_result.to_bytes()
}

// Events
#[event]
pub struct LogoPlacedEvent {
    pub user: Pubkey,
    pub cluster_id: u64,
    pub lat: i32,
    pub lng: i32,
    pub token_mint: Pubkey,
    pub logo_uri: String,
    pub fee_paid: u64,
    pub is_overwrite: bool,
    pub timestamp: i64,
}