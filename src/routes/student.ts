import express, { Request, Response } from 'express';
import { createWallet } from '../utils/wallet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Student } from '../models/Student';
import { authenticateToken } from '../middlewares/authenticateToken';

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
    const existingUser = await Student.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Student with this email already exists' });
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

    res.status(200).json({ ...userDetails, token });
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
