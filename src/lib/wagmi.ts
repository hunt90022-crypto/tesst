import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, arbitrum, optimism } from 'wagmi/chains';

// Get the chain ID from environment or default to sepolia for testing
const chainId = parseInt(import.meta.env.VITE_CHAIN_ID || '11155111', 10);

// Map chain IDs to wagmi chains
const chainMap: Record<number, any> = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  10: optimism,
};

const selectedChain = chainMap[chainId] || sepolia;

// You need to get a WalletConnect Project ID from https://cloud.walletconnect.com
// For now, using a placeholder - replace with your actual project ID
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId || projectId === 'YOUR_PROJECT_ID') {
  console.warn(
    '⚠️ WalletConnect Project ID not set!\n' +
    '1. Go to https://cloud.walletconnect.com\n' +
    '2. Create a project and copy your Project ID\n' +
    '3. Add VITE_WALLETCONNECT_PROJECT_ID=your_project_id to your .env file\n' +
    'Using a temporary placeholder for now (some features may not work)'
  );
}

export const config = getDefaultConfig({
  appName: 'Campaign Platform',
  projectId: projectId || '00000000000000000000000000000000', // Temporary placeholder
  chains: [selectedChain],
  ssr: false, // If your dApp uses server side rendering (SSR)
});

