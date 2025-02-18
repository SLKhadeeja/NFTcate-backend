import mongoose, { Schema, Document } from 'mongoose';

export interface INft extends Document {
  transaction: string;
  image: string;
  metadata: string;
  owner: mongoose.Types.ObjectId;
  issuer: mongoose.Types.ObjectId;
};

const NFTSchema = new Schema({
  transaction: { type: String, required: true },
  imageUrl: { type: String, required: true },
  metadataUrl: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
});

export const NFT = mongoose.model('NFT', NFTSchema);
