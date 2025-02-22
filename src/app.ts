import express from 'express';
import mongoose from 'mongoose';
import institutionRoutes from './routes/institution';
import studentRoutes from './routes/student';
import nftRoutes from './routes/nft';
import userRoutes from './routes/user';
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
app.use('/user', userRoutes);

mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1); // Exit the app if DB connection fails
  });

