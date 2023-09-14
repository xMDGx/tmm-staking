use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer, transfer},
};

use solana_program::clock::Clock;

declare_id!("2oXApx9k2sPsCdDbQRhbxwzQxm4nrVz3SXK1CorL1FhL");

pub mod constants {
    pub const TOKEN_SEED: &[u8] = b"token";
    pub const STAKE_INFO_SEED: &[u8] = b"stake_info";
}

#[program]
pub mod tmm_staking {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;

        // Check if staking exists already.
        if stake_info.total_stake > 0.0 {
            return Err(ErrorCode::IsStaked.into());
        }

        // Check if don't have any tokens to stake.
        if amount <= 0 {
            return Err(ErrorCode::NoTokens.into());
        }

        let clock = Clock::get()?;

        stake_info.stake_at_slot = clock.slot;
        stake_info.earned_stake = 0 as f64;
        stake_info.donated_stake = 0 as f64;
        stake_info.target_days = 0;
        stake_info.actual_days = 0;

        let total_stake = (amount)
            .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
            .unwrap();

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.stake_account.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info()
                },
            ),
            total_stake,
        )?;

        Ok(())
    }

    pub fn unstake(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // Stake Account.
    #[account(
        init_if_needed,
        seeds = [constants::TOKEN_SEED, signer.key().as_ref()],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = stake_account
    )]
    pub stake_account: Account<'info, TokenAccount>,

    // Stake Info Account.
    #[account(
        init_if_needed,
        seeds = [constants::STAKE_INFO_SEED, signer.key().as_ref()],
        bump,
        payer = signer,
        // space = 8 + 8 + 8 + 8 + 2 + 2,
        space = 8 + std::mem::size_of::<StakeInfo>()
    )]
    pub stake_info_account: Account<'info, StakeInfo>,
    
    // User Token Account (Outside of Program).
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StakeInfo {
    pub stake_at_slot: u64,
    pub total_stake: f64,
    pub earned_stake: f64,
    pub donated_stake: f64,
    pub target_days: u16,
    pub actual_days: u16,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Staking exists already.")]
    IsStaked,
    #[msg("Staking does not exist.")]
    NotStaked,
    #[msg("Staking has not unlocked yet.")]
    StakeLocked,
    #[msg("No tokens to stake.")]
    NoTokens,
}