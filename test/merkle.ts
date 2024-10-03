import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");
import { getProofAndRoot } from "../scripts/proofAndRoot";
import { BytesLike } from "ethers";

describe("TokenAirdropWithNFT", function () {
	async function deployFixture() {
		const owner = "0xdf9Cac83a015C4CE42F4F96673af2961f9888567";
		const claimer1 = "0xF22742F06e4F6d68A8d0B49b9F270bB56affAB38";
		const claimer2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
		await helpers.impersonateAccount(owner);
		await helpers.impersonateAccount(claimer1);
		await helpers.impersonateAccount(claimer2);
		const ownerSigner = await ethers.getSigner(owner);
		const claimer1Signer = await ethers.getSigner(claimer1);
		const claimer2Signer = await ethers.getSigner(claimer2);

		// Deploy Mira token
		const Mira = await ethers.getContractFactory("Mira");
		const miraToken = await Mira.deploy();
		await miraToken.waitForDeployment()

		// Deploy TokenAirdropWithNFT
		const { rootHash } = await getProofAndRoot();
		const TokenAirdropWithNFT = await ethers.getContractFactory(
			"TokenAirdropWithNFT"
		);
		const tokenAirdropWithNFT = await TokenAirdropWithNFT.deploy(miraToken, rootHash);
		await tokenAirdropWithNFT.waitForDeployment();

		return {
			miraToken,
			tokenAirdropWithNFT,
			ownerSigner,
			claimer1Signer,
			claimer2Signer,
		};
	}

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			const { miraToken, tokenAirdropWithNFT, ownerSigner } =
				await loadFixture(deployFixture);
			expect(await miraToken.owner()).to.equal(ownerSigner.address);
		});

		it("Should set the correct token address", async function () {
			const { miraToken, tokenAirdropWithNFT } = await loadFixture(
				deployFixture
			);
			expect(await tokenAirdropWithNFT.token()).to.equal(miraToken);
		});

		it("Should set the correct merkle root", async function () {
			const { tokenAirdropWithNFT } = await loadFixture(deployFixture);
			const { rootHash } = await getProofAndRoot();
			expect(await tokenAirdropWithNFT.merkleRoot()).to.equal(rootHash);
		});
	});

	describe("Claim", function () {
		it("Should claim Airdrop successfully", async function () {
			const { miraToken, tokenAirdropWithNFT, ownerSigner, claimer1Signer } =
				await loadFixture(deployFixture);
			const { proof } = await getProofAndRoot(claimer1Signer.address);
			const AirdropPool = ethers.parseUnits("10000", 18);
			await (miraToken
				.connect(ownerSigner) as any)
				.transfer(tokenAirdropWithNFT, AirdropPool);
			const claimedAmt = ethers.parseUnits("100", 18);

				await expect((tokenAirdropWithNFT.connect(claimer1Signer) as any).claim(proof))
					.to.emit(tokenAirdropWithNFT, "ClaimSucceful")
					.withArgs(claimer1Signer.address, claimedAmt);

			expect(await miraToken.balanceOf(claimer1Signer.address)).to.equal(
				claimedAmt
			);
		});

		it("Should not claim twice", async function () {
			const { miraToken, tokenAirdropWithNFT, ownerSigner, claimer1Signer } =
				await loadFixture(deployFixture);
			const { proof } = await getProofAndRoot(claimer1Signer.address);
			const AirdropPool = ethers.parseUnits("10000", 18);
			await miraToken
				.connect(ownerSigner)
				.transfer(tokenAirdropWithNFT, AirdropPool);

				await tokenAirdropWithNFT.connect(claimer1Signer).claim(proof);
				await expect(
					tokenAirdropWithNFT.connect(claimer1Signer).claim(proof)
				).to.be.revertedWith("Already claimed");
			
		});

		it("Should not claim with invalid proof", async function () {
			const { tokenAirdropWithNFT, claimer1Signer } = await loadFixture(
				deployFixture
			);
			const invalidProof = [ethers.ZeroHash];
			await expect(
				tokenAirdropWithNFT.connect(claimer1Signer).claim(invalidProof)
			).to.be.revertedWith("TokenAirdrop: Address is invalid for claim");
		});

		it("Should not claim without NFT", async function () {
			const { tokenAirdropWithNFT, claimer2Signer } = await loadFixture(
				deployFixture
			);
			const { proof } = await getProofAndRoot(claimer2Signer.address);

			await expect(
				tokenAirdropWithNFT.connect(claimer2Signer).claim(proof)
			).to.be.revertedWith("No NFT found");
		});

		it("Should not claim when contract has insufficient balance", async function () {
			const { tokenAirdropWithNFT, claimer1Signer } = await loadFixture(
				deployFixture
			);
			const { proof } = await getProofAndRoot(claimer1Signer.address);

				await expect(
					tokenAirdropWithNFT.connect(claimer1Signer).claim(proof)
				).to.be.revertedWith("insufficient contract balance");
			
		});
	});

	describe("canClaim", function () {
		it("Should return true for valid claimer", async function () {
			const { tokenAirdropWithNFT, claimer1Signer } = await loadFixture(
				deployFixture
			);
			const { proof } = await getProofAndRoot(claimer1Signer.address);

				expect(
					await tokenAirdropWithNFT.canClaim(claimer1Signer.address, proof)
				).to.be.true;
			
		});

		it("Should revert with right error for invalid claimer", async function () {
			const { tokenAirdropWithNFT, claimer2Signer } = await loadFixture(
				deployFixture
			);
			const { proof } = await getProofAndRoot(claimer2Signer.address);

			await expect(
				tokenAirdropWithNFT.connect(claimer2Signer).claim(proof)
			).to.be.revertedWith("No NFT found");
		});
	});

	describe("checkContractBalance", function () {
		it("Should return correct contract balance for owner", async function () {
			const { miraToken, tokenAirdropWithNFT, ownerSigner } =
				await loadFixture(deployFixture);
			const balance = ethers.parseUnits("1000", 18);
			await miraToken
				.connect(ownerSigner)
				.transfer(tokenAirdropWithNFT, balance);

			expect(
				await tokenAirdropWithNFT.connect(ownerSigner).checkContractBalance()
			).to.equal(balance);
		});

		it("Should revert for non-owner", async function () {
			const { tokenAirdropWithNFT, claimer1Signer } = await loadFixture(
				deployFixture
			);
			await expect(
				tokenAirdropWithNFT.connect(claimer1Signer).checkContractBalance()
			).to.be.revertedWith("Only owner can perform this action");
		});
	});

	describe("withdrawLeftOver", function () {
		it("Should allow owner to withdraw leftover tokens", async function () {
			const { miraToken, tokenAirdropWithNFT, ownerSigner } =
				await loadFixture(deployFixture);
			const balance = ethers.parseUnits("1000", 18);
			await miraToken
				.connect(ownerSigner)
				.transfer(tokenAirdropWithNFT, balance);

			await expect(
				tokenAirdropWithNFT.connect(ownerSigner).withdrawLeftOver()
			).to.changeTokenBalances(
				miraToken,
				[tokenAirdropWithNFT, ownerSigner.address],
				[-balance, balance]
			);
		});

		it("Should revert for non-owner", async function () {
			const { tokenAirdropWithNFT, claimer1Signer } = await loadFixture(
				deployFixture
			);
			await expect(
				tokenAirdropWithNFT.connect(claimer1Signer).withdrawLeftOver()
			).to.be.revertedWith("Only owner can perform this action");
		});

		it("Should revert when contract balance is zero", async function () {
			const { tokenAirdropWithNFT, ownerSigner } = await loadFixture(
				deployFixture
			);
			await expect(
				tokenAirdropWithNFT.connect(ownerSigner).withdrawLeftOver()
			).to.be.revertedWith("insufficient amount");
		});
	});
});
