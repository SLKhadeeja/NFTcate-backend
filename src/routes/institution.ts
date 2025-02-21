import { authenticateToken } from './../middlewares/authenticateToken';
import express, { Request, Response } from 'express';
import { createWallet } from '../utils/wallet';
import { Institution } from '../models/Institution';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Student } from '../models/Student';
import { NFT } from '../models/NFT';

const router = express.Router();

router.post('/register', async (req: Request, res: Response): Promise<any> => {
  const { 
    institutionId,
    name,
    email,
    address,
    city,
    state,
    country,
    contact,
    website,
    password,
    isVerified,
    type,
  } = req.body;
  const wallet = createWallet();

  try {
    const existingUser = await Institution.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Instituion with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const institution = new Institution({
      institutionId,
      name,
      email,
      address,
      city,
      state,
      country,
      contact,
      website,
      isVerified,
      type,
      publicKey: wallet.address,
      privateKey: wallet.privateKey,
      password: hashedPassword,
    });
  
    await institution.save();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
  
  res.status(201).json({ message: 'Institution registered', wallet: {address: wallet.address} });
});

router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await Institution.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const { password: _, privateKey: __, ...userDetails } = user.toObject();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '1h',
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const institutions = await Institution.find({}, '-password -privateKey');
    res.status(200).json(institutions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const institutions = await Institution.find({}, 'name _id');
    res.status(200).json(institutions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

router.get('/count', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const students = await Student.find({ institution: req.user?.id });
    const certificates = await NFT.find({ issuer: req.user?.id });
    res.status(200).json({ students: students.length, certificates: certificates.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: 'Invalid institution ID' });
  }

  try {
    const institution = await Institution.findById(id);

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    res.status(200).json(institution);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});


export default router;
