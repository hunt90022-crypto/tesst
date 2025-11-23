import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, optimism, arbitrum } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Lovable Project',
  projectId: 'e899c82be21d4df5c855ebcd849c2d4b', // Example Project ID. Get your own at https://cloud.walletconnect.com
  chains: [mainnet, sepolia, polygon, optimism, arbitrum],
  ssr: false, // Important for Vite projects
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
});
