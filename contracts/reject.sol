// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IMarketplace {
    function buyNft(uint listingId) external payable;
    function createListing(
        address nftContract,
        uint nftId,
        uint price
    ) external;
}   
interface INFTC {
    function setApprovalForAll(address to, bool approved) external;
}

contract Reject is IERC721Receiver {
    receive() external payable {
        revert();
    }

    function callBuyNft(address marketplace, uint listingId) public payable {
        IMarketplace(marketplace).buyNft{value: msg.value}(listingId);
    }

    function callCreateListing(
        address marketplace,
        address nftContract,
        uint nftId,
        uint price
    ) public {
        IMarketplace(marketplace).createListing(nftContract, nftId, price);
    }

    function callApprovalForAll(
        address nftContract,
        address to,
        bool approved
    ) public {
        INFTC(nftContract).setApprovalForAll(to, approved);
     
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }


}