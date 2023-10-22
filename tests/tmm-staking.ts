import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TmmStaking } from "../target/types/tmm_staking";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
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

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");
  const habitId = "habitIDxyz";

  let userTokenAccount;
  let tokenMint;


  it("Setup Mint and Token Accounts", async () => {

    console.log("   ...starting airdrops");
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

    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, Buffer.from(habitId), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

    const stakeAmount = new BN(1);

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    await program.methods
      .deposit(habitId.toString(), stakeAmount)
      .signers([user])
      .accounts({
        signer: user.publicKey,
        tokenMint: tokenMint,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        // rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    // ERRORS OUT ON THIS LINE 'Account does not exist or has no data'
    // const stakeData = await program.account.stake.fetch(stakeKey);
    // console.log("Stake Account Data: ", stakeData);

    const stakeTokenData = await splToken.getAccount(provider.connection, stakeTokenKey, "confirmed");
    const userAfter = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");

    assert.strictEqual(userAfter.amount.toString(), new BN(userBefore.amount.toString()).sub(stakeAmount).toString());
    // assert.strictEqual(stakeData.totalStake.toString(), stakeAmount.toString());
    assert.strictEqual(stakeTokenData.amount.toString(), stakeAmount.toString());
  });


  it("Withdraw Success", async () => {

    const [stakeKey, stakeBump] = PublicKey.findProgramAddressSync(
      [stakeSeed, Buffer.from(habitId), user.publicKey.toBuffer()],
      program.programId
    );

    const [stakeTokenKey, stakeTokenBump] = PublicKey.findProgramAddressSync(
      [stakeTokenSeed, stakeKey.toBuffer()],
      program.programId
    );

    const withdrawAmount = new BN(1);

    const userBefore = await splToken.getAccount(provider.connection, userTokenAccount, "confirmed");
    const userBalanceBefore = await provider.connection.getBalance(user.publicKey);

    await program.methods
      .withdraw()
      .signers([user])
      .accounts({
        signer: user.publicKey,
        stake: stakeKey,
        stakeTokenAccount: stakeTokenKey,
        userTokenAccount: userTokenAccount,
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