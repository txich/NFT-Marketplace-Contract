import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { Marketplace, NFTC } from "../typechain-types";
import { Signer } from "ethers";
import { any, bigint } from "hardhat/internal/core/params/argumentTypes";


describe("NFTMarketplace", function () {
    async function deploy() {
        const [markowner, nftseller, nftbuyer, nftdeployer, randwallet] = await ethers.getSigners();

        const Factory = await ethers.getContractFactory("Marketplace");
        const marketplace = await Factory.connect(markowner).deploy();
        await marketplace.waitForDeployment();

        const FactoryNft = await ethers.getContractFactory("NFTC");
        const nftc = await FactoryNft.connect(nftdeployer).deploy();
        await nftc.waitForDeployment();

        return{
            markowner,
            nftseller,
            nftbuyer,
            nftdeployer,
            randwallet,
            marketplace,
            nftc
        }
    }
    
    describe("Deployment", function () {

        it("Should deploy the Marketplace and NFT contract", async function () {
            const { marketplace, nftc, markowner} = await loadFixture(deploy);
            expect(marketplace.target).to.be.properAddress;
            expect(await marketplace.owner()).to.equal(markowner.address);
            expect(nftc.target).to.be.properAddress;

        });

    });

    describe("NFT Minting/Listing", function () {

        it("Should mint NFT and list it on the marketplace", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 1);
            expect(await nftc.ownerOf(1)).to.equal(nftseller.address);
            await nftc.connect(nftseller).approve(marketplace.target, 1);

            const price = ethers.parseEther("1");

            await expect(
                marketplace.connect(nftseller).createListing(nftc.target, 1, price)
            ).to.emit(marketplace, "NewListing").withArgs(
                1, 
                nftc.target,
                1,
                nftseller.address,
                price,
                anyValue
            );
            
            const listing = await marketplace.listings(1);
            expect(listing.nftContract).to.equal(nftc.target);
            expect(listing.nftId).to.equal(1);
            expect(listing.seller).to.equal(nftseller.address);
            expect(listing.price).to.equal(price);
            expect(listing.active).to.equal(true);
        });

        it("Shouldn't allow listing an NFT that is not owned", async function () {
            const { marketplace, nftc, nftseller, randwallet } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 2);
            await nftc.connect(nftseller).approve(marketplace.target, 2);

            const price = ethers.parseEther("1");

            // Attempt to list NFT owned by another address
            const anotherAddress = ethers.Wallet.createRandom().address;

            await expect(
                marketplace.connect(randwallet).createListing(nftc.target, 2, price)
            ).to.be.revertedWith("You are not the owner");

        });

        it ("Shouldn't allow listing an NFT that is not approved", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);
            await nftc.connect(nftseller).mint(nftseller.address, 3);
            const price = ethers.parseEther("1");
            // Attempt to list NFT without approving the marketplace
            await expect(
                marketplace.connect(nftseller).createListing(nftc.target, 3, price)
            ).to.be.revertedWith("Marketplace not approved to transfer this token");

        });

        it("Shouldn't allow listing an NFT that is already listed", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 3);
            await nftc.connect(nftseller).approve(marketplace.target, 3);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 3, price);

            // Attempt to list the same NFT again
            await expect(
                marketplace.connect(nftseller).createListing(nftc.target, 3, price)
            ).to.be.revertedWith("NFT already listed");
        });

        it ("Shouldn't allow listing an NFT with zero price", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 4);
            await nftc.connect(nftseller).approve(marketplace.target, 4);

            // Attempt to list NFT with zero price
            await expect(
                marketplace.connect(nftseller).createListing(nftc.target, 4, 0)
            ).to.be.revertedWith("Price must be greater than 0");
        
        });

    });

    describe("NFT Buying", function () {

        it("Should buy NFT from the marketplace", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 2);
            await nftc.connect(nftseller).approve(marketplace.target, 2);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 2, price);

            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: price })
            ).to.emit(marketplace, "NftTransaction").withArgs(
                1,
                nftc.target,
                2,
                nftseller.address,
                nftbuyer.address,
                price,
                anyValue
            );

            expect(await nftc.ownerOf(2)).to.equal(nftbuyer.address);
        });

        it("Shouldn't allow buying an NFT with insufficient funds", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 3);
            await nftc.connect(nftseller).approve(marketplace.target, 3);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 3, price);

            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: ethers.parseEther("0.5") })
            ).to.be.revertedWith("Not enough ETH sent!");
        });

        it("Shouldn't allow buying an NFT that is not listed", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 4);
            await nftc.connect(nftseller).approve(marketplace.target, 4);

            // Attempt to buy an NFT that is not listed
            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Listing is not active");
        });

    });

    it("Should cancel a listing", async function () {
        const { marketplace, nftc, nftseller } = await loadFixture(deploy);

        await nftc.connect(nftseller).mint(nftseller.address, 4);
        await nftc.connect(nftseller).approve(marketplace.target, 4);

        const price = ethers.parseEther("1");

        await marketplace.connect(nftseller).createListing(nftc.target, 4, price);

        await expect(
            marketplace.connect(nftseller).cancelListing(1)
        ).to.emit(marketplace, "ListingCancelled").withArgs(
            1,
            nftc.target,
            4,
            nftseller.address,
            price,
            anyValue
        );

        const listing = await marketplace.listings(1);
        expect(listing.active).to.equal(false);
    });


});