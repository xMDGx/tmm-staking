use anchor_lang::prelude::*;

#[account]
pub struct Stake {
    // The owner/signer of the stake (32).
    pub owner: Pubkey,

    // UNIX timestamp of the deposit (8).
    pub deposit_timestamp: i64,

    // The ID of the habit being staked against (24).
    pub habit_id: String,

    // Total stake amount (8).
    pub total_stake: u64,

    // The bump seed for the stake (1).
    pub bump: u8,

    // The bump seed for the stake token account (1).
    pub stake_token_bump: u8,
}

impl Stake {
    pub const LEN: usize = 8 + 32 + 8 + 24 + 8 + 1 + 1;
}