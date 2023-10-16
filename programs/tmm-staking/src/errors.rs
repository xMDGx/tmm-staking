use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
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