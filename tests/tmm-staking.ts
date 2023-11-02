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
  const tmmAccount = Keypair.generate();
  const mintAuthority = Keypair.generate();

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");

  let habitId = new anchor.BN(1234567890);
  let stakeAmount = new anchor.BN(1);

  let userTokenAccount;
  let tmmTokenAccount;
  let tokenMint;


  it("Setup Mint and Token Accounts", async () => {
    console.log("   ...starting airdrops");
    await airdrop(provider.connection, mintAuthority.publicKey);
    await airdrop(provider.connection, user.publicKey);
    await airdrop(provider.connection, tmmAccount.publicKey);

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
      tmmAccount,
      tokenMint,
      tmmAccount.publicKey,
    );

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


  it("Deposit Fail: Stake Amount is Zero", async () => {
    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

    stakeAmount = new anchor.BN(0);
    console.log("stakeAmount: " + stakeAmount.toString());
    let err = null;

    try {
      let sig = await program.methods
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
      console.log("---------- stake zero ----------");
      await provider.connection.getParsedTransaction(sig, "confirmed").then((res) => {
        console.log(res);
      });
    } catch (error) {
      err = error as anchor.AnchorError;
      console.log(err?.error?.errorCode?.code);
      console.log("----------");
      console.log(err);
    }
  });


  // it("Deposit Fail: HabitID is Zero", async () => {
  //   const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
  //     [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
  //     program.programId
  //   );

  //   const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
  //     [stakeTokenSeed, stakeKey.toBuffer()],
  //     program.programId
  //   );

  //   habitId = new anchor.BN(0);

  //   try {
  //     let response = await program.methods
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
  //     console.log("---------- habitID zero ----------");
  //     console.log(response);
  //   } catch (error) {
  //     const err = error as anchor.AnchorError;
  //     console.log(err.error.errorCode.code);
  //     console.log(err.error.errorMessage);
  //     // assert.strictEqual(error.toString().includes("Stake amount is zero"), true);
  //   }
  // });


  it("Deposit Success", async () => {
    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

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
      userAfter.amount.toString() === new anchor.BN(userBefore.amount.toString()).sub(stakeAmount).toString(),
      true,
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
      stakeTokenData.amount.toString() === stakeAmount.toString(),
      true,
      "StakeTokenData of " + stakeTokenData.amount.toString() + " != stakeAmount of " + stakeAmount.toString()
    );
  });


  it("Deposit Fail: Stake Exists Already", async () => {
    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

    let err = null;

    try {
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
    } catch (error) {
      err = error as anchor.AnchorError;
    }

    assert.isTrue(parseSolanaError(err?.logs, "already in use"));
  });


  it("Withdraw Success", async () => {
    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const userBalanceBefore = await provider.connection.getBalance(user.publicKey);

    const pct_completed = 0.75;

    await program.methods
      .withdraw(pct_completed)
      .signers([user])
      .accounts({
        signer: user.publicKey,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        tmmAccount: tmmTokenAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    const userBalanceAfter = await provider.connection.getBalance(user.publicKey);

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
  const txn = await connection.requestAirdrop(address, 3 * LAMPORTS_PER_SOL);
  await confirmTxn(connection, txn);
};


// Custom error handler for Solana logs.
function parseSolanaError(logs: any, error: string): boolean {
  const match = logs?.filter(s => s.includes(error));
  return Boolean(match?.length);
}