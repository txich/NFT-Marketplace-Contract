import { ethers } from "hardhat";
import { expect } from "chai";
import { Marketplace, NFTC } from "../typechain-types";
import { Signer } from "ethers";
describe("NFTMarketplace", function () {
    let nftowner: any;
    let nftbuyer: any;
    let nftdeployer: any;
    let marketplaceowner: any;
    let nftc: NFTC;
    let marketplace: Marketplace;

    beforeEach(async function () {
    
        [nftowner, nftbuyer, nftdeployer, marketplaceowner] = await ethers.getSigners();
        const NFTCFactory = await ethers.getContractFactory("NFTC", nftdeployer);
        nftc = await NFTCFactory.deploy() as NFTC;
        await nftc.waitForDeployment();

        const MarketplaceFactory = await ethers.getContractFactory("Marketplace", marketplaceowner);
        marketplace = (await MarketplaceFactory.deploy()) as Marketplace;
        await marketplace.waitForDeployment();       
    });
});