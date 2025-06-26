// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Reject {
    receive() external payable {
        revert();
    }
}