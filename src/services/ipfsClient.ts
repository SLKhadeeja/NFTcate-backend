// import ipfsClient from 'ipfs-http-client';
import { create } from 'ipfs-http-client';

// const ipfs = ipfsClient({ url: 'https://ipfs.infura.io:5001/api/v0' });

const projectId = process.env.INFURA_PROJECT_ID
const projectSecret = process.env.INFURA_PROJECT_SECRET;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = create({
  host: 'sepolia.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

export const uploadToIPFS = async (file: Buffer) => {
  try {
    const result = await ipfs.add(file);
    return `https://sepolia.infura.io/v3/${result.path}`;
  } catch (error) {
    throw new Error('Failed to upload to IPFS: ' + error);
  }
};
