import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitution extends Document {
  institutionId: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  contact: string;
  website: string;
  password: string;
  publicKey: string;
  privateKey: string;
  isVerified: boolean;
  type: 'university' | 'college' | 'technical';
}

const InstitutionSchema = new Schema({
  institutionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  contact: { type: String, required: true },
  website: { type: String, required: true },
  password: { type: String, required: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  type: {
    type: String, 
    enum: ['university', 'college', 'technical'], 
    required: true, 
  }
});

export const Institution = mongoose.model('Institution', InstitutionSchema);
