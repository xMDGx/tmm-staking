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

  const user = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const tmmAccount = Keypair.fromSecretKey(new Uint8Array([
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
  let tmmTokenAccount;
  let tokenMint;

  let err = null;

  it("Setup Mint and Token Accounts", async () => {
    console.log("   ...starting airdrops");
    await airdrop(provider.connection, mintAuthority.publicKey);
    await airdrop(provider.connection, user.publicKey);

    console.log("   ...creating token mint");
    tokenMint = await splToken.createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      9
    );

    console.log("   ...creating user token account");
    userTokenAccount = await splToken.createAssociatedTokenAccount(
      provider.connection,
      user,
      tokenMint,
      user.publicKey,
    );

    console.log("   ...creating TMM token account");
    tmmTokenAccount = await splToken.createAssociatedTokenAccount(
      provider.connection,
      mintAuthority,
      tokenMint,
      tmmAccount.publicKey,
      { commitment: 'confirmed' },
    );

    let tmm = await splToken.getAccount(provider.connection, tmmTokenAccount, "confirmed");
    let tmm2 = await provider.connection.getParsedAccountInfo(tmmTokenAccount, "confirmed");
    console.log("TMM: ");
    console.log(tmm);
    console.log("TMM2: ");
    console.log(tmm2);

    console.log("   ...minting tokens to user token account");
    const mintTxn = await splToken.mintTo(
      provider.connection,
      user,
      tokenMint,
      userTokenAccount,
      mintAuthority,
      100
    );

    await confirmTxn(provider.connection, mintTxn);
  });


  // Find/declare program accounts.
  const [stakeKey] = PublicKey.findProgramAddressSync(
    [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
    program.programId
  );
  const [stakeTokenKey] = PublicKey.findProgramAddressSync(
    [stakeTokenSeed, stakeKey.toBuffer()],
    program.programId
  );


  // it("Withdraw Fail: Not initialized", async () => {
  //   try {
  //     await program.methods
  //       .withdraw(pct_completed)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmTokenAccount: tmmTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   assert.strictEqual(
  //     "AccountNotInitialized",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for account not being initialized",
  //   )
  // });


  // it("Deposit Fail: Stake Amount is Zero", async () => {
  //   stakeAmount = new anchor.BN(0);

  //   try {
  //     await program.methods
  //       .deposit(habitId, stakeAmount)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         tokenMint: tokenMint,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   assert.strictEqual(
  //     "AmountMustBeGreaterThanZero",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for stakeAmount of zero",
  //   )
  // });


  // it("Deposit Fail: HabitID is Zero", async () => {
  //   habitId = new anchor.BN(0);
  //   stakeAmount = new anchor.BN(1);

  //   try {
  //     await program.methods
  //       .deposit(habitId, stakeAmount)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         tokenMint: tokenMint,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   // While there is a constraint for habitID > 0, the error code returned is
  //   // because the habitID is used for the account seeds.
  //   assert.strictEqual(
  //     "ConstraintSeeds",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for habitID of zero",
  //   )
  // });


  it("Deposit Success", async () => {
    habitId = new anchor.BN(123456789);
    stakeAmount = new anchor.BN(2);

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    await program.methods
      .deposit(habitId, stakeAmount)
      .signers([user])
      .accounts({
        signer: user.publicKey,
        tokenMint: tokenMint,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
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


  // it("Deposit Fail: Stake Exists Already", async () => {
  //   try {
  //     await program.methods
  //       .deposit(habitId, stakeAmount)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         tokenMint: tokenMint,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   assert.isTrue(parseSolanaError(err?.logs, "already in use"));
  // });


  // it("Withdraw Fail: Staking locked", async () => {
  //   try {
  //     await program.methods
  //       .withdraw(pct_completed)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmTokenAccount: tmmTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   console.log("   ...waiting " + stakeLockTime / 1000 + " seconds for withdraw");
  //   await new Promise(resolve => setTimeout(resolve, stakeLockTime));

  //   assert.strictEqual(
  //     "IsLocked",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for staking locked",
  //   )
  // });


  // it("Withdraw Fail: Percentage out of bounds", async () => {
  //   pct_completed = 1.1;

  //   try {
  //     await program.methods
  //       .withdraw(pct_completed)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmTokenAccount: tmmTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   assert.strictEqual(
  //     "InvalidPercent",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for percentage out of bounds",
  //   )
  // });


  // it("Withdraw Fail: Invalid Signer", async () => {
  //   pct_completed = Math.random();
  //   try {
  //     await program.methods
  //       .withdraw(pct_completed)
  //       .signers([randomAccount])
  //       .accounts({
  //         signer: user.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmTokenAccount: tmmTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     // Doesn't return an error code, so check with custom error msg.
  //     err = "Invalid Signer Error";
  //   }

  //   assert.strictEqual(
  //     "Invalid Signer Error",
  //     err,
  //     "Invalid error code returned for invalid signer",
  //   )
  // });


  // it("Withdraw Fail: Invalid Signer Account", async () => {
  //   try {
  //     let sig = await program.methods
  //       .withdraw(pct_completed)
  //       .signers([user])
  //       .accounts({
  //         signer: randomAccount.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmTokenAccount: tmmTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     // Doesn't return an error code, so check with custom error msg.
  //     err = "Invalid Signer Account Error";
  //   }

  //   assert.strictEqual(
  //     "Invalid Signer Account Error",
  //     err,
  //     "Invalid error code returned for invalid signer account",
  //   )
  // });


  // it("Withdraw Fail: Invalid User Token Account", async () => {
  //   try {
  //     await program.methods
  //       .withdraw(pct_completed)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: randomAccount.publicKey,
  //         tmmTokenAccount: tmmTokenAccount,
  //         tokenProgram: splToken.TOKEN_PROGRAM_ID,
  //       })
  //       .rpc({ commitment: "confirmed", skipPreflight: true });
  //   } catch (error) {
  //     err = error as anchor.AnchorError;
  //   }

  //   assert.strictEqual(
  //     "AccountNotInitialized",
  //     err?.error?.errorCode?.code,
  //     "Invalid error code returned for invalid user token account",
  //   )
  // });


  // it("Withdraw Fail: Invalid TMM Token Account", async () => {
  //   try {
  //     let sig = await program.methods
  //       .withdraw(pct_completed)
  //       .signers([user])
  //       .accounts({
  //         signer: user.publicKey,
  //         stake: stakeKey,
  //         stakeTokenAccount: stakeTokenKey,
  //         userTokenAccount: userTokenAccount,
  //         tmmTokenAccount: randomTokenAccount,
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

    await program.methods
      .withdraw(pct_completed)
      .signers([user])
      .accounts({
        signer: user.publicKey,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        tmmTokenAccount: tmmTokenAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    const userAfter = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    console.log("User Before: " + userBefore.amount.toString());
    console.log("User After: " + userAfter.amount.toString());

    // assert.strictEqual(userBalanceAfter.toString(), new BN(userBalanceBefore.toString()).add(withdrawAmount).toString());
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


// Custom error handler for Solana logs.
function parseSolanaError(logs: any, error: string): boolean {
  const match = logs?.filter(s => s.includes(error));
  return Boolean(match?.length);
}