use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer, transfer},
};
use solana_program::clock::Clock;

use crate::states::stake::Stake;
use crate::errors::ErrorCode;

declare_id!("2oXApx9k2sPsCdDbQRhbxwzQxm4nrVz3SXK1CorL1FhL");

#[program]
pub mod tmm_staking {
    use super::*;

    pub fn deposit(ctx: Context<Stake>, amount: f64) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;

        // Check if don't have any tokens to stake.
        if amount <= 0.0 {
            return Err(ErrorCode::NoTokens.into());
        }

        // Check if staking exists already.
        if stake_info.total_stake > 0.0 {
            return Err(ErrorCode::IsStakedAlready.into());
        }

        let clock = Clock::get()?;

        stake_info.stake_at_slot = clock.slot;
        // stake_info.earned_stake = 0 as f64;
        // stake_info.donated_stake = 0 as f64;
        // stake_info.target_days = 0;
        // stake_info.actual_days = 0;

        let total_stake = (amount)
            .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
            .unwrap();

        // transfer(
        //     CpiContext::new(
        //         ctx.accounts.token_program.to_account_info(),
        //         Transfer {
        //             from: ctx.accounts.user_token_account.to_account_info(),
        //             to: ctx.accounts.stake_account.to_account_info(),
        //             authority: ctx.accounts.signer.to_account_info()
        //         },
        //     ),
        //     total_stake,
        // )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Stake>) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        let stake_info = &mut ctx.accounts.stake_info_account;

        // Check onchain balance of lamports.
        // if **stake.to_account_info().lamports.borrow() == 0 {
        //     return Err(ErrorCode::NotEnoughTokens.into());
        // }
        Ok(())
    }
}