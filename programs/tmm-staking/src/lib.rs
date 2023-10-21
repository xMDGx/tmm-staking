// Make the necessary modules public/useable.
pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;
use anchor_lang::prelude::*;


declare_id!("2oXApx9k2sPsCdDbQRhbxwzQxm4nrVz3SXK1CorL1FhL");

#[program]
pub mod tmm_staking {
    use super::*;

    pub fn deposit(ctx: Context<DepositStake>, habit_id: String, amount: u64) -> Result<()> {
        instructions::deposit_funds(ctx, habit_id, amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<WithdrawStake>, habit_id: String) -> Result<()> {
        instructions::withdraw_funds(ctx, habit_id);
        Ok(())
    }
}