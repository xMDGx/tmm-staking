use crate::constants::VAULT_SEED;
use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, Token, TokenAccount},
};


pub fn initialize_vault(_ctx: Context<Initialize>) -> Result<()> {
  Ok(())
}


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    // TrickMyMind deposit/vault account.
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [VAULT_SEED.as_ref()],
        token::mint = token_mint,
        token::authority = vault_account,
        bump,
    )]
    pub vault_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}