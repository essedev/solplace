use anchor_lang::prelude::*;

#[account]
pub struct UserCooldown {
    pub user: Pubkey,                       // User wallet address
    pub last_placement: i64,                // Unix timestamp of last placement
    pub placement_count: u32,               // Total number of placements by user
    pub bump: u8,                           // PDA bump
}

impl UserCooldown {
    pub const SIZE: usize = 8 + 32 + 8 + 4 + 1; // discriminator + user + last_placement + placement_count + bump

    pub fn is_on_cooldown(&self, current_timestamp: i64) -> bool {
        let time_since_last = current_timestamp - self.last_placement;
        time_since_last < crate::constants::COOLDOWN_PERIOD
    }

    pub fn remaining_cooldown(&self, current_timestamp: i64) -> i64 {
        if self.is_on_cooldown(current_timestamp) {
            crate::constants::COOLDOWN_PERIOD - (current_timestamp - self.last_placement)
        } else {
            0
        }
    }
}
