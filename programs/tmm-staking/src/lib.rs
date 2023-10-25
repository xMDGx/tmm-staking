// Make the necessary modules public/useable.
pub mod instructions;
pub mod state;
pub mod constants;
pub mod errors;

use instructions::*;
use anchor_lang::prelude::*;


declare_id!("2oXApx9k2sPsCdDbQRhbxwzQxm4nrVz3SXK1CorL1FhL");

#[program]
pub mod tmm_staking {
    use super::*;

    /// Deposits USDC funds into a stake based on the user's habit where habit_id is a
    /// derived ID passed by the app backend.
    pub fn deposit(ctx: Context<DepositStake>, habit_id: u64, amount: u64) -> Result<()> {
        deposit_funds(ctx, habit_id, amount).ok();
        Ok(())
    }

    /// Withdraws USDC funds from the stake based on the percent of activities completed
    /// for the habit.
    pub fn withdraw(ctx: Context<WithdrawStake>, pct_complete: f32) -> Result<()> {
        withdraw_funds(ctx, pct_complete).ok();
        Ok(())
    }
}