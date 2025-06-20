# NFT MARKETPLACE SMART CONTRACT

### Deploy-ready version 
### (WAS NOT TESTED USING HARDHAT, DO NOT DEPLOY IN MAINNET, WAIT FOR FUTURE VERSIONS)
### The tests are currently under development.

## Functions:
- Create listing
- Cancel listing
- NFT purchase
- Change owner (owner only)
- Withdraw from contract (owner only)
- Change fee (owner only)

The NFT transfer is implemented using getApproved method.
Transactions are implemented using call method.
Added ReentrancyGuard.

