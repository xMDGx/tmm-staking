use anchor_lang::prelude::*;

use crate::state::Stake;

pub fn withdraw_funds(ctx: Context<Stake>, habit_id: String) -> Result<()> {
    let stake = &mut ctx.accounts.stake_account;
    let stake_info = &mut ctx.accounts.stake_info_account;

    // Check onchain balance of lamports.
    // if **stake.to_account_info().lamports.borrow() == 0 {
    //     return Err(ErrorCode::NotEnoughTokens.into());
    // }
    Ok(())
}