import { ethers } from 'ethers';

export const createWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

export const getWalletFromPrivateKey = (privateKey: string) => {
  return new ethers.Wallet(privateKey);
};
