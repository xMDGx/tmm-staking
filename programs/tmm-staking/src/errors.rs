use anchor_lang::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Staking exists already.")]
    IsStakedAlready,

    #[msg("Token is NOT USDC.")]
    NotUSDC,

    #[msg("Amount must be greater than 0.")]
    AmountMustBeGreaterThanZero,
    
    #[msg("Not enough USDC in wallet to stake.")]
    NotEnoughToStake,

    #[msg("Staking does not exist.")]
    NothingStaked,

    #[msg("Staking has NOT unlocked yet.")]
    IsLocked,
}