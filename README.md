<div align="center">

# MDG Final Submission (Ackee School)
# TrickMyMind Staking Program
</div>

## Overview
Contains the Solana staking program for the TrickMyMind app.  Users use the TrickMyMind app to create new habits, and for each habit, have an activity that can be done daily.  With this staking program, users have the ability to put their money where their mouth is, and "bet" on themselves.  This serves as extra incentive to perform the activities needed to create the new habit.  To do this, users will stake a deposit for 30 days.  For every day that the user performs their habit activity, they earn 1/30th of their deposit.  At the end of 30 days, users can withdraw their **earned** funds.  Any remaining unearned funds are donated directly to TrickMyMind to cover business and development costs.

Notes:
The frontend for the final program will be Android/iOS mobile apps.  There will NOT be a website frontend.
For any environmental debugging, this project was built using WSL: Ubuntu environment in VSCode on Windows.

## Steps to Run Anchor Tests
1) Download repo.
2) Install dependancies.
3) Open repo in VSCode, and open a terminal.
4) May need to open the /tmm-staking/Anchor.toml file and verify the 'cluster' under '[provider]' section is set to Localnet (cluster = Localnet)
5) In terminal type 'cd tmm-staking'
6) In terminal run cargo and anchor builds if need to.
7) In terminal type 'anchor test -- --features t1' (Feature t1 adjusts the locked time for the stake to be 10 seconds instead of 30 days)

12 Tests should Pass and there will be a 10 second pause inbetween.

## Steps to Test UI Frontend (Devnet)
1) May need to open the /tmm-staking/Anchor.toml file and verify the 'cluster' under '[provider]' section is set to devnet (cluster = devnet)
2) In terminal type 'cd app'
3) In terminal type 'yarn dev'
4) Click open browser which should open the localhost browser and show a bare rather crude looking frontend.
  a. Connect Phantom wallet.  (Only Phantom works because I ran into an insane amount of debugging issues.)
  b. Input Habit ID (any integer).  This will be handled by the app, but is manual for testing.  REMEMBER your Habit ID.
  c. Input Deposit Amount USDC (any integer).  This will be validated in Anchor Accounts eventually, but for now the validation is in nextJs files.
  d. Click Deposit button which should trigger a Phantom transaction to deposit the USDC amount.
  e. After depositing funds, they will be locked for 1 minute as opposed to 30 days.  You can check your balance by clicking Check Balance Button
  f. Input a Percent Completed (decimal between 0 and 1).  This will be calculated by the app, but is mnaual for testing.
  g. Click Withdraw to receive your calculated funds.  Note that I have hardcoded in my devnet wallet for the TrickMyMind account wallet.  So any funds
     lost will be sent there.  So if you deposit 1 dollar, and withdraw using a percent of 0.8, then 80 cents will be withdrawn to your wallet and
     20 cents will be withdrawn to the TrickMyMind account wallet.

Note: there is one debug error you will get if you run 'yarn build' in that the compiler is not recognizing all of the ParsedAccount object.  The code
all works as expected though.

Also, error handling is not fully build, so you will need to check console logs if something doesn't work.  The only message you should potentially see
is the "IsLocked" message though.  Messages are logged to console, but nothing is set up in the UI.