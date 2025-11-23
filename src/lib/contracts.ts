import { Contract, BrowserProvider, JsonRpcProvider, Interface } from 'ethers';
// Vite automatically parses JSON imports
import CampaignFactoryABI from '@/abi/CampaignFactory.json';
import CampaignABI from '@/abi/Campaign.json';

// Contract addresses - these should be set via environment variables or config
export const CONTRACT_ADDRESSES = {
  CAMPAIGN_FACTORY: import.meta.env.VITE_CAMPAIGN_FACTORY_ADDRESS || '0xEDd871D4FBB9bED81c9870EA6d1E7745fb1c395c',
  CAMPAIGN_IMPLEMENTATION: import.meta.env.VITE_CAMPAIGN_IMPLEMENTATION_ADDRESS || '0x608E2E33e056aFB45A2fc40641a5C18644aC4448',
};

// Get provider - tries to use browser wallet, falls back to public RPC
export async function getProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  // Fallback to Sepolia testnet RPC (chain ID: 11155111)
  // Your contracts are deployed on Sepolia, not mainnet
  const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
  return new JsonRpcProvider(rpcUrl);
}

// Get signer if wallet is connected
export async function getSigner() {
  const provider = await getProvider();
  if (provider instanceof BrowserProvider) {
    return await provider.getSigner();
  }
  return null;
}

// Get CampaignFactory contract instance
export async function getCampaignFactoryContract(withSigner = false) {
  const provider = await getProvider();
  const signer = withSigner ? await getSigner() : null;

  // Vite imports JSON as the parsed object directly
  // Handle different possible import formats
  let abi: any = CampaignFactoryABI;

  // Check if it's wrapped (some bundlers wrap JSON imports)
  if (abi && typeof abi === 'object' && 'default' in abi && !Array.isArray(abi)) {
    abi = abi.default;
  }

  // Ensure it's an array
  if (!Array.isArray(abi)) {
    console.error('ABI format error:', {
      type: typeof abi,
      isArray: Array.isArray(abi),
      keys: abi && typeof abi === 'object' ? Object.keys(abi) : 'N/A',
      sample: abi && typeof abi === 'object' ? JSON.stringify(abi).substring(0, 200) : String(abi).substring(0, 200)
    });
    throw new Error(`CampaignFactory ABI must be an array. Got: ${typeof abi}`);
  }

  // Debug: Check if getAllCampaigns exists in ABI
  const hasGetAllCampaigns = abi.some((item: any) =>
    item.type === 'function' && item.name === 'getAllCampaigns'
  );
  console.log('ABI loaded:', {
    length: abi.length,
    hasGetAllCampaigns,
    functions: abi.filter((item: any) => item.type === 'function').map((item: any) => item.name)
  });

  try {
    const contract = new Contract(
      CONTRACT_ADDRESSES.CAMPAIGN_FACTORY,
      abi,
      signer || provider
    );

    // Verify contract was created and has methods
    console.log('Contract created:', {
      address: contract.target,
      hasGetAllCampaigns: typeof contract.getAllCampaigns,
      contractMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(contract))
    });

    return contract;
  } catch (error: any) {
    console.error('Error creating CampaignFactory contract:', error);
    console.error('ABI type:', typeof abi);
    console.error('ABI is array:', Array.isArray(abi));
    console.error('ABI length:', abi?.length);
    throw new Error(`Failed to create contract instance: ${error.message}`);
  }
}

// Get Campaign contract instance
export async function getCampaignContract(address: string, withSigner = false) {
  const provider = await getProvider();
  const signer = withSigner ? await getSigner() : null;

  // Vite imports JSON as the parsed object directly
  let abi: any = CampaignABI;

  if (abi && typeof abi === 'object' && 'default' in abi && !Array.isArray(abi)) {
    abi = abi.default;
  }

  if (!Array.isArray(abi)) {
    throw new Error('Campaign ABI must be an array');
  }

  return new Contract(
    address,
    abi,
    signer || provider
  );
}

// Helper to format campaign state enum
// Based on ABI: Active, Paused, Completed, Failed, Cancelled, DonationOnly
// In Solidity, enums start at 0, so the order is:
// 0 = Active, 1 = Paused, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = DonationOnly
export function formatCampaignState(state: number): 'Active' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled' | 'DonationOnly' {
  // CampaignState enum mapping (corrected to match contract):
  // 0 = Active, 1 = Paused, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = DonationOnly
  switch (state) {
    case 0:
      return 'Active';
    case 1:
      return 'Paused';
    case 2:
      return 'Completed';
    case 3:
      return 'Failed';
    case 4:
      return 'Cancelled';
    case 5:
      return 'DonationOnly';
    default:
      return 'Active'; // Default to Active for unknown states
  }
}

// Helper to convert wei to ether
export function formatEther(value: bigint): string {
  return (Number(value) / 1e18).toFixed(4);
}

// Helper to convert USD (stored as uint256, likely in cents or smallest unit)
export function formatUSD(value: bigint, decimals = 2): string {
  return (Number(value) / 100).toFixed(decimals);
}

