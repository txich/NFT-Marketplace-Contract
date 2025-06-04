// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace {

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
        uint price,
        uint time
    );

    constructor (){
        owner = msg.sender;
    }

    function createListing(uint listingId, address nftContract, uint nftId) public {
    }

    function cancelListing(uint listingId) public {
    }

    function buyNft(uint listingId) public {
    }

}
