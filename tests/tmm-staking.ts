import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TmmStaking } from "../target/types/tmm_staking";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { BN } from "bn.js";

describe("TMM-Staking", () => {
  console.log("Starting Test...");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://localhost:8899", "confirmed");

  const userKeyPair = Keypair.generate();
  const usdcKeyPair = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const program = anchor.workspace.TmmStaking as Program<TmmStaking>;

  it("Deposit", async () => {
    //   console.log(connection);
    //   console.log(payer.payer);
    //   console.log("MintKeyPair: ", usdcKeyPair);
    //   console.log("Payer: ", payer.publicKey);

    // Get the user token account.
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      usdcKeyPair,
      payer.publicKey
    );

    // Mint tokens into the account so we can test staking.
    await mintTo(
      connection,
      payer.payer,
      usdcKeyPair,
      userTokenAccount.address,
      payer.payer,
      1000
    );

    console.log("UserTokenAccount: ", userTokenAccount);

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId
    );

    console.log("StakeAccount: ", stakeAccount);

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), payer.publicKey.toBuffer()],
      program.programId
    );

    console.log("StakeInfo: ", stakeInfo);

    await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      usdcKeyPair,
      payer.publicKey,
    );

    const txn = await program.methods
      .deposit("1", new anchor.BN(10))
      .signers([payer.payer])
      .accounts({
        signer: payer.publicKey,
        stakeAccount: stakeAccount,
        stakeInfoAccount: stakeInfo,
        userTokenAccount: userTokenAccount.address,
        mint: usdcKeyPair,
      })
      .rpc();

    console.log("TxnHash: ", txn);

    // Fetch data from the account.
    // let accountData = await program.account.stakeInfo.fetch(stakeAccount.publicKey);
    // console.log('Total Deposited: ', accountData.totalStake.toString());
  });


  it("TransferSPLTokens", async () => {
    // // Generate keypairs for the new accounts.
    // const fromKp = anchor.web3.Keypair.generate();
    // const toKp = new anchor.web3.Keypair();

    // // Create a new mint and initialize it.
    // const mintKp = new anchor.web3.Keypair();
    // const mint = await createMint(
    //   connection,
    //   payer.payer,
    //   fromKp.publicKey,
    //   null,
    //   0
    // );

    // // Create associated toekn accounts for the new accounts.
    // const fromAta = await createAssociatedTokenAccount(
    //   connection,
    //   payer.payer,
    //   mint,
    //   fromKp.publicKey,
    // );

    // const toAta = await createAssociatedTokenAccount(
    //   connection,
    //   payer.payer,
    //   mint,
    //   toKp.publicKey,
    // );

    // // Mint tokens to the 'from' associated token account.
    // const mintAmount = 1000;
    // await mintTo(
    //   connection,
    //   payer.payer,
    //   mint,
    //   fromAta,
    //   payer.payer.publicKey,
    //   mintAmount,
    // );
  });
});
