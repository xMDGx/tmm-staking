'use client';

import { NextPage } from "next"
import { useCallback, useState } from "react"
import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@/components/Wallet";

import { Program, AnchorProvider, web3, utils, BN } from "@coral-xyz/anchor";
import idl from "../../tmm_staking.json";
import { PublicKey, Signer } from "@solana/web3.js";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

const Home: NextPage = () => {
  var [habitId, setHabitId] = useState(new BN(0));
  var [depositAmount, setDepositAmount] = useState(new BN(0));
  var [withdrawalAmount, setWithdrawalAmount] = useState(0);

  const { connection } = useConnection();
  const myWallet = useWallet();
  const myAnchorWallet = useAnchorWallet();

  const stakeSeed = anchor.utils.bytes.utf8.encode("STAKE_SEED");
  const stakeTokenSeed = anchor.utils.bytes.utf8.encode("STAKE_TOKEN_SEED");

  const usdcMintKey = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  const getProvider = () => {
    if (!myAnchorWallet) { return; }

    // Need to use AnchorProvider from @coral-xyz/anchor instead of anchor.AnchorProvider
    // for some reason, otherwise it bugs out with new Program down below.
    const provider = new AnchorProvider(connection, myAnchorWallet, AnchorProvider.defaultOptions());

    // THIS DOES NOT WORK WITH myWallet.
    // if (!myWallet?.wallet) { return; }
    // const provider2 = new anchor.AnchorProvider(connection, myWallet, anchor.AnchorProvider.defaultOptions());

    return provider;
  }

  const submitDeposit = async () => {
    try {
      const provider = getProvider();

      if (!provider || !myAnchorWallet || !myWallet) { return; }

      const program = new Program(idl_object, programID, provider);

      const [stakeKey] = PublicKey.findProgramAddressSync(
        [stakeSeed, habitId.toArrayLike(Buffer, "le", 8), provider.wallet.publicKey.toBuffer()],
        program.programId
      );
      const [stakeTokenKey] = PublicKey.findProgramAddressSync(
        [stakeTokenSeed, stakeKey.toBuffer()],
        program.programId
      );

      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        provider.wallet.publicKey,
        usdcMintKey,
        myAnchorWallet.publicKey,
        { commitment: "confirmed" }
      );

      await program.methods
        .deposit(habitId, depositAmount)
        .signers([provider.wallet])
        .accounts({
          signer: provider.wallet.publicKey,
          tokenMint: usdcMintKey,
          stake: stakeKey,
          stakeTokenAccount: stakeTokenKey,
          userTokenAccount: userTokenAccount.address,
        })
        .rpc({ commitment: "confirmed" });
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
      <label>Habit ID:</label>
      <input
        type="number"
        id="habit_id"
        name="habit_id"
        onChange={(e) => setHabitId(new BN(parseInt(e.target.value)))}
      />
      <br />
      <label>Deposit Amount (USDC):</label>
      <input
        type="number"
        id="deposit_amount"
        name="deposit_amount"
        onChange={(e) => setDepositAmount(new BN(parseInt(e.target.value)))}
      />
      <br />
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => { submitDeposit }}>
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
      <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => { submitWithdrawal }}>
        Withdraw
      </button>
    </div>
  )
};

export default Home;