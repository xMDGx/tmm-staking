use crate::state::*;
use crate::constants::{STAKE_SEED, STAKE_TOKEN_SEED, STAKE_LOCK_PERIOD, TMM_KEY};
use crate::errors::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{CloseAccount, close_account, Token, TokenAccount, Transfer, transfer},
};


pub fn withdraw_funds(ctx: Context<WithdrawStake>, pct_complete: f64) -> Result<()> {

    // if *ctx.accounts.tmm_account.to_account_info().key != TMM_KEY {
    //     panic!("owner {} and key {}", ctx.accounts.tmm_account.to_account_info().key, ctx.accounts.tmm_account.to_account_info().key);
    // }

    // Verify pct_complete is an integer between 0 and 1.
    require!(pct_complete >= 0.0 && pct_complete <= 1.0, CustomError::InvalidPercent);

    let stake = &mut ctx.accounts.stake;

    let clock = Clock::get()?;
    let stake_unlock_time: i64 = stake.deposit_timestamp + STAKE_LOCK_PERIOD;

    // Verify staking has unlocked.
    require!(clock.unix_timestamp >= stake_unlock_time, CustomError::IsLocked);

    // Calculate how much the user has earned vs how much goes to TrickMyMind.
    // Converting back to integer to keep transaction amounts cleaner.
    let earned_amount: u64 = (stake.total_stake as f64 * pct_complete).floor() as u64;
    let lost_amount: u64 = stake.total_stake - earned_amount;

    // Withdraw earned funds back to the user's wallet.
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: stake.to_account_info(),
            },
            &[&[
                STAKE_SEED.as_ref(),
                stake.habit_id.to_le_bytes().as_ref(),
                ctx.accounts.signer.key().as_ref(),
                &[stake.bump],
            ]],
        ),
        earned_amount,
    )?;

    // Withdraw remaining funds (lost) to TrickMyMind wallet.
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_token_account.to_account_info(),
                to: ctx.accounts.tmm_account.to_account_info(),
                authority: stake.to_account_info(),
            },
            &[&[
                STAKE_SEED.as_ref(),
                stake.habit_id.to_le_bytes().as_ref(),
                ctx.accounts.signer.key().as_ref(),
                &[stake.bump],
            ]],
        ),
        lost_amount,
    )?;

    // Close the stake token account.
    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.stake_token_account.to_account_info(),
                destination: ctx.accounts.signer.to_account_info(),
                authority: stake.to_account_info(),
            },
            &[&[
                STAKE_SEED.as_ref(),
                stake.habit_id.to_le_bytes().as_ref(),
                ctx.accounts.signer.key().as_ref(),
                &[stake.bump],
            ]],
        ),
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // Stake account.
    #[account(
        mut,
        close = signer,
        seeds = [
            STAKE_SEED.as_ref(),
            stake.habit_id.to_le_bytes().as_ref(),
            signer.key().as_ref(),
        ],
        bump = stake.bump,
    )]
    pub stake: Account<'info, Stake>,
    
    // Stake token account PDA.
    #[account(
        mut,
        seeds = [
            STAKE_TOKEN_SEED.as_ref(),
            stake.key().as_ref(),
        ],
        token::mint = stake.mint,
        token::authority = stake,
        bump = stake.stake_token_bump,
    )]
    pub stake_token_account: Account<'info, TokenAccount>,

    // User's token account.
    #[account(
        mut,
        associated_token::mint = stake.mint,
        associated_token::authority = signer,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // TrickMyMind token account.
    #[account(
        mut,
        // constraint = tmm_account.key() == TMM_KEY.key(),
        // associated_token::mint = stake.mint,
        // associated_token::authority = tmm_account,
    )]
    pub tmm_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}