import express from 'express';
import mongoose from 'mongoose';
import institutionRoutes from './routes/institution';
import studentRoutes from './routes/student';
import nftRoutes from './routes/nft';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/institution', institutionRoutes);
app.use('/student', studentRoutes);
app.use('/nfts', nftRoutes);

mongoose.connect(process.env.MONGO_URI!).then(() => {
  console.log('Connected to MongoDB');
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
});
