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

router.post('/mint', upload.single('image'), async (req: Request, res: Response): Promise<any> => {
  const { name, description, institution, student } = req.body;

  const institutionDetails = await Institution.findById(institution);
  if (!institutionDetails || !institutionDetails.isVerified) {
    return res.status(403).json({ error: 'Unauthorized institution' });
  }

  const studentDetails = await Student.findById(student);
  if (!studentDetails) {
    return res.status(403).json({ error: 'Student not found' });
  }

  const to = studentDetails.publicKey;

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  const imageBuffer = req.file.buffer;
  const imageUrl = await uploadImageToPinata(imageBuffer, `${name}-${institution}`, { name, description, schoolName: institutionDetails.name });

  const metadata = {
    name,
    description,
    imageUri: imageUrl,
  };

  const metadataUrl = await uploadMetadataToPinata(metadata);

  const contract = getContract(contractABI, process.env.CONTRACT_ADDRESS!, institutionDetails.privateKey);
  const tx = await mintNFT(contract, to, metadataUrl);

  const nft = new NFT({
    transaction: JSON.stringify(tx),
    metadataUrl: metadataUrl,
    imageUrl: imageUrl,
    owner: student,
    issuer: institution,
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

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const students = await NFT.find({}, '-_id -__v -transaction')
      .populate({
        path: 'issuer',
        select: 'name',
      })
      .populate({
        path: 'owner',
        select: 'firstName lastName studentId',
      });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;