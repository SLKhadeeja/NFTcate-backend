import express from 'express';
import mongoose from 'mongoose';
import institutionRoutes from './routes/institution';
import studentRoutes from './routes/student';
import nftRoutes from './routes/nft';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: '*', // Allow requests from this domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use('/institutions', institutionRoutes);
app.use('/students', studentRoutes);
app.use('/certificate', nftRoutes);

mongoose.connect(process.env.MONGO_URI!).then(() => {
  console.log('Connected to MongoDB');
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
});
