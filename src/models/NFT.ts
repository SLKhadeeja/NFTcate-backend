import mongoose from 'mongoose';

const NFTSchema = new mongoose.Schema({
  transaction: String,
  image: String,
  metadata: Object,
  owner: String,
  issuer: String,
});

export const NFT = mongoose.model('NFT', NFTSchema);
