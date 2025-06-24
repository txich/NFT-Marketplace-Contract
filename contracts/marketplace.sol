// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Marketplace is ReentrancyGuard, Ownable(msg.sender) {

    uint fee = 5;
    uint public listingsNumber;

    mapping (uint => Listing) public listings;
    mapping (address => mapping(uint => bool)) public nftListed; // nftContract => (nftId => isListed)

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

    function createListing(address _nftContract, uint _nftId, uint _price) public {
        
        require(_price > 0, "Price must be greater than 0");
        require(nftListed[_nftContract][_nftId] == false, "NFT already listed");
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_nftId) == msg.sender, "You are not the owner");

        require(
        nft.getApproved(_nftId) == address(this) 
        || 
        nft.isApprovedForAll(msg.sender, address(this)),
        "Marketplace not approved to transfer this token"
        );

        listingsNumber++;
        nftListed[_nftContract][_nftId] = true;
        
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
    
        Listing storage list = listings[_listingId];

        require(list.seller == msg.sender, "You are not the seller of this listing");
        require(list.active, "Listing is not active");
        

        list.active = false;
        nftListed[list.nftContract][list.nftId] = false;
        
        emit ListingCancelled(
            _listingId,
            list.nftContract,
            list.nftId,
            msg.sender,
            list.price,
            block.timestamp
            );
    }

    function buyNft(uint _listingId) public payable nonReentrant {

        Listing storage list = listings[_listingId];

        require (msg.sender != list.seller);
        require (list.active, "Listing is not active");
        require(list.seller != address(0), "Listing does not exist");
        uint price = list.price;

        IERC721 nft = IERC721(list.nftContract);
        require(
            nft.getApproved(list.nftId) == address(this) 
            ||
            nft.isApprovedForAll(list.seller, address(this)),
            "Marketplace not approved to transfer this NFT"
        );


        require (msg.value >= price, "Not enough ETH sent!");
    
        IERC721(list.nftContract).safeTransferFrom(list.seller, msg.sender, list.nftId);

        list.active = false;
        nftListed[list.nftContract][list.nftId] = false;

        if (msg.value > price) {
            (bool _sent, ) = payable(msg.sender).call{ value: msg.value - price}("");
            require (_sent, "Refund failed");
            
        }

        (bool sent, ) = payable(list.seller).call{value: ((price * 100-fee)/100)}("");
        require(sent, "Transfer failed");
        
        emit NftTransaction(
            _listingId,
            list.nftContract,
            list.nftId,
            list.seller,
            msg.sender,
            price,
            block.timestamp
            );
    }

    function changeFee(uint _newFee) public onlyOwner {
        fee = _newFee;
    }


    function withdrawFees(uint _value) public onlyOwner {
        require(_value != 0,"Amount to withdraw must be greater than zero!");
        (bool sent, ) = payable(msg.sender).call{ value: _value}("");
        require(sent, "Transfer failed");
    }

}