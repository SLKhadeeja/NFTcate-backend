import express from 'express';
import { Request, Response } from 'express';
import { mintNFT, getContract } from '../services/ethereum';
import { NFT } from '../models/NFT';
import abi from '../contract/abi.json';
import { Institution } from '../models/Institution';

const router = express.Router();

router.post('/mint', async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, metadata, institutionId } = req.body;

    // Fetch the institution from the database
    const institution = await Institution.findById(institutionId);

    if (!institution || !institution.isVerified) {
      res.status(403).json({ error: 'Unauthorized institution' });
      return;
    }

    // Get the contract instance using the institution's private key
    const contract = getContract(abi, process.env.CONTRACT_ADDRESS!, institution.privateKey);

    // Mint the NFT
    const tx = await mintNFT(contract, to, metadata);

    // Save the minted NFT details to the database
    const nft = new NFT({
      tokenId: tx.events[0].args.tokenId.toString(), // Convert tokenId to a string
      metadata,
      owner: to,
      issuer: institutionId,
    });
    await nft.save();

    // Respond with success
    res.json({ message: 'NFT minted', tx });
  } catch (error) {
    console.error('Error minting NFT:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
