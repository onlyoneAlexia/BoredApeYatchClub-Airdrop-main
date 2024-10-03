// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Mira is ERC20("Mira Token", "Mri") {
   address public owner;
   address public allowedContract;

   constructor() {
       owner = msg.sender;
       _mint(msg.sender, 100000000e18);
   }

}
