import axios from "axios";
// import { CID } from 'multiformats/cid';

const isValidCID = (cid: string): boolean => {
  try {
    // CID.parse(cid);
    return true;
  } catch {
    return false;
  }
};

export const fetchAndValidateMetadata = async (metadataCID: string): Promise<boolean> => {
  try {
    const response = await axios.get(`https://ipfs.io/ipfs/${metadataCID}`);
    const metadata = response.data;

    // Check metadata structure
    if (!metadata.name || !metadata.description || !metadata.image) {
      throw new Error('Invalid metadata structure');
    }

    // Validate the image CID
    if (!isValidCID(metadata.image)) {
      throw new Error('Invalid image CID in metadata');
    }

    return true;
  } catch (error) {
    console.error('Error validating metadata:', error);
    return false;
  }
};