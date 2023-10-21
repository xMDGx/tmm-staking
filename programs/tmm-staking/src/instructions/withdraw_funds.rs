use crate::state::*;
use crate::errors::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{CloseAccount, close_account, Token, TokenAccount, Transfer, transfer},
};


pub fn withdraw_funds(ctx: Context<WithdrawStake>, habit_id: String) -> Result<()> {
    let stake = &ctx.accounts.stake;
    const STAKE_LOCK: i64 = 60 * 60 * 24 * 30; // 30 days

    // Check if staking exists already.
    if stake.total_stake <= 0 {
        return Err(CustomError::NothingStaked.into());
    }

    // Check if staking has unlocked yet.
    let clock = Clock::get()?;
    let stake_unlock = stake.deposit_timestamp + STAKE_LOCK;
    
    if clock.unix_timestamp < stake_unlock {
        return Err(CustomError::StakeLocked.into());
    }

    // Check if user has enough tokens to withdraw.
    if ctx.accounts.stake_token_account.amount < 0 {
        return Err(CustomError::NotEnoughWithdraw.into());
    }

    // Transfer staked funds back to the user.
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.staker.to_account_info()
            },
            &[&[
                habit_id.as_bytes(),
                ctx.accounts.staker.key().as_ref(),
                &[stake.bump],
            ]],
        ),
        stake.total_stake,
    )?;

    // Close the stake token account.
    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.stake_token_account.to_account_info(),
                destination: ctx.accounts.staker.to_account_info(),
                authority: ctx.accounts.stake.to_account_info(),
            },
            &[&[
                habit_id.as_bytes(),
                ctx.accounts.staker.key().as_ref(),
                &[stake.bump],
            ]],
        ),
    )?;


    Ok(())
}

#[derive(Accounts)]
#[instruction(habit_id: String)]
pub struct WithdrawStake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        mut,
        close = staker,
        constraint = stake.authority == staker.key(),
        seeds = [
            habit_id.as_bytes(),
            staker.key().as_ref()
        ],
        bump = stake.bump
    )]
    pub stake: Account<'info, Stake>,
    
    #[account(
        mut,
        close = staker,
        seeds = [
            habit_id.as_bytes(),
            staker.key().as_ref()
        ],
        token::mint = stake.mint,
        token::authority = stake,
        bump = stake.stake_token_bump
    )]
    pub stake_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = stake.mint,
        associated_token::authority = staker
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}