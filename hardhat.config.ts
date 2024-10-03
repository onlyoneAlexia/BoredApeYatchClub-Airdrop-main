
const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const config = {
  solidity: "0.8.23",
  networks: {
    // for testnet
    'lisk-sepolia': {
      url: 'https://rpc.sepolia-api.lisk.com',
      accounts: [process.env.ACCOUNT_PRIVATE_KEY],
      gasPrice: 1000000000,
    },
  },
};

module.exports = config;

//Mira Token waitForDeployment to: 0xe90548d2cA12bde28910a12B7D08A9ef514ECb33
//TokenAirdropWithNFT waitForDeployment to: 0xe3026B1FC223C3D6B11354FCc6599CCD5AB62BE6