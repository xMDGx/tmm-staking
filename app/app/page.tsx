'use client';

import { NextPage } from "next"
import { useState } from "react"
import { Wallet } from "@/components/Wallet";

const Home: NextPage = () => {
  var [habitId, setHabitId] = useState(0);
  var [depositAmount, setDepositAmount] = useState(0);
  var [withdrawalAmount, setWithdrawalAmount] = useState(0);

  const submitDeposit = async () => {

    return;
  };

  const submitWithdrawal = async () => {

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
        onChange={(e) => setHabitId(parseInt(e.target.value))}
      />
      <br />
      <label>Deposit Amount (USDC):</label>
      <input
        type="number"
        id="deposit_amount"
        name="deposit_amount"
        onChange={(e) => setDepositAmount(parseInt(e.target.value))}
      />
      <br />
      <button onClick={() => { submitDeposit }}>Deposit</button>
      <br />
      <br />
      <br />
      <p>
        User does activities for 30 days, then can withdraw.  For devnet, its 2 minutes instead of 30 days withdraw
        manual input of decimal percentage.
      </p>
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
      <button onClick={() => { submitWithdrawal }}>Withdraw</button>
    </div>
  )
};

export default Home;