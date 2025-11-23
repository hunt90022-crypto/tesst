import { CampaignFactory, Campaign } from '../abi';

// You can add address configurations per chain here if needed
export const CONTRACT_ADDRESSES = {
  [11155111]: { // Sepolia
    CampaignFactory: '0xEDd871D4FBB9bED81c9870EA6d1E7745fb1c395c', // From Index.tsx
  },
  // Add other chains as needed
} as const;

export const CONTRACT_ABIS = {
  CampaignFactory,
  Campaign,
} as const;
