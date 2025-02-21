import pinataSDK from '@pinata/sdk';
import dotenv from "dotenv";
import { Readable } from 'stream';

dotenv.config();

interface IImageMetadata {
  name: string;
  description: string;
  schoolName: string;
}

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

export const uploadImageToPinata = async (imageBuffer: Buffer, fileName:string, metadata: IImageMetadata) => {
    try {
        const readableStream = new Readable();
        readableStream.push(imageBuffer);
        readableStream.push(null);

        
        const result = await pinata.pinFileToIPFS(readableStream, {
          pinataMetadata: {
            name: fileName,
            // @ts-ignore (Disable TypeScript check for keyvalues)
            keyvalues: {
              name: metadata.name.toString(),
              description: metadata.description.toString(),
              schoolName: metadata.schoolName.toString(),
            },
          }
        });
        const imageURI = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
        return imageURI;
    } catch (error) {
        console.error('Error uploading image to Pinata:', error);
        throw error;
    }
};

interface IMetaData {
  name: string;
  description: string;
  imageUri: string;
}

export const uploadMetadataToPinata = async (metadata: IMetaData) => {
  try {
      const result = await pinata.pinJSONToIPFS(metadata);
      const metadataURI = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
      return metadataURI;
  } catch (error) {
      console.error('Error uploading metadata to Pinata:', error);
      throw error;
  }
};
