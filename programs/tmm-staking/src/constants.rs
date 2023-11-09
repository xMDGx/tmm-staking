use solana_program::{
  pubkey,
  pubkey::Pubkey,
};

pub const STAKE_SEED: &[u8] = b"STAKE_SEED";
pub const STAKE_TOKEN_SEED: &[u8] = b"STAKE_TOKEN_SEED";

// Calculate the lock period for staking depending on runtime feature.
// Lock period data type should match clock.unix_timestamp data type.
pub const STAKE_LOCK_PERIOD: i64 = get_lock_period();

#[cfg(feature = "t1")]
const fn get_lock_period() -> i64 {return 10;} // 10 seconds
#[cfg(not(feature = "t1"))]
const fn get_lock_period() -> i64 {return 60 * 60 * 24 * 30;} // 30 days


// Get the TMM account key depending on runtime feature.
// Testing pubkey must match secret key in test ts file.
pub const TMM_KEY: Pubkey = get_tmm_key();

#[cfg(feature = "t1")]
const fn get_tmm_key() -> Pubkey {return pubkey!("AuxpSQP7A9MoXVcNqddyzy8S2XA7iNetPnAMBdM8vdEr");}
#[cfg(not(feature = "t1"))]
const fn get_tmm_key() -> Pubkey {return pubkey!("DhoMkFE2gGqWVoJhVcgA25zEJxqNC9BZkn3pzF4Pd9ww");}


// Get the USDC key depending on runtime feature.
// Mainnet / Devnet / Local.
pub const USDC_KEY: Pubkey = get_usdc_key();

#[cfg(feature = "t1")]
const fn get_usdc_key() -> Pubkey {return pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");}
#[cfg(not(feature = "t1"))]
// Devnet
// const fn get_usdc_key() -> Pubkey {return pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");}
//Mainnet
const fn get_usdc_key() -> Pubkey {return pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");}