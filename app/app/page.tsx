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
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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
  var [balance, setBalances] = useState(0);
  var [withdrawalPercent, setWithdrawalPercent] = useState(0);

  const { connection } = useConnection();
  const solanaWallet = useWallet() as SolanaWallet;
  // const myWallet = useWallet();
  // const myAnchorWallet = useAnchorWallet();

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");

  const usdcMintKey = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const tmmKey = new PublicKey("DhoMkFE2gGqWVoJhVcgA25zEJxqNC9BZkn3pzF4Pd9ww");

  const getProvider = () => {
    // if (!myAnchorWallet) throw new Error("Wallet not connected");
    // const provider = new anchor.AnchorProvider(connection, myAnchorWallet, anchor.AnchorProvider.defaultOptions());
    // const provider = new anchor.AnchorProvider(connection, myWallet, anchor.AnchorProvider.defaultOptions());

    const provider = new anchor.AnchorProvider(connection, solanaWallet, anchor.AnchorProvider.defaultOptions());
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

      const userTokenAccount = await getOrCreateATA(provider, provider.wallet.publicKey);

      // const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      //   connection,
      //   provider.wallet,
      //   usdcMintKey,
      //   solanaWallet.publicKey,
      //   { commitment: "confirmed" }
      // );
      // console.log("User Token Account: " + userTokenAccount);

      let mint = await connection.getParsedAccountInfo(usdcMintKey);

      let depositTxnAmount = depositAmount.mul(new anchor.BN(10).pow(new anchor.BN(mint.value?.data?.parsed?.info?.decimals)));
      setDepositAmount(depositTxnAmount);

      await program.methods
        .deposit(habitId, depositTxnAmount)
        .accounts({
          signer: provider.wallet.publicKey,
          tokenMint: usdcMintKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount.address,
        })
        .rpc({ commitment: "confirmed" });

      console.log("Deposit successful: " + depositTxnAmount);
    } catch (error) {
      console.log("Deposit failed: " + depositAmount);
      console.log(error);
    }

    return;
  };


  const submitWithdrawal = async () => {
    console.log("Submitting withdrawal...");

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

      const userTokenAccount = await getOrCreateATA(provider, provider.wallet.publicKey);
      const tmmTokenAccount = await getOrCreateATA(provider, tmmKey);

      await program.methods
        .withdraw(withdrawalPercent)
        .accounts({
          signer: provider.wallet.publicKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount.address,
          tmmAccount: tmmTokenAccount.address,
        })
        .rpc({ commitment: "confirmed" });

      console.log("Withdrawal successful: " + withdrawalPercent);
    } catch (err) {
      console.log("Withdrawal failed: " + withdrawalPercent);
      console.log(err);
    }
    return;
  };


  const getDepositBalance = async () => {
    setBalances(0);
    console.log("Getting deposit balance...")

    const provider = getProvider();

    const program = new anchor.Program(idl_object, programID, provider);

    const [stakeKey] = PublicKey.findProgramAddressSync(
      [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      const stakeData = await program.account.stake.fetch(stakeKey);
      setBalances(stakeData.totalStake);
    } catch (err) {
      // Do nothing.
    }

    return;
  };


  const getOrCreateATA = async (
    provider: anchor.AnchorProvider,
    ownerKey: PublicKey,
  ) => {
    const associatedToken = getAssociatedTokenAddressSync(
      usdcMintKey,
      ownerKey,
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
              ownerKey,
              usdcMintKey,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          )

          const {
            context: { slot: minContextSlot },
            value: { blockhash: lastValidBlockHeight },
          } = await connection.getLatestBlockhashAndContext();

          // Piggy backing off code that works, but doesn't make sense logically.  Using
          // SolanaWallet method to send transaction, because regular method has been
          // deprecated, and could not use Signer.
          const signature = await solanaWallet.sendTransaction(txn, connection, { minContextSlot });
          await connection.confirmTransaction(signature, "confirmed");

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
      <WalletMultiButton />
      <WalletDisconnectButton />
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
      {balance.toString()}
      <br />
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={getDepositBalance}>
        Check Balance
      </button>
      <br />
      <br />
      <br />
      {withdrawalPercent.toString()}
      <br />
      <label>Percent Completed (decimal):</label>
      <input
        type="number"
        id="withdrawal_percent"
        name="withdrawal_percent"
        min="0"
        max="1"
        onChange={(e) => setWithdrawalPercent(Number(e.target.value))}
      />
      <br />
      <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={submitWithdrawal}>
        Withdraw
      </button>
    </div>
  )
};

export default Home;