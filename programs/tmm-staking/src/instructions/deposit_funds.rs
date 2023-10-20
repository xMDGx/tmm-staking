use crate::state::*;
use crate::errors::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Transfer, transfer},
};


pub fn deposit_funds(ctx: Context<Stake>, habit_id: String, amount: u64) -> Result<()> {
    // let deposit_amount = ctx.accounts.user_token_account.amount;
    // msg!("Deposit amount: {}", deposit_amount);
    // msg!("Deposit amount: {}", ctx.accounts.user_token_account.amount);

    let stake_info = &mut ctx.accounts.stake_info_account;

    // Check if don't have any tokens to stake.
    if amount <= 0 {
        return Err(CustomError::AmountMustBeGreaterThanZero.into());
    }

    // Check if staking exists already.
    if stake_info.total_stake > 0.0 {
        return Err(CustomError::IsStakedAlready.into());
    }

    let clock = Clock::get()?;

    stake_info.stake_at_slot = clock.slot;
    // stake_info.earned_stake = 0 as f64;
    // stake_info.donated_stake = 0 as f64;
    // stake_info.target_days = 0;
    // stake_info.actual_days = 0;

    let deposit_amount = (amount)
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
        deposit_amount,
    )?;

    Ok(())
}