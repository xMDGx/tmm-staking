use crate::state::*;
use crate::constants::{STAKE_SEED, STAKE_TOKEN_SEED, STAKE_LOCK_PERIOD};
use crate::errors::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{CloseAccount, close_account, Mint, Token, TokenAccount, Transfer, transfer},
};


pub fn withdraw_funds(ctx: Context<WithdrawStake>) -> Result<()> {
    let stake = &mut ctx.accounts.stake;
    let stake_unlock_time: i64 = stake.deposit_timestamp + STAKE_LOCK_PERIOD;

    let clock = Clock::get()?;

    // Check if staking does NOT exist.
    if stake.total_stake <= 0 {
        return Err(CustomError::NothingStaked.into());
    }

    // Check if staking has NOT unlocked yet.
    // if clock.unix_timestamp < stake_unlock_time {
    //     return Err(CustomError::IsLocked.into());
    // }

    // let lamports = ctx.accounts.stake_token_account.get_lamports();

    // Transfer staked funds back to the user.
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: stake.to_account_info()
            },
            &[&[
                STAKE_SEED.as_ref(),
                stake.habit_id.as_bytes().as_ref(),
                stake.owner.key().as_ref(),
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
                destination: ctx.accounts.signer.to_account_info(),
                authority: stake.to_account_info(),
            },
            &[&[
                STAKE_SEED.as_ref(),
                stake.habit_id.as_bytes().as_ref(),
                stake.owner.key().as_ref(),
                &[stake.bump],
            ]],
        ),
    )?;

    stake.total_stake = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    // Stake account.
    #[account(
        mut,
        close = signer,
        constraint = stake.owner == signer.key(),
        seeds = [
            STAKE_SEED.as_ref(),
            stake.habit_id.as_bytes().as_ref(),
            signer.key().as_ref()
        ],
        bump = stake.bump
    )]
    pub stake: Account<'info, Stake>,
    
    // Stake token account PDA.
    #[account(
        mut,
        close = signer,
        seeds = [
            STAKE_TOKEN_SEED.as_ref(),
            stake.key().as_ref()
        ],
        // token::mint = stake.mint,
        token::mint = token_mint,        
        token::authority = stake,
        bump = stake.stake_token_bump
    )]
    pub stake_token_account: Account<'info, TokenAccount>,

    // User's token account (wallet).
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = signer
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}