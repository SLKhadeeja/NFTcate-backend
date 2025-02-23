import { ethers, JsonRpcProvider } from 'ethers';

export const provider = new JsonRpcProvider(process.env.INFURA_API_URL);

export const getContract = (abi: any, address: string, privateKey: string) => {
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(address, abi, wallet);
};

export const mintNFT = async (contract: any, to: string, metadata: string) => {
  const tx = await contract.mintNFT(to, metadata);
  return await tx.wait();
};
