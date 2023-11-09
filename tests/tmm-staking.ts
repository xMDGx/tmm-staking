import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TmmStaking } from "../target/types/tmm_staking";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { assert } from "chai";

describe("TMM-Staking", () => {
  // Configure the client to use the local cluster.  Do NOT use option
  // of { commitment: "confirmed" }. This will cause .fetch() methods to fail.
  const provider = anchor.AnchorProvider.local("http://localhost:8899");
  anchor.setProvider(provider);

  const program = anchor.workspace.TmmStaking as Program<TmmStaking>;

  const userKeyPair = Keypair.generate();

  // Reuse same keyPairs for testing address constraint validations.
  // tokenKeyPair will be USDC in production and tmmKeyPair will be
  // the TMM deposit/vault address.
  const tokenKeyPair = Keypair.fromSecretKey(new Uint8Array([
    170, 109, 209, 181, 95, 60, 175, 150, 129, 158, 40,
    8, 97, 34, 124, 143, 69, 204, 76, 152, 18, 100,
    237, 114, 95, 56, 110, 248, 81, 37, 121, 118, 14,
    60, 248, 84, 122, 12, 164, 63, 63, 52, 29, 218,
    54, 186, 99, 106, 226, 38, 42, 209, 85, 251, 169,
    60, 160, 94, 216, 168, 34, 101, 108, 63
  ]));
  const tmmKeyPair = Keypair.fromSecretKey(new Uint8Array([
    200, 109, 166, 2, 173, 23, 247, 101, 164, 231,
    26, 52, 240, 153, 99, 126, 129, 198, 104, 112,
    237, 70, 241, 104, 143, 176, 222, 143, 227, 180,
    240, 91, 147, 74, 127, 118, 190, 29, 206, 225,
    153, 28, 94, 129, 241, 145, 11, 150, 134, 205,
    221, 106, 171, 68, 218, 191, 77, 59, 153, 164,
    11, 4, 206, 107
  ]));

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");

  // Stake lock time of 10 seconds should match constants.rs file.
  const stakeLockTime = 10000;

  let habitId = new anchor.BN(123456789);
  let stakeAmount = new anchor.BN(7);
  let pct_completed = Math.random();

  let userTokenAccount;
  let tmmAccount;
  let tokenMint;

  let err = null;


  it("Setup Mint and Token Accounts", async () => {
    console.log("   ...starting airdrops");
    await airdrop(provider.connection, userKeyPair.publicKey);
    await airdrop(provider.connection, tokenKeyPair.publicKey);
    await airdrop(provider.connection, tmmKeyPair.publicKey);

    console.log("   ...creating token mint");
    tokenMint = await splToken.createMint(
      provider.connection,
      tokenKeyPair,
      tokenKeyPair.publicKey,
      null,
      9,
    );

    console.log("   ...creating user token account");
    userTokenAccount = await splToken.createAssociatedTokenAccount(
      provider.connection,
      userKeyPair,
      tokenMint,
      userKeyPair.publicKey,
      { commitment: 'confirmed' },
    );

    console.log("   ...creating TMM token account");
    tmmAccount = await splToken.createAssociatedTokenAccount(
      provider.connection,
      tmmKeyPair,
      tokenMint,
      tmmKeyPair.publicKey,
      { commitment: 'confirmed' },
    );

    console.log("   ...minting tokens to user token account");
    const mintTxn = await splToken.mintTo(
      provider.connection,
      userKeyPair,
      tokenMint,
      userTokenAccount,
      tokenKeyPair,
      100,
      [],
      { commitment: 'confirmed' },
    );
    await confirmTxn(provider.connection, mintTxn);
  });


  const [stakeKey] = PublicKey.findProgramAddressSync(
    [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), userKeyPair.publicKey.toBuffer()],
    program.programId
  );
  const [stakeTokenKey] = PublicKey.findProgramAddressSync(
    [stakeTokenSeed, stakeKey.toBuffer()],
    program.programId
  );


  it("Withdraw Fail: Deposit Not initialized", async () => {
    try {
      await program.methods
        .withdraw(pct_completed)
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
          tmmAccount: tmmAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    assert.strictEqual(
      "AccountNotInitialized",
      err?.error?.errorCode?.code,
      "Invalid error code returned for account not being initialized",
    )
  });


  it("Deposit Fail: Stake Amount is Zero", async () => {
    try {
      await program.methods
        .deposit(habitId, new anchor.BN(0))
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          tokenMint: tokenMint,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    assert.strictEqual(
      "AmountMustBeGreaterThanZero",
      err?.error?.errorCode?.code,
      "Invalid error code returned for stakeAmount of zero",
    )
  });


  it("Deposit Fail: HabitID is Zero", async () => {
    try {
      await program.methods
        .deposit(new anchor.BN(0), stakeAmount)
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          tokenMint: tokenMint,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    // While there is a constraint msg for habitID == 0, the error code returned is
    // because the habitID is used for the account seeds.
    assert.strictEqual(
      "ConstraintSeeds",
      err?.error?.errorCode?.code,
      "Invalid error code returned for habitID of zero",
    )
  });


  it("Deposit Success", async () => {
    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    await program.methods
      .deposit(habitId, stakeAmount)
      .signers([userKeyPair])
      .accounts({
        signer: userKeyPair.publicKey,
        tokenMint: tokenMint,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    const stakeData = await program.account.stake.fetch(stakeKey);
    const stakeTokenData = await splToken.getAccount(provider.connection, stakeTokenKey, "confirmed");
    const userAfter = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    assert.strictEqual(
      userAfter.amount.toString(),
      new anchor.BN(userBefore.amount.toString()).sub(stakeAmount).toString(),
      "UserAfter balance of " + userAfter.amount.toString() +
      " != UserBefore balance of " + userBefore.amount.toString() +
      " minus stakeAmount of " + stakeAmount.toString()
    );

    assert.strictEqual(
      stakeData.totalStake.toString() === stakeAmount.toString(),
      true,
      "TotalStake of " + stakeData.totalStake.toString() + " != stakeAmount of " + stakeAmount.toString()
    );

    assert.strictEqual(
      stakeTokenData.amount.toString(),
      stakeAmount.toString(),
      "StakeTokenData of " + stakeTokenData.amount.toString() + " != stakeAmount of " + stakeAmount.toString()
    );
  });


  it("Deposit Fail: Stake Exists Already", async () => {
    try {
      await program.methods
        .deposit(habitId, stakeAmount)
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          tokenMint: tokenMint,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    assert.isTrue(parseSolanaError(err?.logs, "already in use"));
  });


  // Run anchor tests using --features t1 so correct locked time is used.
  it("Withdraw Fail: Staking locked", async () => {
    try {
      await program.methods
        .withdraw(pct_completed)
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
          tmmAccount: tmmAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    console.log("   ...waiting " + stakeLockTime / 1000 + " seconds for withdraw");
    await new Promise(resolve => setTimeout(resolve, stakeLockTime));

    assert.strictEqual(
      "IsLocked",
      err?.error?.errorCode?.code,
      "Invalid error code returned for staking locked",
    )
  });


  it("Withdraw Fail: Percentage out of bounds", async () => {
    try {
      await program.methods
        .withdraw(1.5)
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
          tmmAccount: tmmAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    assert.strictEqual(
      "InvalidPercent",
      err?.error?.errorCode?.code,
      "Invalid error code returned for percentage out of bounds",
    )
  });


  it("Withdraw Fail: Invalid Signer", async () => {
    try {
      await program.methods
        .withdraw(pct_completed)
        .signers([tmmKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
          tmmAccount: tmmAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      // Doesn't return an error code, so check with custom error msg.
      err = "Invalid Signer Error";
    }

    assert.strictEqual(
      "Invalid Signer Error",
      err,
      "Invalid error code returned for invalid signer",
    )
  });


  it("Withdraw Fail: Invalid Signer Account", async () => {
    try {
      let sig = await program.methods
        .withdraw(pct_completed)
        .signers([userKeyPair])
        .accounts({
          signer: tmmKeyPair.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount,
          tmmAccount: tmmAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      // Doesn't return an error code, so check with custom error msg.
      err = "Invalid Signer Account Error";
    }

    assert.strictEqual(
      "Invalid Signer Account Error",
      err,
      "Invalid error code returned for invalid signer account",
    )
  });


  it("Withdraw Fail: Invalid User Token Account", async () => {
    try {
      await program.methods
        .withdraw(pct_completed)
        .signers([userKeyPair])
        .accounts({
          signer: userKeyPair.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: tmmAccount,
          tmmAccount: tmmAccount,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    assert.strictEqual(
      "ConstraintTokenOwner",
      err?.error?.errorCode?.code,
      "Invalid error code returned for invalid user token account",
    )
  });


  // it("Withdraw Fail: Invalid TMM Token Account", async () => {
  //   try {
  //     let sig = await program.methods
  //       .withdraw(pct_completed)
  //       .signers([userKeyPair])
  //       .accounts({
  //         signer: userKeyPair.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmAccount: randomTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });

  //     console.log("----------Success Invalid TMM Token Account----------");
  //     await provider.connection.getParsedTransaction(sig, "confirmed").then((res) => {
  //       console.log(res);
  //     });

  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //     console.log("----------ERROR for Invalid TMM Token Account----------");
  //     console.log(err?.error?.errorCode?.code,);
  //   }

  //   assert.strictEqual(
  //     "invalid tmm",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for invalid TMM token account",
  //   )
  // });


  it("Withdraw Success", async () => {
    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const tmmBefore = await splToken.getAccount(provider.connection, tmmAccount, "confirmed");

    await program.methods
      .withdraw(pct_completed)
      .signers([userKeyPair])
      .accounts({
        signer: userKeyPair.publicKey,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        tmmAccount: tmmAccount,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    const userAfter = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const tmmAfter = await splToken.getAccount(provider.connection, tmmAccount, "confirmed");

    const earnedAmount = Math.floor(pct_completed * stakeAmount.toNumber());
    const lostAmount = stakeAmount.toNumber() - earnedAmount;

    // Dealing with rounded integers and SPL token balances, so don't need to worry
    // about account for return of Rent.
    assert.strictEqual(
      Number(userAfter.amount),
      Number(userBefore.amount) + earnedAmount,
      "userAfter balance of " + userAfter.amount.toString() +
      " != than userBefore balance of " + userBefore.amount.toString() +
      " plus earnedAmount of " + earnedAmount.toString()
    );
    assert.strictEqual(
      Number(tmmAfter.amount),
      Number(tmmBefore.amount) + lostAmount,
      "tmmAfter balance of " + userAfter.amount.toString() +
      " != than tmmBefore balance of " + userBefore.amount.toString() +
      " plus lostAmount of " + lostAmount.toString()
    );
  });
});


// Wrapper function for confirming splToken transactions.
async function confirmTxn(connection: Connection, txn: any) {
  try {
    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txn,
    }, "confirmed");
  } catch (error) {
    console.log(error);
  }
};


// Function for requesting SOL airdrops.
async function airdrop(connection: Connection, address: PublicKey) {
  const txn = await connection.requestAirdrop(address, 10 * LAMPORTS_PER_SOL);
  await confirmTxn(connection, txn);
};


// Custom error handler for parsing Solana logs.
function parseSolanaError(logs: any, error: string): boolean {
  const match = logs?.filter(s => s.includes(error));
  return Boolean(match?.length);
}