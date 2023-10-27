use anchor_lang::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Amount must be greater than 0.")]
    AmountMustBeGreaterThanZero,
    
    #[msg("Staking does not exist.")]
    NothingStaked,

    #[msg("Staking has NOT unlocked yet.")]
    IsLocked,

    #[msg("Number must be between 0 and 1.")]
    InvalidPercent,
}