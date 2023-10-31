use anchor_lang::prelude::*;

#[account]
pub struct Stake {
    // Mint of the staked SPL token (32).
    pub mint: Pubkey,

    // UNIX timestamp of the deposit (8).
    pub deposit_timestamp: i64,

    // The ID of the habit being staked against (8).
    pub habit_id: u64,

    // Total stake amount (8).
    pub total_stake: u64,

    // The bump seed for the stake (1).
    pub bump: u8,

    // The bump seed for the stake token account (1).
    pub stake_token_bump: u8,
}

impl Stake {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1;
}