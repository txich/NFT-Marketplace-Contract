// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace {

    uint fee = 5;
    address owner;
    uint public listingsNumber;

    mapping (uint => Listing) public listings;

    struct Listing {
        uint id;
        address nftContract;
        uint nftId;
        address seller;  
        uint price;       
        uint time;
        bool active;
    }


    event NewListing (
        uint indexed listingId, 
        address indexed nftContract, 
        uint nftId, 
        address seller, 
        uint price,
        uint time
    );

    event ListingCancelled (
        uint indexed listingId, 
        address indexed nftContract, 
        uint nftId, 
        address seller,
        uint price,
        uint time
    );

    event NftTransaction (
        uint indexed listingId,  
        address indexed nftContract, 
        uint nftId,
        address seller,
        address buyer,
        uint price,
        uint time
    );

    constructor (){
        owner = msg.sender;
    }

    function createListing(address _nftContract, uint _nftId, uint _price) public {

        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_nftId) == msg.sender, "You are not the owner");

        require(
        nft.getApproved(_nftId) == address(this) 
        || 
        nft.isApprovedForAll(msg.sender, address(this)),
        "Marketplace not approved to transfer this token"
        );

        listingsNumber++;
        
        listings[listingsNumber] = Listing({
            id: listingsNumber,
            nftContract: _nftContract,
            nftId: _nftId,
            seller: msg.sender,
            price: _price,
            time: block.timestamp,
            active: true
        });

        emit NewListing (listingsNumber, _nftContract, _nftId, msg.sender, _price, block.timestamp);
    }

    function cancelListing(uint _listingId) public {
        require(listings[_listingId].seller == msg.sender, "You are not the seller of this listing");
        require(listings[_listingId].active, "Listing is not active");
        
        listings[_listingId].active = false;
        
        emit ListingCancelled(
            _listingId,
            listings[_listingId].nftContract,
            listings[_listingId].nftId,
            msg.sender,
            listings[_listingId].price,
            block.timestamp
            );
    }

    function buyNft(uint _listingId) public payable  {
        require (msg.sender != listings[_listingId].seller);
        require (listings[_listingId].active, "Listing is not active");
        require(listings[_listingId].seller != address(0), "Listing does not exist");
        uint price = listings[_listingId].price;

        IERC721 nft = IERC721(listings[_listingId].nftContract);
        require(
            nft.getApproved(listings[_listingId].nftId) == address(this) 
            ||
            nft.isApprovedForAll(listings[_listingId].seller, address(this)),
            "Marketplace not approved to transfer this NFT"
        );


        require (msg.value >= price, "Not enough ETH sent!");
    
        IERC721(listings[_listingId].nftContract).safeTransferFrom(listings[_listingId].seller, msg.sender, listings[_listingId].nftId);

        listings[_listingId].active = false;

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        payable(listings[_listingId].seller).transfer((price * 100-fee)/100);
        
        emit NftTransaction(
            _listingId,
            listings[_listingId].nftContract,
            listings[_listingId].nftId,
            listings[_listingId].seller,
            msg.sender,
            price,
            block.timestamp
            );
    }

}
