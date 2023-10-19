use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("2oXApx9k2sPsCdDbQRhbxwzQxm4nrVz3SXK1CorL1FhL");

#[program]
pub mod tmm_staking {
    use super::*;

    pub fn deposit(ctx: Context<Stake>, habit_id: String, amount: f64) -> Result<()> {
        instructions::deposit_funds(ctx, habit_id, amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Stake>, habit_id: String) -> Result<()> {
        // withdraw_funds(ctx, habit_id);
        Ok(())
    }
}