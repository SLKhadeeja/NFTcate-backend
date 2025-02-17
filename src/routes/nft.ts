import express, { Request, Response } from 'express';
import multer from 'multer';
import { uploadImageToPinata, uploadMetadataToPinata } from '../services/ipfsClient';
import { mintNFT, getContract } from '../services/ethereum';
import { NFT } from '../models/NFT';
import { Institution } from '../models/Institution';
import pinataSDK from '@pinata/sdk';

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

router.post('/mint', upload.single('image'), async (req: Request, res: Response): Promise<any> => {
  const { to, name, description, institutionId } = req.body;

  const institution = await Institution.findById(institutionId);
  if (!institution || !institution.isVerified) {
    return res.status(403).json({ error: 'Unauthorized institution' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  const imageBuffer = req.file.buffer;
  const imageUrl = await uploadImageToPinata(imageBuffer, `${name}-${institutionId}`);

  const metadata = {
    name,
    description,
    imageUri: imageUrl,
  };

  const metadataUrl = await uploadMetadataToPinata(metadata);

  const contract = getContract(contractABI, process.env.CONTRACT_ADDRESS!, institution.privateKey);
  const tx = await mintNFT(contract, to, metadataUrl);

  const nft = new NFT({
    transaction: JSON.stringify(tx),
    metadata: metadataUrl,
    image: imageUrl,
    owner: to,
    issuer: institutionId,
  });
  await nft.save();

  res.json({ message: 'NFT minted', tx, metadataUrl });
});

router.post("/addInstitution", async (req: Request, res: Response): Promise<any> => {
  try {
    const { institutionAddress } = req.body;

    if (!institutionAddress) {
      return res.status(400).json({ error: "Institution address is required" });
    }

    const contract = getContract(contractABI, process.env.CONTRACT_ADDRESS!, process.env.PRIVATE_KEY!);
    const tx = await contract.addInstitution(institutionAddress);
    await tx.wait();

    res.json({ success: true, message: "Institution added successfully!", txHash: tx.hash });
  } catch (error: any) {
    console.error("Error adding institution:", error);
    res.status(500).json({ error: "Failed to add institution", details: error.message });
  }
});

router.get('/verify', async (req: Request, res: Response): Promise<any> => {
  const { link } = req.body;

  try {
    // Ensure CID or link is a string
    const contentCID = link?.toString().split('/').pop();
    console.log(link, contentCID);

    if (!contentCID) {
      return res.status(400).json({ message: 'Please provide a valid CID or link.' });
    }

    // Fetch metadata from Pinata using hashContains to filter by CID
    const metadataResponse = await pinata.pinList({ hashContains: contentCID });
    if (metadataResponse.rows.length === 0) {
      return res.status(404).json({ message: 'Certificate metadata not found on IPFS.' });
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