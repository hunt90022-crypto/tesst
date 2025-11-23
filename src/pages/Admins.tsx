import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount, useChainId, useWatchContractEvent } from 'wagmi';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from '@/config/contracts';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import {
  UserPlus,
  UserMinus,
  Shield,
  Search,
  Send,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Eye,
  Users
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Admin {
  address: string;
  addedBy: string;
  addedAt: string;
  status: 'active' | 'pending' | 'removed';
}

interface ActivityLog {
  id: string;
  action: string;
  performer: string;
  target: string;
  timestamp: string;
  txHash?: string;
}

export default function Admins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);

  const [addAdminAddress, setAddAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [checkAdminAddress, setCheckAdminAddress] = useState('');
  const [transferCreatorAddress, setTransferCreatorAddress] = useState('');
  const [oracleAddresses, setOracleAddresses] = useState<{
    ethUsdFeed: string;
    wbtcUsdFeed: string;
  }>({
    ethUsdFeed: '',
    wbtcUsdFeed: '',
  });
  const [oraclePrices, setOraclePrices] = useState<{
    ethUsd: { price: string | null; timestamp: number | null; status: 'idle' | 'loading' | 'success' | 'error'; error?: string };
    wbtcUsd: { price: string | null; timestamp: number | null; status: 'idle' | 'loading' | 'success' | 'error'; error?: string };
    btcUsd: { price: string | null; timestamp: number | null; status: 'idle' | 'loading' | 'success' | 'error'; error?: string };
  }>({
    ethUsd: { price: null, timestamp: null, status: 'idle' },
    wbtcUsd: { price: null, timestamp: null, status: 'idle' },
    btcUsd: { price: null, timestamp: null, status: 'idle' },
  });
  const [selectedCampaignForEvents, setSelectedCampaignForEvents] = useState<string>('');
  const [campaignEvents, setCampaignEvents] = useState<any[]>([]);
  const [campaignDonors, setCampaignDonors] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
  }>({ open: false, action: '', title: '', description: '' });

  const chainId = useChainId();
  const factoryAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.CampaignFactory 
    || CONTRACT_ADDRESSES[11155111].CampaignFactory;

  const { address: userAddress } = useAccount();
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Use the admin hook to fetch real data
  const { 
    admins: fetchedAdmins, 
    activityLog: fetchedActivityLog,
    loading: adminsLoading,
    isAdmin: isCurrentUserAdmin,
    refetch: refetchAdmins 
  } = useAdmin(factoryAddress);

  // Check if current user is owner
  const { data: ownerAddress } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    functionName: 'owner',
  });

  const isOwner = userAddress?.toLowerCase() === (ownerAddress as string)?.toLowerCase();
  const canManageAdmins = isOwner || isCurrentUserAdmin;

  // Watch for AdminAdded events
  useWatchContractEvent({
    address: factoryAddress as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'AdminAdded',
    onLogs() {
      // Refetch admins when new admin is added
      setTimeout(() => refetchAdmins(), 2000);
    },
  });

  // Watch for AdminRemoved events
  useWatchContractEvent({
    address: factoryAddress as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'AdminRemoved',
    onLogs() {
      // Refetch admins when admin is removed
      setTimeout(() => refetchAdmins(), 2000);
    },
  });

  // Watch for OwnershipTransferred events
  useWatchContractEvent({
    address: factoryAddress as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'OwnershipTransferred',
    onLogs() {
      // Refetch to update owner status
      setTimeout(() => refetchAdmins(), 2000);
    },
  });

  // Update local state when fetched data changes
  useEffect(() => {
    setAdmins(fetchedAdmins);
    setActivityLog(fetchedActivityLog);
  }, [fetchedAdmins, fetchedActivityLog]);

  useEffect(() => {
    if (isConfirmed) {
      toast.success('Transaction confirmed successfully!');
      setDialogState({ open: false, action: '', title: '', description: '' });
      // Clear form fields
      setAddAdminAddress('');
      setRemoveAdminAddress('');
      setCheckAdminAddress('');
      setTransferCreatorAddress('');
      // Refetch admins after transaction is confirmed
      setTimeout(() => refetchAdmins(), 2000);
    }
  }, [isConfirmed, refetchAdmins]);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const filteredAdmins = admins.filter(admin =>
    admin.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddAdmin = async () => {
    if (!addAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(addAdminAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (admins.some(admin => admin.address.toLowerCase() === addAdminAddress.toLowerCase())) {
      toast.error('Address is already an admin');
      return;
    }

    if (!canManageAdmins) {
      toast.error('Only the factory owner or admins can add admins');
      return;
    }

    writeContract({
      address: factoryAddress as `0x${string}`,
      abi: CONTRACT_ABIS.CampaignFactory,
      functionName: 'addAdmin',
      args: [addAdminAddress as `0x${string}`],
    } as any, {
      onError: (error: any) => {
        toast.error(`Failed to add admin: ${error.message || error.reason || 'Unknown error'}`);
      },
      onSuccess: () => {
        toast.info('Transaction submitted. Waiting for confirmation...');
      },
    });
  };

  const handleRemoveAdmin = async () => {
    if (!removeAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(removeAdminAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (!canManageAdmins) {
      toast.error('Only the factory owner or admins can remove admins');
      return;
    }

    if (removeAdminAddress.toLowerCase() === userAddress?.toLowerCase()) {
      toast.error('You cannot remove yourself as admin');
      return;
    }

    writeContract({
      address: factoryAddress as `0x${string}`,
      abi: CONTRACT_ABIS.CampaignFactory,
      functionName: 'removeAdmin',
      args: [removeAdminAddress as `0x${string}`],
    } as any, {
      onError: (error: any) => {
        toast.error(`Failed to remove admin: ${error.message || error.reason || 'Unknown error'}`);
      },
      onSuccess: () => {
        toast.info('Transaction submitted. Waiting for confirmation...');
      },
    });
  };

  const handleCheckAdmin = async () => {
    if (!checkAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(checkAdminAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    try {
      // Use contract's isAdmin function directly
      const { getCampaignFactoryContract } = await import('@/lib/contracts');
      const factory = await getCampaignFactoryContract();
      const isAdminResult = await factory.isAdmin(checkAdminAddress);

      const newLog: ActivityLog = {
        id: Date.now().toString(),
        action: 'Admin Status Checked',
        performer: userAddress ? formatAddress(userAddress) : 'Unknown',
        target: formatAddress(checkAdminAddress),
        timestamp: new Date().toLocaleString()
      };
      setActivityLog(prev => [newLog, ...prev]);

      if (isAdminResult) {
        toast.success('Address is an admin!');
      } else {
        toast.info('Address is not an admin');
      }

      setCheckAdminAddress('');
      setDialogState({ open: false, action: '', title: '', description: '' });
    } catch (error: any) {
      console.error('Error checking admin status:', error);
      toast.error(`Failed to check admin status: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferCreator = async () => {
    if (!transferCreatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(transferCreatorAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (!isOwner) {
      toast.error('Only the factory owner can transfer ownership');
      return;
    }

    if (transferCreatorAddress.toLowerCase() === userAddress?.toLowerCase()) {
      toast.error('You are already the owner');
      return;
    }

    writeContract({
      address: factoryAddress as `0x${string}`,
      abi: CONTRACT_ABIS.CampaignFactory,
      functionName: 'transferOwnership',
      args: [transferCreatorAddress as `0x${string}`],
    } as any, {
      onError: (error: any) => {
        toast.error(`Failed to transfer ownership: ${error.message || error.reason || 'Unknown error'}`);
      },
      onSuccess: () => {
        toast.info('Transaction submitted. Waiting for confirmation...');
      },
    });
  };

  const openDialog = (action: string, title: string, description: string) => {
    setDialogState({ open: true, action, title, description });
  };

  // Oracle Price ABI (Chainlink AggregatorV3Interface)
  const ORACLE_ABI = [
    {
      "inputs": [],
      "name": "latestRoundData",
      "outputs": [
        { "internalType": "uint80", "name": "roundId", "type": "uint80" },
        { "internalType": "int256", "name": "answer", "type": "int256" },
        { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
        { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
        { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const getOracleAddresses = async () => {
    // First, try to use manually set addresses
    if (oracleAddresses.ethUsdFeed && oracleAddresses.wbtcUsdFeed) {
      return {
        ethUsdFeed: oracleAddresses.ethUsdFeed,
        wbtcUsdFeed: oracleAddresses.wbtcUsdFeed,
      };
    }

    // Fallback: try to fetch from a campaign
    try {
      const { getCampaignFactoryContract } = await import('@/lib/contracts');
      const factory = await getCampaignFactoryContract();
      const allCampaigns = await factory.getAllCampaigns();
      
      if (allCampaigns.length === 0) {
        throw new Error('No campaigns found to fetch oracle addresses from. Please add oracle addresses manually.');
      }

      // Get the first campaign's contract to fetch oracle addresses
      const { getCampaignContract } = await import('@/lib/contracts');
      const firstCampaignAddress = await factory.campaigns(0).catch(() => null);
      if (!firstCampaignAddress) {
        throw new Error('Could not find campaign address. Please add oracle addresses manually.');
      }

      const campaignContract = await getCampaignContract(firstCampaignAddress);
      const ethUsdFeed = await campaignContract.ethUsdFeed();
      const wbtcUsdFeed = await campaignContract.wbtcUsdFeed();

      // Auto-populate the addresses for future use
      setOracleAddresses({
        ethUsdFeed: ethUsdFeed,
        wbtcUsdFeed: wbtcUsdFeed,
      });

      return { ethUsdFeed, wbtcUsdFeed };
    } catch (error: any) {
      throw new Error(`Failed to get oracle addresses: ${error.message || 'Unknown error'}. Please add oracle addresses manually.`);
    }
  };

  const handleCheckETHPrice = async () => {
    setOraclePrices(prev => ({ ...prev, ethUsd: { ...prev.ethUsd, status: 'loading' } }));
    try {
      const { getProvider } = await import('@/lib/contracts');
      const provider = await getProvider();
      const { Contract } = await import('ethers');
      const { ethUsdFeed } = await getOracleAddresses();

      const ethOracle = new Contract(ethUsdFeed, ORACLE_ABI, provider);
      const [ethData, ethDecimals] = await Promise.all([
        ethOracle.latestRoundData().catch((e: any) => {
          if (e.message?.includes('BAD_DATA') || e.message?.includes('could not decode')) {
            throw new Error('Oracle returned empty data. The oracle may not be configured or may be on a different network.');
          }
          throw e;
        }),
        ethOracle.decimals(),
      ]);

      const ethPrice = Number(ethData.answer) / Math.pow(10, Number(ethDecimals));
      const timestamp = Number(ethData.updatedAt) * 1000;

      setOraclePrices(prev => ({
        ...prev,
        ethUsd: {
          price: ethPrice.toFixed(2),
          timestamp,
          status: 'success',
        },
      }));

      toast.success('ETH/USD price fetched successfully!');
    } catch (error: any) {
      console.error('Error fetching ETH price:', error);
      const errorMsg = error.message || 'Unknown error';
      setOraclePrices(prev => ({
        ...prev,
        ethUsd: {
          ...prev.ethUsd,
          status: 'error',
          error: errorMsg,
        },
      }));
      toast.error(`Failed to fetch ETH/USD: ${errorMsg}`);
    }
  };

  const handleCheckWBTCPrice = async () => {
    setOraclePrices(prev => ({ ...prev, wbtcUsd: { ...prev.wbtcUsd, status: 'loading' } }));
    try {
      const { getProvider } = await import('@/lib/contracts');
      const provider = await getProvider();
      const { Contract } = await import('ethers');
      const { wbtcUsdFeed } = await getOracleAddresses();

      const wbtcOracle = new Contract(wbtcUsdFeed, ORACLE_ABI, provider);
      const [wbtcData, wbtcDecimals] = await Promise.all([
        wbtcOracle.latestRoundData().catch((e: any) => {
          if (e.message?.includes('BAD_DATA') || e.message?.includes('could not decode')) {
            throw new Error('Oracle returned empty data. The oracle may not be configured or may be on a different network.');
          }
          throw e;
        }),
        wbtcOracle.decimals(),
      ]);

      const wbtcPrice = Number(wbtcData.answer) / Math.pow(10, Number(wbtcDecimals));
      const timestamp = Number(wbtcData.updatedAt) * 1000;

      setOraclePrices(prev => ({
        ...prev,
        wbtcUsd: {
          price: wbtcPrice.toFixed(2),
          timestamp,
          status: 'success',
        },
      }));

      toast.success('WBTC/USD price fetched successfully!');
    } catch (error: any) {
      console.error('Error fetching WBTC price:', error);
      const errorMsg = error.message || 'Unknown error';
      setOraclePrices(prev => ({
        ...prev,
        wbtcUsd: {
          ...prev.wbtcUsd,
          status: 'error',
          error: errorMsg,
        },
      }));
      toast.error(`Failed to fetch WBTC/USD: ${errorMsg}`);
    }
  };

  const handleSetOracleAddresses = async () => {
    if (!oracleAddresses.ethUsdFeed || !oracleAddresses.wbtcUsdFeed) {
      toast.error('Please enter both oracle addresses');
      return;
    }

    // Validate addresses
    if (!oracleAddresses.ethUsdFeed.startsWith('0x') || oracleAddresses.ethUsdFeed.length !== 42) {
      toast.error('Invalid ETH/USD Oracle address format');
      return;
    }
    if (!oracleAddresses.wbtcUsdFeed.startsWith('0x') || oracleAddresses.wbtcUsdFeed.length !== 42) {
      toast.error('Invalid WBTC/USD Oracle address format');
      return;
    }

    setLoading(true);
    try {
      // Store oracle addresses in localStorage for persistence
      localStorage.setItem('oracleAddresses', JSON.stringify(oracleAddresses));
      toast.success('Oracle addresses saved successfully! They will be used for all price checks.');
    } catch (error: any) {
      console.error('Error setting oracle addresses:', error);
      toast.error(`Failed to set oracle addresses: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Load oracle addresses from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('oracleAddresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ethUsdFeed && parsed.wbtcUsdFeed) {
          setOracleAddresses(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load saved oracle addresses:', e);
    }
  }, []);

  const handleCheckBTCPrice = async () => {
    setOraclePrices(prev => ({ ...prev, btcUsd: { ...prev.btcUsd, status: 'loading' } }));
    try {
      // BTC price is typically same as WBTC (1:1), so we fetch WBTC price
      const { getProvider } = await import('@/lib/contracts');
      const provider = await getProvider();
      const { Contract } = await import('ethers');
      const { wbtcUsdFeed } = await getOracleAddresses();

      const wbtcOracle = new Contract(wbtcUsdFeed, ORACLE_ABI, provider);
      const [wbtcData, wbtcDecimals] = await Promise.all([
        wbtcOracle.latestRoundData().catch((e: any) => {
          if (e.message?.includes('BAD_DATA') || e.message?.includes('could not decode')) {
            throw new Error('Oracle returned empty data. The oracle may not be configured or may be on a different network.');
          }
          throw e;
        }),
        wbtcOracle.decimals(),
      ]);

      const btcPrice = Number(wbtcData.answer) / Math.pow(10, Number(wbtcDecimals));
      const timestamp = Number(wbtcData.updatedAt) * 1000;

      setOraclePrices(prev => ({
        ...prev,
        btcUsd: {
          price: btcPrice.toFixed(2),
          timestamp,
          status: 'success',
        },
      }));

      toast.success('BTC/USD price fetched successfully!');
    } catch (error: any) {
      console.error('Error fetching BTC price:', error);
      const errorMsg = error.message || 'Unknown error';
      setOraclePrices(prev => ({
        ...prev,
        btcUsd: {
          ...prev.btcUsd,
          status: 'error',
          error: errorMsg,
        },
      }));
      toast.error(`Failed to fetch BTC/USD: ${errorMsg}`);
    }
  };

  const handleViewCampaignEvents = async (campaignAddress: string) => {
    if (!campaignAddress) {
      toast.error('Please select a campaign');
      return;
    }

    setLoadingEvents(true);
    try {
      const { getCampaignContract } = await import('@/lib/contracts');
      const campaignContract = await getCampaignContract(campaignAddress);

      // Fetch ContributionReceived events
      const contributionFilter = campaignContract.filters.ContributionReceived();
      const contributions = await campaignContract.queryFilter(contributionFilter, 0, 'latest');

      // Fetch StateChanged events
      const stateFilter = campaignContract.filters.StateChanged();
      const stateChanges = await campaignContract.queryFilter(stateFilter, 0, 'latest');

      // Fetch PayoutReleased events
      const payoutFilter = campaignContract.filters.PayoutReleased();
      const payouts = await campaignContract.queryFilter(payoutFilter, 0, 'latest');

      const events = [
        ...contributions.map((e: any) => ({
          type: 'Contribution',
          contributor: e.args.contributor,
          ethAmount: e.args.ethAmount?.toString(),
          tokenAmount: e.args.tokenAmount?.toString(),
          timestamp: e.args.timestamp?.toString(),
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        })),
        ...stateChanges.map((e: any) => ({
          type: 'State Changed',
          oldState: e.args.oldState?.toString(),
          newState: e.args.newState?.toString(),
          timestamp: e.args.timestamp?.toString(),
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        })),
        ...payouts.map((e: any) => ({
          type: 'Payout Released',
          creator: e.args.creator,
          paidETH: e.args.paidETH?.toString(),
          paidToken: e.args.paidToken?.toString(),
          timestamp: e.args.timestamp?.toString(),
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        })),
      ].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      setCampaignEvents(events);

      // Extract unique donors from contributions
      const donors = Array.from(
        new Map(
          contributions.map((e: any) => [
            e.args.contributor,
            {
              address: e.args.contributor,
              contributions: contributions.filter((c: any) => c.args.contributor === e.args.contributor).length,
            },
          ])
        ).values()
      );

      setCampaignDonors(donors);
      setSelectedCampaignForEvents(campaignAddress);
      toast.success(`Found ${events.length} events and ${donors.length} donors`);
    } catch (error: any) {
      console.error('Error fetching campaign events:', error);
      toast.error(`Failed to fetch events: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingEvents(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Management</h1>
        <p className="mt-2 text-muted-foreground">Manage platform administrators and permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border hover:border-primary/50 transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Add Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => openDialog('add', 'Add New Admin', 'Enter the Ethereum address to grant admin privileges.')}
            >
              Add Admin
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-destructive" />
              Remove Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => openDialog('remove', 'Remove Admin', 'Enter the Ethereum address to revoke admin privileges.')}
            >
              Remove Admin
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Check Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openDialog('check', 'Check Admin Status', 'Enter the Ethereum address to verify admin status.')}
            >
              Check Admin
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-amber-500" />
              Transfer Creator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openDialog('transfer', 'Transfer Creator', 'Enter the new creator address to transfer ownership.')}
            >
              Transfer Creator
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Oracle Prices Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Oracle Prices</CardTitle>
          <CardDescription>Check current prices from Chainlink oracles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Admin Oracle Address Configuration */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="text-sm font-semibold mb-3">
              Oracle Address Configuration
              {isCurrentUserAdmin && <span className="text-xs text-muted-foreground ml-2">(Admin Only)</span>}
            </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="eth-oracle">ETH/USD Oracle Address</Label>
                  <Input
                    id="eth-oracle"
                    placeholder="0x..."
                    value={oracleAddresses.ethUsdFeed}
                    onChange={(e) => setOracleAddresses(prev => ({ ...prev, ethUsdFeed: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wbtc-oracle">WBTC/USD Oracle Address</Label>
                  <Input
                    id="wbtc-oracle"
                    placeholder="0x..."
                    value={oracleAddresses.wbtcUsdFeed}
                    onChange={(e) => setOracleAddresses(prev => ({ ...prev, wbtcUsdFeed: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={handleSetOracleAddresses}
                disabled={loading || !oracleAddresses.ethUsdFeed || !oracleAddresses.wbtcUsdFeed}
                variant="outline"
                size="sm"
                className="w-full mt-3"
              >
                <Send className="h-3 w-3 mr-2" />
                Set Oracle Addresses
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Addresses are saved locally and will be used for all price checks. If not set, the system will try to fetch them from existing campaigns.
              </p>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ETH/USD */}
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold">ETH/USD</p>
                </div>
                <Badge 
                  variant={
                    oraclePrices.ethUsd.status === 'success' ? 'default' :
                    oraclePrices.ethUsd.status === 'error' ? 'destructive' :
                    oraclePrices.ethUsd.status === 'loading' ? 'secondary' : 'outline'
                  }
                  className="text-xs"
                >
                  {oraclePrices.ethUsd.status === 'success' ? 'Live' :
                   oraclePrices.ethUsd.status === 'error' ? 'Error' :
                   oraclePrices.ethUsd.status === 'loading' ? 'Loading...' : 'Idle'}
                </Badge>
              </div>
              {oraclePrices.ethUsd.price ? (
                <>
                  <p className="text-3xl font-bold mb-2">${oraclePrices.ethUsd.price}</p>
                  {oraclePrices.ethUsd.timestamp && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Updated: {new Date(oraclePrices.ethUsd.timestamp).toLocaleString()}
                    </p>
                  )}
                </>
              ) : oraclePrices.ethUsd.error ? (
                <p className="text-sm text-destructive mb-3">{oraclePrices.ethUsd.error}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">No price data</p>
              )}
              <Button
                onClick={handleCheckETHPrice}
                disabled={oraclePrices.ethUsd.status === 'loading'}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <TrendingUp className="h-3 w-3 mr-2" />
                {oraclePrices.ethUsd.status === 'loading' ? 'Fetching...' : 'Fetch ETH Price'}
              </Button>
            </div>

            {/* WBTC/USD */}
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500/20 rounded-md">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-sm font-semibold">WBTC/USD</p>
                </div>
                <Badge 
                  variant={
                    oraclePrices.wbtcUsd.status === 'success' ? 'default' :
                    oraclePrices.wbtcUsd.status === 'error' ? 'destructive' :
                    oraclePrices.wbtcUsd.status === 'loading' ? 'secondary' : 'outline'
                  }
                  className="text-xs"
                >
                  {oraclePrices.wbtcUsd.status === 'success' ? 'Live' :
                   oraclePrices.wbtcUsd.status === 'error' ? 'Error' :
                   oraclePrices.wbtcUsd.status === 'loading' ? 'Loading...' : 'Idle'}
                </Badge>
              </div>
              {oraclePrices.wbtcUsd.price ? (
                <>
                  <p className="text-3xl font-bold mb-2">${oraclePrices.wbtcUsd.price}</p>
                  {oraclePrices.wbtcUsd.timestamp && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Updated: {new Date(oraclePrices.wbtcUsd.timestamp).toLocaleString()}
                    </p>
                  )}
                </>
              ) : oraclePrices.wbtcUsd.error ? (
                <p className="text-sm text-destructive mb-3">{oraclePrices.wbtcUsd.error}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">No price data</p>
              )}
              <Button
                onClick={handleCheckWBTCPrice}
                disabled={oraclePrices.wbtcUsd.status === 'loading'}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <TrendingUp className="h-3 w-3 mr-2" />
                {oraclePrices.wbtcUsd.status === 'loading' ? 'Fetching...' : 'Fetch WBTC Price'}
              </Button>
            </div>

            {/* BTC/USD */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 rounded-md">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold">BTC/USD</p>
                </div>
                <Badge 
                  variant={
                    oraclePrices.btcUsd.status === 'success' ? 'default' :
                    oraclePrices.btcUsd.status === 'error' ? 'destructive' :
                    oraclePrices.btcUsd.status === 'loading' ? 'secondary' : 'outline'
                  }
                  className="text-xs"
                >
                  {oraclePrices.btcUsd.status === 'success' ? 'Live' :
                   oraclePrices.btcUsd.status === 'error' ? 'Error' :
                   oraclePrices.btcUsd.status === 'loading' ? 'Loading...' : 'Idle'}
                </Badge>
              </div>
              {oraclePrices.btcUsd.price ? (
                <>
                  <p className="text-3xl font-bold mb-2">${oraclePrices.btcUsd.price}</p>
                  {oraclePrices.btcUsd.timestamp && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Updated: {new Date(oraclePrices.btcUsd.timestamp).toLocaleString()}
                    </p>
                  )}
                </>
              ) : oraclePrices.btcUsd.error ? (
                <p className="text-sm text-destructive mb-3">{oraclePrices.btcUsd.error}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">No price data</p>
              )}
              <Button
                onClick={handleCheckBTCPrice}
                disabled={oraclePrices.btcUsd.status === 'loading'}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <TrendingUp className="h-3 w-3 mr-2" />
                {oraclePrices.btcUsd.status === 'loading' ? 'Fetching...' : 'Fetch BTC Price'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Events & Donors Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Campaign Events & Donors</CardTitle>
          <CardDescription>View events and donors for a specific campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter campaign address (0x...)"
                value={selectedCampaignForEvents}
                onChange={(e) => setSelectedCampaignForEvents(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleViewCampaignEvents(selectedCampaignForEvents)}
                disabled={!selectedCampaignForEvents || loadingEvents}
              >
                <Eye className="h-4 w-4 mr-2" />
                {loadingEvents ? 'Loading...' : 'View Events'}
              </Button>
            </div>

            {campaignEvents.length > 0 && (
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recent Events ({campaignEvents.length})</h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {campaignEvents.slice(0, 20).map((event, idx) => (
                      <div key={idx} className="p-3 bg-secondary/30 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{event.type}</span>
                          {event.txHash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View TX
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {event.contributor && <p>Contributor: {event.contributor.slice(0, 10)}...{event.contributor.slice(-8)}</p>}
                          {event.ethAmount && <p>ETH: {Number(event.ethAmount) / 1e18} ETH</p>}
                          {event.tokenAmount && <p>Token: {Number(event.tokenAmount) / 1e18} WBTC</p>}
                          {event.oldState !== undefined && <p>State: {event.oldState} → {event.newState}</p>}
                          {event.creator && <p>Creator: {event.creator.slice(0, 10)}...{event.creator.slice(-8)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {campaignDonors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Donors ({campaignDonors.length})</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {campaignDonors.map((donor, idx) => (
                        <div key={idx} className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm font-mono">{donor.address.slice(0, 10)}...{donor.address.slice(-8)}</p>
                            <p className="text-xs text-muted-foreground">{donor.contributions} contribution(s)</p>
                          </div>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Existing Admins</CardTitle>
          <CardDescription>List of all platform administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Address</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Added By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Added At</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.address} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">{admin.address}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-muted-foreground">
                          {formatAddress(admin.addedBy)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{admin.addedAt}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {admin.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Recent admin management actions from contract events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activityLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity logged yet
              </div>
            ) : (
              activityLog.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      log.action.includes('Added') ? 'bg-green-500/10 text-green-500' :
                      log.action.includes('Removed') ? 'bg-red-500/10 text-red-500' :
                      log.action.includes('Transferred') ? 'bg-amber-500/10 text-amber-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {log.action.includes('Added') && <UserPlus className="h-4 w-4" />}
                      {log.action.includes('Removed') && <UserMinus className="h-4 w-4" />}
                      {log.action.includes('Transferred') && <Send className="h-4 w-4" />}
                      {log.action.includes('Checked') && <Shield className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.performer} → {log.target}
                      </p>
                      {log.txHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${log.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline mt-1 inline-block"
                        >
                          View Transaction
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {log.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogState.open} onOpenChange={(open) => setDialogState({ ...dialogState, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogState.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogState.description}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="address">Ethereum Address</Label>
            <Input
              id="address"
              placeholder="0x..."
              value={
                dialogState.action === 'add' ? addAdminAddress :
                dialogState.action === 'remove' ? removeAdminAddress :
                dialogState.action === 'check' ? checkAdminAddress :
                transferCreatorAddress
              }
              onChange={(e) => {
                if (dialogState.action === 'add') setAddAdminAddress(e.target.value);
                else if (dialogState.action === 'remove') setRemoveAdminAddress(e.target.value);
                else if (dialogState.action === 'check') setCheckAdminAddress(e.target.value);
                else setTransferCreatorAddress(e.target.value);
              }}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (dialogState.action === 'add') handleAddAdmin();
                else if (dialogState.action === 'remove') handleRemoveAdmin();
                else if (dialogState.action === 'check') handleCheckAdmin();
                else handleTransferCreator();
              }}
              disabled={loading || isWritePending || isConfirming}
            >
              {isWritePending || isConfirming ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}