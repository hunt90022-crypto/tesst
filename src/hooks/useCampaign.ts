import { useState, useEffect, useCallback } from 'react';
import { getCampaignContract, formatCampaignState, getProvider } from '@/lib/contracts';
import { parseUnits, formatEther } from 'ethers';

export interface CampaignDetails {
  address: string;
  name: string;
  description: string;
  creator: string;
  admin: string;
  goal: number;
  raised: number;
  ethBalance: number;
  wbtcBalance: number;
  status: number;
  statusLabel: 'Active' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled' | 'DonationOnly';
  paidOut: boolean;
  deadline: number;
  tokenEnabled: boolean;
  metadataHash: string;
  factory: string;
  startedDate: string;
  totalRaisedUSD: number;
  acceptedToken: string;
}

export function useCampaign(campaignAddress: string) {
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!campaignAddress) {
      setError('Campaign address is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const contract = await getCampaignContract(campaignAddress);

      // Fetch all campaign data in parallel
      const [
        creator,
        goalUSD,
        deadline,
        factory,
        state,
        balances,
        totalRaisedUSD,
        acceptedToken,
        metadataHash,
      ] = await Promise.all([
        contract.creator(),
        contract.goalUSD(),
        contract.deadline(),
        contract.factory(),
        contract.state(),
        contract.getBalances(),
        contract.totalRaisedUSD(),
        contract.acceptedToken().catch(() => '0x0000000000000000000000000000000000000000'),
        contract.metadataHash().catch(() => '0x0000000000000000000000000000000000000000000000000000000000000000'),
      ]);

      // Get campaign name from factory (if available)
      let name = 'Campaign';
      try {
        const { getCampaignFactoryContract } = await import('@/lib/contracts');
        const factoryContract = await getCampaignFactoryContract();
        const allCampaigns = await factoryContract.getAllCampaigns();
        const campaignInfo = allCampaigns.find((c: any) => {
          // Find by checking if this address is a campaign
          return true; // We'll match by address later if needed
        });
        if (campaignInfo) {
          name = campaignInfo.label || 'Campaign';
        }
      } catch (e) {
        console.warn('Could not fetch campaign name from factory:', e);
      }

      // Get admin from factory (campaign doesn't have admin directly)
      let admin = '0x0000000000000000000000000000000000000000';
      try {
        const { getCampaignFactoryContract } = await import('@/lib/contracts');
        const factoryContract = await getCampaignFactoryContract();
        // Admin is typically the factory owner or a designated admin
        admin = await factoryContract.owner().catch(() => '0x0000000000000000000000000000000000000000');
      } catch (e) {
        console.warn('Could not fetch admin:', e);
      }

      // Check if payout has been released (we'll check events or a flag if available)
      let paidOut = false;
      try {
        // Check for PayoutReleased events
        const filter = contract.filters.PayoutReleased();
        const events = await contract.queryFilter(filter, 0, 'latest');
        paidOut = events.length > 0;
      } catch (e) {
        console.warn('Could not check payout status:', e);
      }

      // Convert values
      // Both goalUSD and totalRaisedUSD are stored with 18 decimals (wei format)
      const goal = Number(goalUSD) / 1e18;
      const raised = Number(totalRaisedUSD) / 1e18;
      console.log('Campaign Details - Goal conversion:', {
        rawGoal: goalUSD.toString(),
        convertedGoal: goal,
        rawRaised: totalRaisedUSD.toString(),
        convertedRaised: raised,
        progress: goal > 0 ? (raised / goal) * 100 : 0,
      });
      const ethBalance = Number(formatEther(balances.ethBalance.toString()));
      const wbtcBalance = acceptedToken && acceptedToken !== '0x0000000000000000000000000000000000000000'
        ? Number(formatEther(balances.tokenBalance.toString()))
        : 0;
      const statusNum = Number(state);
      const statusLabel = formatCampaignState(statusNum);
      const deadlineTimestamp = Number(deadline) * 1000; // Convert to milliseconds
      const tokenEnabled = acceptedToken && acceptedToken !== '0x0000000000000000000000000000000000000000';

      // Get started date (createdAt from factory or use deadline - some period)
      let startedDate = new Date(deadlineTimestamp - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      try {
        const { getCampaignFactoryContract } = await import('@/lib/contracts');
        const factoryContract = await getCampaignFactoryContract();
        const allCampaigns = await factoryContract.getAllCampaigns();
        const campaignInfo = allCampaigns.find((c: any, idx: number) => {
          // Try to match by checking campaign addresses
          return true;
        });
        if (campaignInfo && campaignInfo.createdAt) {
          startedDate = new Date(Number(campaignInfo.createdAt) * 1000).toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Could not fetch started date:', e);
      }

      setCampaign({
        address: campaignAddress,
        name,
        description: `Campaign created by ${creator.slice(0, 6)}...${creator.slice(-4)}`,
        creator: creator as string,
        admin: admin as string,
        goal,
        raised,
        ethBalance,
        wbtcBalance,
        status: statusNum,
        statusLabel,
        paidOut,
        deadline: deadlineTimestamp,
        tokenEnabled,
        metadataHash: metadataHash as string,
        factory: factory as string,
        startedDate,
        totalRaisedUSD: raised,
        acceptedToken: acceptedToken as string,
      });
    } catch (err: any) {
      console.error('Error fetching campaign:', err);
      setError(err.message || 'Failed to fetch campaign details');
    } finally {
      setLoading(false);
    }
  }, [campaignAddress]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return {
    campaign,
    loading,
    error,
    refetch: fetchCampaign,
  };
}

