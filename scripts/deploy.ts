import { ethers } from "hardhat";
import { Mira, TokenAirdropWithNFT } from "../typechain-types";
import { getProofAndRoot } from "./proofAndRoot";

async function main() {
  const Mira = await ethers.getContractFactory("Mira");
  const miraToken = await Mira.deploy();
  await miraToken.waitForDeployment();

  const { rootHash } = await getProofAndRoot();
  const TokenAirdropWithNFT = await ethers.getContractFactory(
    "TokenAirdropWithNFT"
  );
  const tokenAirdropWithNFT = await TokenAirdropWithNFT.deploy(
    miraToken,
    rootHash
  );
  await tokenAirdropWithNFT.waitForDeployment();

  console.log("Mira Token waitForDeployment to:", miraToken.target);
  console.log("TokenAirdropWithNFT waitForDeployment to:", tokenAirdropWithNFT.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

