import mongoose from 'mongoose';

const NFTSchema = new mongoose.Schema({
  tokenId: String,
  metadata: Object,
  owner: String,
  issuer: String,
});

export const NFT = mongoose.model('NFT', NFTSchema);
