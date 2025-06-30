# NFT Marketplace Smart Contract

## Description

This repository contains the main smart contract (`Marketplace.sol`) for an ERC721 NFT marketplace. The contract enables listing, buying, and delisting of NFTs from external ERC721 collections. **Note:** Auxiliary contracts (ERC721, Reject) found in this repository are provided only for testing purposes and are not part of the production logic.

## Features

- **Listing NFTs:** NFT owners can list tokens from any ERC721 contract with a chosen price.
- **Buying NFTs:** Anyone can buy a listed NFT by sending the required payment.
- **Canceling Listings:** NFT owners can remove their NFTs from sale before they are purchased.
- **Payouts:** The sale proceeds are automatically transferred to the seller when a token is purchased.
- **Lot Management:** The contract tracks active listings, owners, prices, and status.

> **Test contracts (`ERC721`, `Reject`) are not used in production. Only `Marketplace.sol` is relevant for integration.**

## Technology Stack

- **Solidity** — main marketplace logic
- **TypeScript** — scripts, tests, deployment tools
- (Recommended: Hardhat or Truffle for development and testing)

## Quick Start

### Installation

```bash
git clone https://github.com/txich/NFT-Marketplace-Contract.git
cd NFT-Marketplace-Contract
npm install
```

### Deployment

1. Configure your network and wallet in the config (e.g., `hardhat.config.ts`).
2. Deploy the contract following these steps:
    
    Start a local node
    ```bash
    npx hardhat node
    ```
    Open a new terminal and deploy the Hardhat Ignition module in the localhost network
    ```bash
    npx hardhat ignition deploy ./ignition/modules/Marketplace.ts --network localhost
    ```

### Running Tests

```bash
npx hardhat test
```

## Usage

Interact with the smart contract using its public functions. Integrate it with your dApp frontend or scripts by importing the contract ABI and using the deployed address.

## Security

- The marketplace never mints NFTs; it only facilitates trading for external ERC721 collections.
- Contract does not store user funds or NFTs except temporarily during transfers.
- Code audit is recommended before deploying to production.

## License

MIT License. See [LICENSE](LICENSE).

## Contact

For questions or support, please open an issue or contact the repository owner.

---

> **Note:** Only the `Marketplace.sol` contract is required for integration. Auxiliary contracts in the repo are for testing only.
