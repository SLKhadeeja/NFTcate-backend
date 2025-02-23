import express, { Request, Response } from 'express';
import multer from 'multer';
import { uploadImageToPinata, uploadMetadataToPinata } from '../services/ipfsClient';
import { mintNFT, getContract } from '../services/ethereum';
import { NFT } from '../models/NFT';
import { Institution } from '../models/Institution';
import pinataSDK from '@pinata/sdk';
import { authenticateToken } from '../middlewares/authenticateToken';
import { Student } from '../models/Student';

const router = express.Router();
const storage = multer.memoryStorage();
const pinata = new pinataSDK(process.env.PINATA_API_KEY!, process.env.PINATA_SECRET_API_KEY!);

const upload = multer({ storage: storage });

const contractABI = [
  "function mintNFT(address recipient, string memory tokenURI) public returns (uint256)",
  "function addInstitution(address institution) public",
  "function removeInstitution(address institution) public",
  "function isInstitution(address institution) public view returns (bool)"
];

router.post("/mint", upload.single("image"), async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, description, institution, student } = req.body;

    // Validate input data
    if (!name || !description || !institution || !student) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify institution
    const institutionDetails = await Institution.findById(institution);
    if (!institutionDetails || !institutionDetails.isVerified) {
      return res.status(403).json({ error: "Unauthorized institution" });
    }

    // Verify student
    const studentDetails = await Student.findById(student);
    if (!studentDetails) {
      return res.status(404).json({ error: "Student not found" });
    }

    const to = studentDetails.publicKey;
    if (!to) {
      return res.status(400).json({ error: "Student wallet address is missing" });
    }

    // Check for image file
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    // Upload image to IPFS
    let imageUrl;
    try {
      const imageBuffer = req.file.buffer;
      imageUrl = await uploadImageToPinata(imageBuffer, `${name}-${institution}`, {
        name,
        description,
        schoolName: institutionDetails.name,
      });
    } catch (uploadError) {
      console.error("Error uploading image:", uploadError);
      return res.status(500).json({ error: "Failed to upload image to IPFS" });
    }

    // Create metadata
    const metadata = {
      name,
      description,
      imageUri: imageUrl,
    };

    // Upload metadata to IPFS
    let metadataUrl;
    try {
      metadataUrl = await uploadMetadataToPinata(metadata);
    } catch (uploadError) {
      console.error("Error uploading metadata:", uploadError);
      return res.status(500).json({ error: "Failed to upload metadata to IPFS" });
    }

    let tx;
    try {
      const contract = getContract(contractABI, process.env.CONTRACT_ADDRESS!, institutionDetails.privateKey);
      tx = await mintNFT(contract, to, metadataUrl);
      await tx.wait();
    } catch (contractError: any) {
      console.error("Error minting NFT" );
      const message = contractError.info.error.message.split(",")[0];
      return res.status(500).json({ error: "Failed to mint NFT", details: message });
    }

    try {
      const nft = new NFT({
        transaction: JSON.stringify(tx),
        metadataUrl,
        imageUrl,
        owner: student,
        issuer: institution,
      });
      await nft.save();
    } catch (dbError) {
      console.error("Error saving NFT record:", dbError);
      return res.status(500).json({ error: "Failed to save NFT record" });
    }

    res.json({ message: "NFT minted successfully", tx, metadataUrl });
  } catch (error) {
    console.error("Unexpected error in mint route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/addInstitution", async (req: Request, res: Response): Promise<any> => {
  try {
    const { institutionAddress } = req.body;

    if (!institutionAddress) {
      return res.status(400).json({ error: "Institution address is required" });
    }

    // Ensure smart contract is set up correctly
    if (!process.env.CONTRACT_ADDRESS || !process.env.PRIVATE_KEY) {
      return res.status(500).json({ error: "Smart contract environment variables are missing" });
    }

    let tx;
    try {
      const contract = getContract(contractABI, process.env.CONTRACT_ADDRESS, process.env.PRIVATE_KEY);
      tx = await contract.addInstitution(institutionAddress);
      await tx.wait(); // Wait for transaction confirmation
    } catch (contractError) {
      console.error("Error adding institution:", contractError);
      return res.status(500).json({ error: "Failed to add institution", /*details: contractError.message*/ });
    }

    res.json({ success: true, message: "Institution added successfully!", txHash: tx.hash });
  } catch (error) {
    console.error("Unexpected error in addInstitution route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/verify', async (req: Request, res: Response): Promise<any> => {
  const { link } = req.body;

  try {
    const contentCID = link?.toString().split('/').pop();

    if (!contentCID) {
      return res.status(400).json({ message: 'Please provide a valid CID or link.' });
    }

    const metadataResponse = await pinata.pinList({ hashContains: contentCID });
    if (metadataResponse && metadataResponse.rows.length === 0) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    const metadata = metadataResponse.rows[0];

    res.json({
      message: 'Certificate is valid.',
      cid: contentCID,
      metadata,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error verifying certificate.', error: error.message });
  }
});

export default router;