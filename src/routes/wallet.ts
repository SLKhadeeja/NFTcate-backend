import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { ethers } from "ethers";

const router = express.Router();

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

// Contract ABI (replace with your actual contract ABI)
const contractABI = [
  "function mintNFT(address recipient, string memory tokenURI) public returns (uint256)",
  "function addInstitution(address institution) public",
  "function removeInstitution(address institution) public",
  "function isInstitution(address institution) public view returns (bool)"
];

// Load the contract
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS as string, contractABI, wallet);

// 🟢 Mint NFT (Certificate)
router.post("/mint", async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentAddress, tokenURI } = req.body;

    if (!studentAddress || !tokenURI) {
      return res.status(400).json({ error: "Student address and tokenURI are required" });
    }

    const tx = await contract.mintNFT(studentAddress, tokenURI);
    await tx.wait();

    res.json({ success: true, message: "NFT minted successfully!", txHash: tx.hash });
  } catch (error: any) {
    console.error("Minting error:", error);
    res.status(500).json({ error: "Minting failed", details: error.message });
  }
});

// 🟢 Check if an Address is an Institution
router.get("/isInstitution/:address", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const isInstitution = await contract.isInstitution(address);
    res.json({ address, isInstitution });
  } catch (error: any) {
    console.error("Error checking institution:", error);
    res.status(500).json({ error: "Failed to check institution status" });
  }
});

// 🟢 Add an Institution (Only Owner)
router.post("/addInstitution", async (req: Request, res: Response): Promise<any> => {
  try {
    const { institutionAddress } = req.body;

    if (!institutionAddress) {
      return res.status(400).json({ error: "Institution address is required" });
    }

    const tx = await contract.addInstitution(institutionAddress);
    await tx.wait();

    res.json({ success: true, message: "Institution added successfully!", txHash: tx.hash });
  } catch (error: any) {
    console.error("Error adding institution:", error);
    res.status(500).json({ error: "Failed to add institution", details: error.message });
  }
});

// 🟢 Remove an Institution (Only Owner)
router.post("/removeInstitution", async (req: Request, res: Response): Promise<any> => {
  try {
    const { institutionAddress } = req.body;

    if (!institutionAddress) {
      return res.status(400).json({ error: "Institution address is required" });
    }

    const tx = await contract.removeInstitution(institutionAddress);
    await tx.wait();

    res.json({ success: true, message: "Institution removed successfully!", txHash: tx.hash });
  } catch (error: any) {
    console.error("Error removing institution:", error);
    res.status(500).json({ error: "Failed to remove institution", details: error.message });
  }
});
