# NFT MARKETPLACE SMART CONTRACT

### Deploy-ready version 
### All functions were tested using HardHat.

## Functions:
- Create listing
- Cancel listing
- NFT purchase
- Change owner (Ownable)
- Withdraw from contract (Owner only)
- Change fee (Owner only)

All functions emit an event.

The NFT transfer is implemented using getApproved method.
Transactions are implemented using call method.
Added ReentrancyGuard & Ownable.


