import express, { Request, Response } from 'express';
import { createWallet } from '../utils/wallet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Student } from '../models/Student';
import { authenticateToken } from '../middlewares/authenticateToken';
import { NFT } from '../models/NFT';

const router = express.Router();

router.post('/register', async (req: Request, res: Response): Promise<any> => {
  const { 
    studentId,
    firstName,
    middleName,
    lastName,
    dob,
    gender,
    address,
    email,
    phone,
    institution,
    password
  } = req.body;
  const wallet = createWallet();

  try {
    const existingEmail = await Student.findOne({ email });
    const existingId = await Student.findOne({ studentId });
    if (existingEmail) {
      return res.status(400).json({ message: 'Student with this email already exists' });
    }

    if (existingId) {
      return res.status(400).json({ message: 'Student with this Id already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = new Student({
      studentId,
      firstName,
      middleName,
      lastName,
      dob,
      gender,
      address,
      email,
      phone,
      institution,
      publicKey: wallet.address,
      privateKey: wallet.privateKey,
      password: hashedPassword,
    });
  
    await student.save();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
  
  res.status(201).json({ message: 'Student registered', wallet: {address: wallet.address} });
});

router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await Student.findOne({ email }).populate({
      path: 'institution',
      select: 'name',
    });
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

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const students = await Student.find({ institution: req.user?.id }, '-password -privateKey -__v -institution');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/certificates', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const certificates = await NFT.find({ owner: req.user?.id })
    .populate({
      path: 'owner',
      select: 'firstName middleName lastName studentId',
    })
    .populate({
      path: 'issuer',
      select: 'name institutionId',
    });
    res.status(200).json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: 'Invalid student ID' });
  }

  try {
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
