import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";


describe("NFTMarketplace", function () {
    async function deploy() {
        const [markowner, nftseller, nftbuyer, nftdeployer, randwallet] = await ethers.getSigners();

        const Factory = await ethers.getContractFactory("Marketplace");
        const marketplace = await Factory.connect(markowner).deploy();
        await marketplace.waitForDeployment();

        const FactoryNft = await ethers.getContractFactory("NFTC");
        const nftc = await FactoryNft.connect(nftdeployer).deploy();
        await nftc.waitForDeployment();

        const FactoryReject = await ethers.getContractFactory("Reject");
        const reject = await FactoryReject.connect(randwallet).deploy();
        await reject.waitForDeployment();


        return{
            markowner,
            nftseller,
            nftbuyer,
            nftdeployer,
            randwallet,
            marketplace,
            nftc,
            reject
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

            expect(await marketplace.listingsNumber()).to.equal(1);
            expect(await marketplace.nftListed(nftc.target, 1)).to.equal(true);

            
            const listing = await marketplace.listings(1);
            expect(listing.nftContract).to.equal(nftc.target);
            expect(listing.nftId).to.equal(1);
            expect(listing.seller).to.equal(nftseller.address);
            expect(listing.price).to.equal(price);
            expect(listing.active).to.equal(true);
        });


        it("Should mint NFT and list it on the marketplace (setApprovalForAll)", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 1);
            expect(await nftc.ownerOf(1)).to.equal(nftseller.address);
            await nftc.connect(nftseller).setApprovalForAll(marketplace.target, true);

            const price = ethers.parseEther("1");

            const lis = await marketplace.connect(nftseller).createListing(nftc.target, 1, price)

            await lis.wait();

            await expect(lis).to.emit(marketplace, "NewListing").withArgs(
                1,
                nftc.target,
                1,
                nftseller.address,
                price,
                anyValue
            )
            

            expect(await marketplace.listingsNumber()).to.equal(1);
            expect(await marketplace.nftListed(nftc.target, 1)).to.equal(true);
            
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


        it ("Should allow listing an NFT that was previously listed and cancelled", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 5);
            await nftc.connect(nftseller).approve(marketplace.target, 5);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 5, price);
            await marketplace.connect(nftseller).cancelListing(1);

            // Now re-list the same NFT
            await expect(
                marketplace.connect(nftseller).createListing(nftc.target, 5, price)
            ).to.emit(marketplace, "NewListing").withArgs(
                2,
                nftc.target,
                5,
                nftseller.address,
                price,
                anyValue
            );

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

            expect(await marketplace.nftListed(nftc.target, 2)).to.equal(false);

            expect((await marketplace.listings(1)).active).to.equal(false);

        });


        
        it("Should buy NFT from the marketplace (setApprovalForAll)", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 2);
            await nftc.connect(nftseller).setApprovalForAll(marketplace.target, true);

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
            
            expect(await marketplace.nftListed(nftc.target, 2)).to.equal(false);

            expect((await marketplace.listings(1)).active).to.equal(false);

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

        it("Should refund excess ETH after buying an NFT", async function () {

            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 4);
            await nftc.connect(nftseller).approve(marketplace.target, 4);
            
            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 4, price);

            const initialBalance = await ethers.provider.getBalance(nftbuyer);

            const tx = await marketplace.connect(nftbuyer).buyNft(1, { value: ethers.parseEther("2") });

            await expect(tx)
            .to.emit(marketplace, "NftTransaction").withArgs(
                1,
                nftc.target,
                4,
                nftseller.address,
                nftbuyer.address,
                price,
                anyValue
            );

            await tx.wait();
            const finalBalance = await ethers.provider.getBalance(nftbuyer);

            await expect(tx).to.changeEtherBalance(nftbuyer, -price);
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

        it ("Shouldn't allow buying an NFT that has been cancelled", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 5);
            await nftc.connect(nftseller).approve(marketplace.target, 5);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 5, price);
            await marketplace.connect(nftseller).cancelListing(1);

            // Attempt to buy a cancelled NFT
            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: price })
            ).to.be.revertedWith("Listing is not active");
        });


        it("Shouldn't allow buying your own NFT", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 5);
            await nftc.connect(nftseller).approve(marketplace.target, 5);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 5, price);

            // Attempt to buy your own NFT
            await expect(
                marketplace.connect(nftseller).buyNft(1, { value: price })
            ).to.be.revertedWith("You cannot buy your own NFT");
        });

        it("Shouldn't sell an NFT that is not owned by the seller", async function () {
            const { marketplace, nftc, nftseller, randwallet, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 6);
            await nftc.connect(nftseller).approve(marketplace.target, 6);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 6, price);
            await nftc.connect(nftseller).transferFrom(nftseller.address, randwallet.address, 6);

            await nftc.connect(randwallet).approve(marketplace.target, 6);

        
            // Attempt to buy an NFT that is not owned by the seller
            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: price })
            ).to.be.revertedWith("Ownership error");
        });

        it("Shouldn't allow buying an NFT that is not approved for sale", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 7);
            await nftc.connect(nftseller).approve(marketplace.target, 7);
            // Not approving the marketplace for this NFT

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 7, price);

            await nftc.connect(nftseller).approve(ethers.ZeroAddress,7);

            // Attempt to buy an NFT that is not approved
            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: price })
            ).to.be.revertedWith("Marketplace not approved to transfer this NFT");
        });

        it("Shouldn't allow buying an NFT that is not approved for sale (setApprovalForAll)", async function () {
            const { marketplace, nftc, nftseller, nftbuyer } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 7);
            await nftc.connect(nftseller).setApprovalForAll(marketplace.target, true);
            // Not approving the marketplace for this NFT

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 7, price);

            await nftc.connect(nftseller).setApprovalForAll(marketplace.target, false) ;

            // Attempt to buy an NFT that is not approved
            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: price })
            ).to.be.revertedWith("Marketplace not approved to transfer this NFT");
        });

        it("Should revert the transaction if refund fails", async function () {
            const { marketplace, nftc, nftseller, nftbuyer, randwallet, reject } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 8);
            await nftc.connect(nftseller).approve(marketplace.target, 8);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 8, price);

            await expect(
            reject.connect(randwallet).callBuyNft(marketplace.target, 1, { value: ethers.parseEther("2") })
            ).to.be.revertedWith("Refund failed");

        });
        
        it("Should revert the tx if the transfer to seller fails", async function () {
            const { marketplace, nftc, nftseller, nftbuyer, randwallet, reject } = await loadFixture(deploy);

            await nftc.connect(randwallet).mint(randwallet.address, 9);
            await nftc.connect(randwallet).approve(marketplace.target, 9);

            const price = ethers.parseEther("1");

            await nftc.connect(randwallet).transferFrom(randwallet.address, reject.target, 9);

            await reject.connect(randwallet).callApprovalForAll(nftc.target, marketplace.target, true);

            await reject.connect(randwallet).callCreateListing(marketplace.target, nftc.target, 9, price);

            await expect(
                marketplace.connect(nftbuyer).buyNft(1, { value: price })
            ).to.be.revertedWith("Transfer failed");

        });


    });

    describe("NFT Listing Cancellation", function () {

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

        it("Shouldn't allow cancelling a listing that is not active", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 5);
            await nftc.connect(nftseller).approve(marketplace.target, 5);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 5, price);
            await marketplace.connect(nftseller).cancelListing(1);

            // Attempt to cancel an already cancelled listing
            await expect(
                marketplace.connect(nftseller).cancelListing(1)
            ).to.be.revertedWith("Listing is not active");
        });

        it("Shouldn't allow cancelling a listing by someone other than the seller", async function () {
            const { marketplace, nftc, nftseller, randwallet } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 6);
            await nftc.connect(nftseller).approve(marketplace.target, 6);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 6, price);

            // Attempt to cancel a listing by another address
            await expect(
                marketplace.connect(randwallet).cancelListing(1)
            ).to.be.revertedWith("You are not the seller of this listing");
        });

        it("Shouldn't allow cancelling a listing that does not exist", async function () {
            const { marketplace, nftc, nftseller } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 7);
            await nftc.connect(nftseller).approve(marketplace.target, 7);

            // Attempt to cancel a non-existent listing
            await expect(
                marketplace.connect(nftseller).cancelListing(999)
            ).to.be.revertedWith("Listing is not active");
        });

    });

    describe("Owner Functions", function () { 

        it("Should allow the owner to withdraw funds", async function () {
            const { marketplace, nftc, nftseller, nftbuyer, markowner } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 8);
            await nftc.connect(nftseller).approve(marketplace.target, 8);

            const price = ethers.parseEther("100");

            const initialBalance = await ethers.provider.getBalance(markowner.address);

            await marketplace.connect(nftseller).createListing(nftc.target, 8, price);
            const tx0 = await marketplace.connect(nftbuyer).buyNft(1, { value: price });

            await tx0.wait();
    
            const tx = await marketplace.connect(markowner).withdrawFees(ethers.parseEther("1"));

            expect(tx).to.emit(marketplace, "Withdraw").withArgs(
                markowner.address,
                ethers.parseEther("1"),
                anyValue
            );

            await tx.wait();

            await expect(tx).to.changeEtherBalance(markowner, ethers.parseEther("1"));
            
        });

        it("Shouldn't allow non-owners to withdraw funds", async function () {
            const { marketplace, nftc, nftseller, nftbuyer, randwallet } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 9);
            await nftc.connect(nftseller).approve(marketplace.target, 9);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 9, price);
            await marketplace.connect(nftbuyer).buyNft(1, { value: price });

            // Attempt to withdraw funds as a non-owner
            await expect(
                marketplace.connect(randwallet).withdrawFees(ethers.parseEther("1"))
            ).to.be.revertedWithCustomError;
        });


        it("Shouldn't allow withdrawing more than available funds", async function () {
            const { marketplace, nftc, nftseller, nftbuyer, markowner } = await loadFixture(deploy);

            await nftc.connect(nftseller).mint(nftseller.address, 10);
            await nftc.connect(nftseller).approve(marketplace.target, 10);

            const price = ethers.parseEther("1");

            await marketplace.connect(nftseller).createListing(nftc.target, 10, price);
            await marketplace.connect(nftbuyer).buyNft(1, { value: price });

            // Attempt to withdraw more than available funds
            await expect(
                marketplace.connect(markowner).withdrawFees(ethers.parseEther("2"))
            ).to.be.revertedWith("Not enough balance to withdraw");
        });


        it("Shouldn't allow withdrawing zero funds", async function () {
            const { marketplace, markowner } = await loadFixture(deploy);

            // Attempt to withdraw zero funds
            await expect(
                marketplace.connect(markowner).withdrawFees(0)
            ).to.be.revertedWith("Amount to withdraw must be greater than zero!");
        });


        it("Should allow the owner to change the fee percentage", async function () {
            const { marketplace, markowner } = await loadFixture(deploy);

            const initialFeePercentage = await marketplace.fee();
            const newFeePercentage = 10;

            await expect(
                marketplace.connect(markowner).changeFee(newFeePercentage)
            ).to.emit(marketplace, "FeeChanged").withArgs(
                initialFeePercentage,
                newFeePercentage,
                anyValue
            );

            await expect(await marketplace.fee()).to.equal(newFeePercentage);

        });


        it("Shouldn't allow non-owners to change the fee percentage", async function () {
            const { marketplace, randwallet } = await loadFixture(deploy);

            const newFeePercentage = 10;

            // Attempt to change the fee percentage as a non-owner
            await expect(
                marketplace.connect(randwallet).changeFee(newFeePercentage)
            ).to.be.revertedWithCustomError;
        });

        
        it("Shouldn't allow setting a fee percentage >50", async function () {
            const { marketplace, markowner } = await loadFixture(deploy);

            const newFeePercentage = 51;

            // Attempt to set a fee percentage greater than 50
            await expect(
                marketplace.connect(markowner).changeFee(newFeePercentage)
            ).to.be.revertedWith("Fee must be between 0 and 50");
        });

    });


});