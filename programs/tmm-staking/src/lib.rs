use anchor_lang::prelude::*;

mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("2oXApx9k2sPsCdDbQRhbxwzQxm4nrVz3SXK1CorL1FhL");

#[program]
pub mod tmm_staking {
    use super::*;

    pub fn deposit(ctx: Context<Stake>, habit_id: String, amount: f64) -> Result<()> {
        // deposit_funds::deposit_funds(ctx, habit_id, amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Stake>, habit_id: String) -> Result<()> {
        // withdraw_funds(ctx, habit_id);
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than 0.")]
    AmountMustBeGreaterThanZero,
    
    #[msg("No tokens to stake.")]
    NoTokens,

    #[msg("Staking exists already.")]
    IsStakedAlready,

    #[msg("Staking does not exist.")]
    NothingStaked,

    #[msg("Staking has NOT unlocked yet.")]
    StakeLocked,

    #[msg("Not enough tokens to withdraw.")]
    NotEnoughWithdraw,
}