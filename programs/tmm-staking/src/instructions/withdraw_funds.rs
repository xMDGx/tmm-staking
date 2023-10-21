use crate::state::*;
use crate::errors::CustomError;

use anchor_lang::prelude::*;


pub fn withdraw_funds(ctx: Context<WithdrawStake>, habit_id: String) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
#[instruction(habit_id: String)]
pub struct WithdrawStake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,
}