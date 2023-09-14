import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TmmStaking } from "../target/types/tmm_staking";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { BN } from "bn.js";


describe("tmm-staking", () => {
  console.log("Starting test...");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://localhost:8899", "confirmed");
  // const mintKeyPair = Keypair.generate();
  // console.log(mintKeyPair);
  const mintKeyPair = Keypair.fromSecretKey(new Uint8Array([
    56, 200, 229, 175, 143, 28, 147, 120, 139, 118, 135,
    4, 43, 20, 243, 26, 39, 28, 85, 92, 131, 82,
    217, 189, 255, 73, 138, 125, 189, 99, 100, 162, 144,
    129, 205, 241, 182, 59, 50, 112, 55, 10, 247, 206,
    180, 213, 207, 173, 216, 153, 181, 98, 245, 121, 153,
    204, 42, 207, 159, 80, 90, 208, 161, 192
  ]));

  const program = anchor.workspace.TmmStaking as Program<TmmStaking>;

  async function createMintToken() {
    const mint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      payer.publicKey,
      9,
      mintKeyPair
    );

    console.log("Mint: ", mint);
    return mint;
  }

  it("Initialize", async () => {
    // await createMintToken();
  });


  it("Stake", async () => {
    // Get the user token account.
    console.log(connection);
    console.log(payer.payer);
    console.log("MintKeyPair: ", mintKeyPair.publicKey);
    console.log("Payer: ", payer.publicKey);

    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
    );

    // Mint tokens into the account so we can test staking.
    // await mintTo(
    //   connection,
    //   payer.payer,
    //   mintKeyPair.publicKey,
    //   userTokenAccount.address,
    //   payer.payer,
    //   1000
    // );

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

    // await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   payer.payer,
    //   mintKeyPair.publicKey,
    //   payer.publicKey,
    // );

    // const txn = await program.methods
    //   .stake(new anchor.BN(1))
    //   .signers([payer.payer])
    //   .accounts({
    //     signer: payer.publicKey,
    //     stakeAccount: stakeAccount,
    //     stakeInfoAccount: stakeInfo,
    //     userTokenAccount: userTokenAccount.address,
    //     mint: mintKeyPair.publicKey,
    //   })
    //   .rpc();

    // console.log("TxnHash: ", txn);

    // Fetch data from the account.
    // let accountData = await program.account.stakeInfo.fetch(stakeAccount.publicKey);
    // console.log('Total Staked: ', accountData.totalStake.toString());
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
