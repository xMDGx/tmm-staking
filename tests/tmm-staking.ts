import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TmmStaking } from "../target/types/tmm_staking";
import { Connection, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";


describe("tmm-staking", () => {
  console.log("Starting test...");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://localhost:8899", "confirmed");

  const program = anchor.workspace.TmmStaking as Program<TmmStaking>;

  let mintKeyPair = anchor.web3.Keypair.generate();

  it("stake", async () => {
    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token")],
      program.programId,
    );

    await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey,
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info")],
      program.programId,
    );

    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey,
    );

    await mintTo(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      userTokenAccount.address,
      payer.payer,
      1000,
    );

    const txn = await program.methods
      .stake(new anchor.BN(1))
      .signers([payer.payer])
      .accounts({
        signer: payer.publicKey,
        stakeAccount: stakeAccount,
        stakeInfoAccount: stakeInfo,
        userTokenAccount: userTokenAccount.address,
        mint: mintKeyPair.publicKey,
      })
      .rpc();

    console.log("TxnHash: ", txn);

    // Fetch data from the account.
    // let accountData = await program.account.stakeInfo.fetch(stakeAccount.publicKey);
    // console.log('Total Staked: ', accountData.totalStake.toString());
  });
});
