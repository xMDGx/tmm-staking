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
  const tmmAccount = Keypair.generate();

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");
  const habitId = new anchor.BN(1234567890);

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
    await splToken.mintTo(
      provider.connection,
      user,
      tokenMint,
      userTokenAccount,
      mintAuthority,
      100,
    );
  });


  it("Deposit Success", async () => {

    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

    const stakeAmount = new anchor.BN(1);

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

    console.log("   ...stakeData: ", stakeData);
    console.log("   ...stakeTokenData: ", stakeTokenData);
    console.log("   ...userBefore: ", userBefore);
    console.log("   ...userAfter: ", userAfter);

    assert.strictEqual(userAfter.amount.toString(), new anchor.BN(userBefore.amount.toString()).sub(stakeAmount).toString());
    assert.strictEqual(stakeData.totalStake.toString(), stakeAmount.toString());
    assert.strictEqual(stakeTokenData.amount.toString(), stakeAmount.toString());
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

    const pct_completed = 0.75;

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const userBalanceBefore = await provider.connection.getBalance(user.publicKey);

    await program.methods
      .withdraw(pct_completed)
      .signers([user])
      .accounts({
        signer: user.publicKey,
        tokenMint: tokenMint,
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


async function airdrop(connection: Connection, address: PublicKey) {
  try {
    const latestBlockHash = await connection.getLatestBlockhash();
    const signature = await connection.requestAirdrop(address, 1 * LAMPORTS_PER_SOL);

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });
  } catch (error) {
    console.log(error);
  }
}