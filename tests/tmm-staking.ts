import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TmmStaking } from "../target/types/tmm_staking";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { BN } from "bn.js";
import { assert } from "chai";

describe("TMM-Staking", () => {

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local("http://localhost:8899", { commitment: "confirmed" });
  anchor.setProvider(provider);

  const program = anchor.workspace.TmmStaking as Program<TmmStaking>;

  const user = Keypair.generate();
  const mint_authority = Keypair.generate();

  let userTokenAccount;
  let tokenMint;

  it("Setup Mint and Token Accounts", async () => {

    console.log("   ...starting airdrop");
    await airdrop(provider.connection, user.publicKey);
    await airdrop(provider.connection, mint_authority.publicKey);

    console.log("   ...creating token mint");
    tokenMint = await splToken.createMint(
      provider.connection,
      mint_authority,
      mint_authority.publicKey,
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

    console.log("   ...minting tokens");
    await splToken.mintTo(
      provider.connection,
      user,
      tokenMint,
      userTokenAccount,
      mint_authority,
      100
    );
  });


  it("Deposit Success", async () => {

    // const habitId = Uint8Array.from(("habit_id_hash").split("").map((x) => x.charCodeAt(0)));
    // const habitId = Buffer.from("habit_id_hash");
    const habitId = new TextEncoder().encode("habit_id_hash");

    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [
        habitId,
        user.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [
        stakeKey.toBuffer(),
      ],
      program.programId
    );

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const stakeAmount = new BN(1);

    await program.methods
      .deposit("habit_id_hash", stakeAmount)
      .signers([user])
      .accounts({
        staker: user.publicKey,
        tokenMint: tokenMint,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    // const stakeData = await program.account.stake.fetch(stakeKey);
    const stakeTokenData = await splToken.getAccount(provider.connection, stakeTokenKey, "confirmed");
    const userAfter = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    // console.log("Stake Account Data:");
    // console.log(stakeData);

    assert.strictEqual(userAfter.amount.toString(), new BN(userBefore.amount.toString()).sub(stakeAmount).toString());
    // assert.strictEqual(stakeData.totalStake.toString(), stakeAmount.toString());
    assert.strictEqual(stakeTokenData.amount.toString(), stakeAmount.toString());
  });


  it("Withdraw Success", async () => {

    const habitId = new TextEncoder().encode("habit_id_hash");

    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [
        habitId,
        user.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [
        stakeKey.toBuffer(),
      ],
      program.programId
    );

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const userBalanceBefore = await provider.connection.getBalance(user.publicKey);

    const withdrawAmount = new BN(1);

    await program.methods
      .withdraw("habit_id_hash")
      .signers([user])
      .accounts({
        staker: user.publicKey,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    const userBalanceAfter = await provider.connection.getBalance(user.publicKey);

    assert.strictEqual(userBalanceAfter.toString(), new BN(userBalanceBefore.toString()).add(withdrawAmount).toString());
  });
});


async function airdrop(connection: Connection, address: PublicKey) {
  try {
    const latestBlockHash = await connection.getLatestBlockhash();
    const signature = await connection.requestAirdrop(address, 10000000000);

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });
  } catch (error) {
    console.log(error);
  }
}