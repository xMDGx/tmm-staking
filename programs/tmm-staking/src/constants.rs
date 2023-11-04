pub const STAKE_SEED: &[u8] = b"STAKE_SEED";
pub const STAKE_TOKEN_SEED: &[u8] = b"STAKE_TOKEN_SEED";
pub const STAKE_LOCK_PERIOD: i64 = get_lock_period();

// Calculate the lock period for staking depending on runtime feature.
#[cfg(feature = "t1")]
const fn get_lock_period() -> i64 {return 20;} // 20 seconds
#[cfg(not(feature = "t1"))]
const fn get_lock_period() -> i64 {return 60 * 60 * 24 * 30;} // 30 days