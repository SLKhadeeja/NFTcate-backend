import pinataSDK from '@pinata/sdk';
import dotenv from "dotenv";
import { Readable } from 'stream';

dotenv.config();

const pinata = new pinataSDK(process.env.PINATA_API_KEY!, process.env.PINATA_SECRET_API_KEY!);

export const uploadImageToPinata = async (imageBuffer: Buffer, fileName: string) => {
    try {
        const readableStream = new Readable();
        readableStream.push(imageBuffer);
        readableStream.push(null);

        const result = await pinata.pinFileToIPFS(readableStream, {
          pinataMetadata: { name: fileName }
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

// export const uploadToIPFS = async (input: Buffer<any>, type: 'image'|'data'): Promise<string> => {
//   try {
//     const formData = new FormData();
//     if (type === "image") {
//       formData.append("file", input);
//     } else {
//       formData.append("file", input, {
//         filename: "metadata.json",
//         contentType: "application/json",
//       });
//     }

//     const response = await axios.post(INFURA_IPFS_API, formData, {
//       headers: {
//         ...formData.getHeaders(),
//         Authorization: INFURA_AUTH,
//       },
//     });

//     return `https://ipfs.io/ipfs/${response.data.Hash}`;
//   } catch (error) {
//     console.error("Error uploading to IPFS:", error);
//     throw new Error("Upload to IPFS failed");
//   }
// };
