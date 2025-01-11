import express, { Request, Response } from 'express';
import multer from 'multer';
import { uploadToIPFS } from '../services/ipfsClient';
import { mintNFT, getContract } from '../services/ethereum';
import { NFT } from '../models/NFT';
import abi from '../contract/abi.json';
import { Institution } from '../models/Institution';
import fs from 'fs/promises';
import { fetchAndValidateMetadata } from '../utils/validate';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/mint', upload.single('image'), async (req: Request, res: Response): Promise<any> => {
  const { to, name, description, institutionId } = req.body;

  const institution = await Institution.findById(institutionId);
  if (!institution || !institution.isVerified) {
    return res.status(403).json({ error: 'Unauthorized institution' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }
  const imageBuffer = await fs.readFile(req.file.path);
  const imageUrl = await uploadToIPFS(imageBuffer);

  const metadata = {
    name,
    description,
    image: imageUrl,
  };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const metadataUrl = await uploadToIPFS(metadataBuffer);

  const contract = getContract(abi, process.env.CONTRACT_ADDRESS!, institution.privateKey);
  const tx = await mintNFT(contract, to, metadataUrl);

  const nft = new NFT({
    tokenId: tx.events[0].args.tokenId.toString(),
    metadata: metadataUrl,
    owner: to,
    issuer: institutionId,
  });
  await nft.save();

  // Cleanup uploaded file
  await fs.unlink(req.file.path);

  res.json({ message: 'NFT minted', tx, metadataUrl });
});

router.get('/verify/:tokenId', async (req: Request, res: Response): Promise<any> => {
  const { tokenId } = req.params;

  const nft = await NFT.findOne({ tokenId });
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  const metadataCID = nft.metadata.split('/').pop();
  const isMetadataValid = await fetchAndValidateMetadata(metadataCID!);

  if (!isMetadataValid) {
    return res.status(400).json({ error: 'Invalid metadata' });
  }

  res.json({ message: 'NFT is valid', metadataCID });
});

export default router;