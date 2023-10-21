use anchor_lang::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Amount must be greater than 0.")]
    AmountMustBeGreaterThanZero,
    
    #[msg("Not enough to stake.")]
    NotEnoughToStake,

    #[msg("Staking exists already.")]
    IsStakedAlready,

    #[msg("Staking does not exist.")]
    NothingStaked,

    #[msg("Staking has NOT unlocked yet.")]
    StakeLocked,

    #[msg("Not enough tokens to withdraw.")]
    NotEnoughWithdraw,
}