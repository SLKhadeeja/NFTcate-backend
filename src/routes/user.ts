import jwt from 'jsonwebtoken';
import express, { Request, Response } from 'express';
import { authenticateToken } from '../middlewares/authenticateToken';
import { IInstitution, Institution } from '../models/Institution';
import { IStudent, Student } from '../models/Student';
import { ethers } from 'ethers';
import { provider } from '../services/ethereum';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const token = req.headers['authorization']?.split(' ')[1];

  if(!token) {
    return res.status(400).json({ message: 'Token unavailable'});
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  const id = (decoded as IStudent | IInstitution).id;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: 'Invalid institution ID' });
  }

  try {
    const institution = await Institution.findById(id);

    if (!institution) {
      const student = await Student.findById(id).populate({
        path: 'institution',
        select: 'name',
      });
      
      if(!student) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...studentDetails } = student.toObject();
      return res.status(200).json({  userType: 'student', ...studentDetails});
    }

    const { password: _, ...institutionDetails } = institution.toObject();
    const balance = await provider.getBalance(institutionDetails.publicKey);
    const balanceInEth = ethers.formatEther(balance);
    return res.status(200).json({ userType: 'institution', walletBalance: balanceInEth, ...institutionDetails});
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});


export default router;