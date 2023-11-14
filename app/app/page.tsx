'use client';

import { NextPage } from "next"
import { useState } from "react"
import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@/components/Wallet";

import { PublicKey, SendTransactionError, Signer, Transaction, sendAndConfirmTransaction, TransactionConfirmationStrategy } from "@solana/web3.js";
import { WalletContextState, useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";

import {
  getAccount,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID, Account,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from "@solana/spl-token";

import idl from "../../tmm_staking.json";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);


type SolanaWallet = WalletContextState & {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
};


const Home: NextPage = () => {
  var [habitId, setHabitId] = useState(new anchor.BN(0));
  var [depositAmount, setDepositAmount] = useState(new anchor.BN(0));
  var [withdrawalAmount, setWithdrawalAmount] = useState(0);

  const { connection } = useConnection();
  const solanaWallet = useWallet() as SolanaWallet;
  // const myWallet = useWallet();
  const myAnchorWallet = useAnchorWallet();

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");

  const usdcMintKey = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  const getProvider = () => {
    // if (!myAnchorWallet) throw new Error("Wallet not connected");
    // const provider = new anchor.AnchorProvider(connection, myAnchorWallet, anchor.AnchorProvider.defaultOptions());
    // const provider = new anchor.AnchorProvider(connection, myWallet, anchor.AnchorProvider.defaultOptions());

    console.log("Solana Wallet PKey: " + solanaWallet?.publicKey);

    const provider = new anchor.AnchorProvider(connection, solanaWallet, anchor.AnchorProvider.defaultOptions());
    console.log("Provider: " + provider);
    return provider;
  }

  const submitDeposit = async () => {
    console.log("Submitting deposit...");
    try {
      const provider = getProvider();

      const program = new anchor.Program(idl_object, programID, provider);

      const [stakeKey] = PublicKey.findProgramAddressSync(
        [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), provider.wallet.publicKey.toBuffer()],
        program.programId
      );
      const [stakeTokenKey] = PublicKey.findProgramAddressSync(
        [stakeTokenSeed, stakeKey.toBuffer()],
        program.programId
      );

      const userTokenAccount = await getOrCreateATA(provider);
      console.log("User Token Account: " + userTokenAccount);
      // const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      //   connection,
      //   provider.wallet,
      //   usdcMintKey,
      //   solanaWallet.publicKey,
      //   { commitment: "confirmed" }
      // );

      await program.methods
        .deposit(habitId, depositAmount)
        .accounts({
          signer: provider.wallet.publicKey,
          tokenMint: usdcMintKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount.address,
        })
        .rpc({ commitment: "confirmed" });

      console.log("Deposit successful: " + depositAmount);
    } catch (error) {
      console.log(error);
    }

    return;
  };

  const submitWithdrawal = async () => {
    try {

    } catch (err) {
      console.log(err);
    }
    return;
  };

  const getOrCreateATA = async (
    provider: anchor.AnchorProvider,
  ) => {

    const associatedToken = getAssociatedTokenAddressSync(
      usdcMintKey,
      provider.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let account: Account;

    try {
      account = await getAccount(connection, associatedToken, "confirmed", TOKEN_PROGRAM_ID);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
        try {
          const txn = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              provider.wallet.publicKey,
              associatedToken,
              provider.wallet.publicKey,
              usdcMintKey,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          )

          const {
            context: { slot: minContextSlot },
            value: { blockhash: lastValidBlockHeight },
          } = await connection.getLatestBlockhashAndContext();

          const signature = await solanaWallet.sendTransaction(txn, connection, { minContextSlot });
          await connection.confirmTransaction(signature, "confirmed");

          //BlockheightBasedTransactionConfirmationStrategy

          // const strategy = {
          //   abortSignal?: false,
          //   signature: signature,
          //   blockhash: blockhash,
          //   lastValidBlockHeight: lastValidBlockHeight,
          // } as new TransactionConfirmationStrategy;

          // await connection.confirmTransaction(strategy, "confirmed");

          // await sendAndConfirmTransaction(
          //   connection,
          //   txn,
          //   [provider.wallet],
          //   { commitment: "confirmed" }
          // );
        } catch (error: unknown) {
          // Ignoring all errors.
        }

        account = await getAccount(connection, associatedToken, "confirmed", TOKEN_PROGRAM_ID);
      } else {
        throw error;
      }
    }

    // if (!account.mint.equals(usdcMintKey)) throw new TokenInvalidMintError();
    // if (!account.owner.equals(provider.wallet.publicKey)) throw new TokenInvalidOwnerError();

    return account;
  };

  return (
    <div>
      <br />
      <br />
      <h1>TrickMyMind Frontend UI Testing</h1>
      <br />
      <br />
      <Wallet />
      <br />
      <br />
      {habitId.toString()}
      <br />
      {depositAmount.toString()}
      <br />
      <label>Habit ID:</label>
      <input
        type="number"
        id="habit_id"
        name="habit_id"
        onChange={(e) => setHabitId(new anchor.BN(parseInt(e.target.value)))}
      />
      <br />
      <label>Deposit Amount (USDC):</label>
      <input
        type="number"
        id="deposit_amount"
        name="deposit_amount"
        onChange={(e) => setDepositAmount(new anchor.BN(parseInt(e.target.value)))}
      />
      <br />
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={submitDeposit}>
        Deposit
      </button>
      <br />
      <br />
      <br />
      <div>
        Funds are locked for 30 days while user completes 30 days worth of activities/tasks. For Devnet, lock period is 1 minute.
      </div>
      <br />
      <br />
      <br />
      <label>Percent Completed (decimal):</label>
      <input
        type="number"
        id="withdrawal_amount"
        name="withdrawal_amount"
        min="0"
        max="1"
        onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
      />
      <br />
      <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={submitWithdrawal}>
        Withdraw
      </button>
    </div>
  )
};

export default Home;