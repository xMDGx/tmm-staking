import { NextPage } from "next"
import { useState } from "react"

const Home: NextPage = () => {
  var [habitId, setHabitId] = useState(0);
  var [depositAmount, setDepositAmount] = useState(0);

  const submitDeposit = async () => {
    if (habitId <= 0 || depositAmount <= 0) {
      alert("Deposit amount must be greater than 0");
      return;
    }


  };

  return (
    <div>
      <br />
      <br />
      <h1>TrickMyMind Frontend UI Testing</h1>
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
      <label>USDC Deposit Amount:</label>
      <input
        type="number"
        id="deposit_amount"
        name="deposit_amount"
        onChange={(e) => setDepositAmount(parseInt(e.target.value))}
      />
      <button onClick={() => { submitDeposit }}>Deposit</button>
    </div>
  )
};

export default Home;