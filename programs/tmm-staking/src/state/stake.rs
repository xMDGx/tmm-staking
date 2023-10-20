use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token,
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

pub const STAKE_SEED: &[u8] = b"stake_seed";
pub const STAKE_INFO_SEED: &[u8] = b"stake_info_seed";


#[derive(Accounts)]
#[instruction(habit_id: String)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // Stake Account.
    #[account(
        init_if_needed,
        seeds = [
            STAKE_SEED,
            habit_id.as_bytes(),
            signer.key().as_ref()
            ],
        bump,
        payer = signer,
        // Need because of the associated token account.
        token::mint = mint,
        token::authority = stake_account
    )]
    pub stake_account: Account<'info, TokenAccount>,

    // Stake Info Account.
    #[account(
        init_if_needed,
        seeds = [
            STAKE_INFO_SEED,
            habit_id.as_bytes(),
            signer.key().as_ref()
            ],
        bump,
        payer = signer,
        space = 8 + std::mem::size_of::<StakeInfo>()
    )]
    pub stake_info_account: Account<'info, StakeInfo>,

    // User Token Wallet (Outside of Program).
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // Need because of the associated token account.
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StakeInfo {
    pub habit_id: String,
    pub stake_at_slot: u64,
    pub total_stake: f64,
    // pub earned_stake: f64,
    // pub donated_stake: f64,
    // pub target_days: u16,
    // pub actual_days: u16,
}