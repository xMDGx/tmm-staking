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

    pub fn deposit(ctx: Context<DepositStake>, habit_id: u64, amount: u64) -> Result<()> {
        instructions::deposit_funds(ctx, habit_id, amount).ok();
        Ok(())
    }

    pub fn withdraw(ctx: Context<WithdrawStake>) -> Result<()> {
        instructions::withdraw_funds(ctx).ok();
        Ok(())
    }
}