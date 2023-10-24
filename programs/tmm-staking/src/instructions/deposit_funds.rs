use crate::state::*;
use crate::constants::{STAKE_SEED, STAKE_TOKEN_SEED};
use crate::errors::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, Token, TokenAccount, Transfer, transfer},
};


pub fn deposit_funds(ctx: Context<DepositStake>, habit_id: String, amount: u64) -> Result<()> {
    let stake = &mut ctx.accounts.stake;

    // Check if staking exists already.
    if stake.total_stake > 0 {
        return Err(CustomError::IsStakedAlready.into());
    }

    // Check if token is USDC.
    // if ctx.accounts.token_mint.mint_authority != "" {
    //     return Err(CustomError::NotUSDC.into());
    // }

    // Check if don't have USDC to stake.
    if amount <= 0 {
        return Err(CustomError::AmountMustBeGreaterThanZero.into());
    }

    // Check if user has enough USDC to stake.
    if ctx.accounts.user_token_account.amount < amount {
        return Err(CustomError::NotEnoughToStake.into());
    }

    stake.owner = ctx.accounts.signer.key();

    let clock = Clock::get()?;
    stake.deposit_timestamp = clock.unix_timestamp;

    stake.habit_id = habit_id;
    stake.total_stake = amount;

    // New syntax for bumps that is supposed to work in anchor 0.29.0 but doesn't.
    // stake.bump = ctx.bumps.stake;
    // stake.stake_token_bump = ctx.bumps.stake_token_account;

    stake.bump = *ctx.bumps.get("stake").unwrap();
    stake.stake_token_bump = *ctx.bumps.get("stake_token_account").unwrap();

    // Do we need to add little bit of SOL for gas to accounts?
    // ctx.accounts.stake_token_account.add_lamports(1);

    // let deposit_amount = (amount)
    //     .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
    //     .unwrap();

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.stake_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info()
            },
        ),
        amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(habit_id: String, amount: u64)]
pub struct DepositStake<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    // Stake account.
    #[account(
        init,
        payer = signer,
        seeds = [
            STAKE_SEED.as_ref(),
            habit_id.as_bytes().as_ref(),
            signer.key().as_ref()
        ],
        space = Stake::LEN,
        bump
    )]
    pub stake: Account<'info, Stake>,

    // Stake token account PDA.
    #[account(
        init,
        payer = signer,
        seeds = [
            STAKE_TOKEN_SEED.as_ref(),
            stake.key().as_ref()
        ],
        token::mint = token_mint,
        token::authority = stake,
        bump
    )]
    pub stake_token_account: Account<'info, TokenAccount>,

    // User's token account (wallet).
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = signer
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}