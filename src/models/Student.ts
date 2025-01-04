import mongoose, { Schema, Document } from 'mongoose';
import { Institution } from './Institution';

export interface IInstitution extends Document {
  studentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob:string;
  password: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
  publicKey: string;
  privateKey: string;
  institution: mongoose.Types.ObjectId;
}

const StudentSchema = new Schema({
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: String, required: true },
  password: { type: String, required: true },
  gender: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
});

export const Student = mongoose.model('Student', StudentSchema);
