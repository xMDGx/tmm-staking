use anchor_lang::prelude::*;

#[account]
pub struct Stake {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub deposit_timestamp: i64,
    pub habit_id: String,
    pub total_stake: u64,
    pub stake_at_slot: u64,
    pub bump: u8,
    pub stake_token_bump: u8,
}