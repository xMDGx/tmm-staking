use crate::state::*;
use crate::errors::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, Token, TokenAccount, Transfer, transfer},
};


pub fn deposit_funds(ctx: Context<DepositStake>, habit_id: String, amount: u64) -> Result<()> {
    let stake = &mut ctx.accounts.stake;

    // Check if don't have any tokens to stake.
    if amount <= 0 {
        return Err(CustomError::AmountMustBeGreaterThanZero.into());
    }

    // Check if staking exists already.
    if stake.total_stake > 0 {
        return Err(CustomError::IsStakedAlready.into());
    }

    let clock = Clock::get()?;
    stake.stake_at_slot = clock.slot;

    stake.habit_id = habit_id;
    stake.total_stake = amount;

    stake.bump = *ctx.bumps.get("stake").unwrap();
    stake.stake_token_bump = *ctx.bumps.get("stake_token_account").unwrap();

    // let deposit_amount = (amount)
    //     .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
    //     .unwrap();

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.stake_token_account.to_account_info(),
                authority: ctx.accounts.staker.to_account_info()
            },
        ),
        stake.total_stake,
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(habit_id: String)]
pub struct DepositStake<'info> {

    #[account(mut)]
    pub staker: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = staker,
        seeds = [
            habit_id.as_bytes(),
            staker.key().as_ref()
        ],
        space = 8 + std::mem::size_of::<Stake>(),
        bump
    )]
    pub stake: Account<'info, Stake>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = staker
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = staker,
        seeds = [
            stake.key().as_ref(),
        ],
        token::mint = token_mint,
        token::authority = stake,
        bump
    )]
    pub stake_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}