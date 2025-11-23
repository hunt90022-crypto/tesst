import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount, useWatchContractEvent, useChainId } from 'wagmi';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from '@/config/contracts';
import { parseUnits, formatEther } from 'ethers';
import { Play, Pause, X, Send, Wallet, DollarSign, TrendingUp, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useCampaign } from '@/hooks/useCampaign';
import { formatCampaignState } from '@/lib/contracts';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const CampaignDetails = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Fetch campaign data from contract
  const { campaign, loading: campaignLoading, refetch: refetchCampaign } = useCampaign(address || '');

  const [ethAmount, setEthAmount] = useState('');
  const [wbtcAmount, setWbtcAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
  }>({ open: false, action: '', title: '', description: '' });
  const [transferAddress, setTransferAddress] = useState('');
  const [useFunds, setUseFunds] = useState(false);
  const [isDonation, setIsDonation] = useState(false);

  const factoryAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.CampaignFactory 
    || CONTRACT_ADDRESSES[11155111].CampaignFactory;

  // Check if user is admin
  const { data: isAdmin } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    functionName: 'isAdmin',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const processedHashRef = useRef<string | null>(null);

  // Watch for contract events to update campaign data
  useWatchContractEvent({
    address: address as `0x${string}`,
    abi: CONTRACT_ABIS.Campaign,
    eventName: 'ContributionReceived',
    onLogs() {
      setTimeout(() => refetchCampaign(), 2000);
    },
  });

  useWatchContractEvent({
    address: address as `0x${string}`,
    abi: CONTRACT_ABIS.Campaign,
    eventName: 'StateChanged',
    onLogs() {
      setTimeout(() => refetchCampaign(), 2000);
    },
  });

  useWatchContractEvent({
    address: address as `0x${string}`,
    abi: CONTRACT_ABIS.Campaign,
    eventName: 'PayoutReleased',
    onLogs() {
      setTimeout(() => refetchCampaign(), 2000);
    },
  });

  useEffect(() => {
    if (isConfirmed && hash && processedHashRef.current !== hash) {
      processedHashRef.current = hash;
      toast.success('Transaction confirmed successfully!');
      // Close dialog and refresh campaign data
      setActionDialog({ open: false, action: '', title: '', description: '' });
      setLoading(false);
      // Clear form fields
      setTransferAddress('');
      setUseFunds(false);
      setIsDonation(false);
      setTimeout(() => {
        refetchCampaign();
      }, 2000);
    }
  }, [isConfirmed, hash, refetchCampaign]);

  if (campaignLoading || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: any }> = {
    'Active': { label: 'Active', variant: 'default', icon: CheckCircle },
    'Paused': { label: 'Paused', variant: 'secondary', icon: Pause },
    'Completed': { label: 'Completed', variant: 'default', icon: CheckCircle },
    'Failed': { label: 'Failed', variant: 'destructive', icon: AlertCircle },
    'Cancelled': { label: 'Cancelled', variant: 'destructive', icon: X },
    'DonationOnly': { label: 'Donation Only', variant: 'default', icon: DollarSign },
  };

  const status = statusMap[campaign.statusLabel] || statusMap['Active'];
  const StatusIcon = status.icon;
  const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
  const daysLeft = Math.ceil((campaign.deadline - Date.now()) / (1000 * 60 * 60 * 24));

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

  // Button state logic based on campaign status
  // Status mapping: 0 = Active, 1 = Paused, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = DonationOnly
  const isTerminalState = campaign.status === 2 || campaign.status === 3 || campaign.status === 4; // Completed, Failed, or Cancelled
  const canActivate = campaign.status === 1 && !isTerminalState; // Only when Paused and not in terminal state
  const canPause = campaign.status === 0 && !isTerminalState; // Only when Active and not in terminal state
  const canCancel = !isTerminalState && campaign.status !== 5; // Not in terminal state and not DonationOnly
  const isCreator = userAddress?.toLowerCase() === campaign.creator.toLowerCase();
  const isAdminUser = isAdmin === true;
  
  // Finalize button: only clickable if goal OR deadline is reached
  const goalReached = campaign.raised >= campaign.goal;
  const deadlineReached = Date.now() >= campaign.deadline;
  const canFinalize = isCreator && (goalReached || deadlineReached) && campaign.status !== 2 && campaign.status !== 3 && campaign.status !== 4;
  
  // Withdraw button: only clickable after campaign is finalized (status === 2 Completed)
  const canWithdraw = isCreator && campaign.status === 2 && !campaign.paidOut;

  const handleAction = (action: string, title: string, description: string) => {
    setActionDialog({ open: true, action, title, description });
  };

  const executeAction = async () => {
    if (!address) {
      toast.error('Campaign address is required');
      return;
    }

    setLoading(true);

    try {
      let functionName = '';
      if (actionDialog.action === 'activate') {
        functionName = 'Activate';
      } else if (actionDialog.action === 'pause') {
        functionName = 'Pause';
      } else if (actionDialog.action === 'cancel') {
        functionName = 'Cancel';
      } else {
        toast.error('Unknown action');
        setLoading(false);
        return;
      }

      writeContract({
        address: address as `0x${string}`,
        abi: CONTRACT_ABIS.Campaign,
        functionName: functionName as any,
      } as any, {
        onError: (error: any) => {
          toast.error(`Failed to ${actionDialog.action}: ${error.message || error.reason || 'Unknown error'}`);
          setLoading(false);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
          // Dialog will close automatically when transaction is confirmed
        },
      });
    } catch (error: any) {
      toast.error(`Action failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleContributeETH = async () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      toast.error('Please enter a valid ETH amount');
      return;
    }

    if (!address) {
      toast.error('Campaign address is required');
      return;
    }

    setLoading(true);
    try {
      const amountWei = parseUnits(ethAmount, 18);

      writeContract({
        address: address as `0x${string}`,
        abi: CONTRACT_ABIS.Campaign,
        functionName: 'contribute',
        value: amountWei,
      } as any, {
        onError: (error: any) => {
          toast.error(`Failed to contribute: ${error.message || error.reason || 'Unknown error'}`);
          setLoading(false);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
          setEthAmount('');
          // Will auto-refresh when transaction is confirmed
        },
      });
    } catch (error: any) {
      toast.error(`Contribution failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleContributeWBTC = async () => {
    if (!wbtcAmount || parseFloat(wbtcAmount) <= 0) {
      toast.error('Please enter a valid WBTC amount');
      return;
    }

    if (!address) {
      toast.error('Campaign address is required');
      return;
    }

    if (!campaign.tokenEnabled) {
      toast.error('Token contributions are not enabled for this campaign');
      return;
    }

    setLoading(true);
    try {
      const amountWei = parseUnits(wbtcAmount, 18);

      writeContract({
        address: address as `0x${string}`,
        abi: CONTRACT_ABIS.Campaign,
        functionName: 'contributeWBTC',
        args: [amountWei],
      } as any, {
        onError: (error: any) => {
          toast.error(`Failed to contribute WBTC: ${error.message || error.reason || 'Unknown error'}`);
          setLoading(false);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
          setWbtcAmount('');
          // Will auto-refresh when transaction is confirmed
        },
      });
    } catch (error: any) {
      toast.error(`Contribution failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleTransferCreator = async () => {
    if (!transferAddress || !/^0x[a-fA-F0-9]{40}$/.test(transferAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (!address) {
      toast.error('Campaign address is required');
      return;
    }

    // Transfer Creator is admin-only, not creator-only
    if (!isAdminUser) {
      toast.error('Only admins can transfer campaign creator ownership');
      return;
    }

    setLoading(true);
    try {
      writeContract({
        address: address as `0x${string}`,
        abi: CONTRACT_ABIS.Campaign,
        functionName: 'transferCreator',
        args: [transferAddress as `0x${string}`],
      } as any, {
        onError: (error: any) => {
          toast.error(`Failed to transfer creator: ${error.message || error.reason || 'Unknown error'}`);
          setLoading(false);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
          setTransferAddress('');
          // Dialog will close automatically when transaction is confirmed
        },
      });
    } catch (error: any) {
      toast.error(`Transfer failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address) {
      toast.error('Campaign address is required');
      return;
    }

    if (userAddress?.toLowerCase() !== campaign.creator.toLowerCase()) {
      toast.error('Only the campaign creator can withdraw funds');
      return;
    }

    setLoading(true);
    try {
      writeContract({
        address: address as `0x${string}`,
        abi: CONTRACT_ABIS.Campaign,
        functionName: 'withdrawPayout',
      } as any, {
        onError: (error: any) => {
          toast.error(`Failed to withdraw: ${error.message || error.reason || 'Unknown error'}`);
          setLoading(false);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
          // Dialog will close automatically when transaction is confirmed
        },
      });
    } catch (error: any) {
      toast.error(`Withdrawal failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!address) {
      toast.error('Campaign address is required');
      return;
    }

    if (userAddress?.toLowerCase() !== campaign.creator.toLowerCase()) {
      toast.error('Only the campaign creator can finalize the campaign');
      return;
    }

    setLoading(true);
    try {
      writeContract({
        address: address as `0x${string}`,
        abi: CONTRACT_ABIS.Campaign,
        functionName: 'finalizeAfterDeadline',
        args: [useFunds, isDonation],
      } as any, {
        onError: (error: any) => {
          toast.error(`Failed to finalize: ${error.message || error.reason || 'Unknown error'}`);
          setLoading(false);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
          setUseFunds(false);
          setIsDonation(false);
          // Dialog will close automatically when transaction is confirmed
        },
      });
    } catch (error: any) {
      toast.error(`Finalize failed: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">Campaign Address: {campaign.address}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Campaign Overview</CardTitle>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {campaign.statusLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-semibold">
                      {progress > 100 ? '100%' : progress.toFixed(1)}%
                      {progress >= 100 && ' - Goal Reached!'}
                    </span>
                  </div>
                  <Progress value={progress > 100 ? 100 : progress} className="h-3" />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      ${campaign.raised.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} raised
                    </span>
                    <span>
                      ${campaign.goal.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} goal
                    </span>
                  </div>
                  {campaign.goal > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {campaign.goal - campaign.raised > 0 
                        ? `$${(campaign.goal - campaign.raised).toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })} remaining`
                        : 'Goal reached!'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ETH Balance</p>
                    <p className="text-lg font-bold text-foreground">{campaign.ethBalance.toFixed(4)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">WBTC Balance</p>
                    <p className="text-lg font-bold text-foreground">{campaign.wbtcBalance.toFixed(4)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Days Left</p>
                    <p className="text-lg font-bold text-foreground">{daysLeft}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Paid Out</p>
                    <p className="text-lg font-bold text-foreground">{campaign.paidOut ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {campaign.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Campaign Address</p>
                    <p className="font-mono text-xs break-all">{campaign.address}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Creator</p>
                    <p className="font-mono text-xs break-all">{campaign.creator}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Admin</p>
                    <p className="font-mono text-xs break-all">{campaign.admin}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Factory</p>
                    <p className="font-mono text-xs break-all">{campaign.factory}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Deadline</p>
                    <p className="font-medium">{formatDate(campaign.deadline)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Started</p>
                    <p className="font-medium">{campaign.startedDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Token Enabled</p>
                    <p className="font-medium">{campaign.tokenEnabled ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground mb-1 text-sm">Metadata Hash</p>
                  <p className="font-mono text-xs break-all">{campaign.metadataHash}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Controls</CardTitle>
                <CardDescription>Manage campaign state and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleAction('activate', 'Activate Campaign', 'This will activate the campaign and allow contributions.')}
                        disabled={!canActivate || loading || isWritePending || isConfirming}
                      >
                        <Play className="h-4 w-4" />
                        Activate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canActivate ? 'Activate the campaign' : 'Can only activate when campaign is Paused'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleAction('pause', 'Pause Campaign', 'This will temporarily pause the campaign.')}
                        disabled={!canPause || loading || isWritePending || isConfirming}
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canPause ? 'Pause the campaign' : 'Can only pause when campaign is Active'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => handleAction('cancel', 'Cancel Campaign', 'This will permanently cancel the campaign. This action cannot be undone.')}
                        disabled={!canCancel || loading || isWritePending || isConfirming}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canCancel ? 'Cancel the campaign permanently' : 'Campaign cannot be cancelled in current state'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleAction('transfer', 'Transfer Creator', 'Transfer campaign ownership to a new address. Admin only.')}
                        disabled={!isAdminUser || loading || isWritePending || isConfirming}
                      >
                        <Send className="h-4 w-4" />
                        Transfer Creator
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isAdminUser ? 'Transfer creator ownership (Admin only)' : 'Only admins can transfer creator ownership'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleAction('finalize', 'Finalize Campaign', 'Finalize the campaign after goal or deadline is reached.')}
                        disabled={!canFinalize || loading || isWritePending || isConfirming}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Finalize
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canFinalize 
                        ? 'Finalize campaign after goal or deadline is reached (Creator only)' 
                        : !isCreator 
                          ? 'Only the campaign creator can finalize'
                          : !goalReached && !deadlineReached
                            ? 'Goal or deadline must be reached to finalize'
                            : 'Campaign cannot be finalized in current state'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="gap-2"
                        onClick={() => handleAction('withdraw', 'Withdraw Funds', 'Withdraw raised funds to creator address.')}
                        disabled={!canWithdraw || loading || isWritePending || isConfirming}
                      >
                        <Wallet className="h-4 w-4" />
                        Withdraw
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canWithdraw 
                        ? 'Withdraw raised funds (Creator only)' 
                        : campaign.paidOut 
                          ? 'Funds already withdrawn'
                          : campaign.status !== 2
                            ? 'Campaign must be finalized (Completed) before withdrawing'
                            : !isCreator
                              ? 'Only the campaign creator can withdraw'
                              : 'Cannot withdraw at this time'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contribute ETH</CardTitle>
                <CardDescription>Support this campaign with ETH</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eth-amount">Amount (ETH)</Label>
                  <Input
                    id="eth-amount"
                    type="number"
                    placeholder="0.0"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    step="0.001"
                    min="0"
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleContributeETH}
                  disabled={loading || !ethAmount}
                >
                  <DollarSign className="h-4 w-4" />
                  Contribute ETH
                </Button>
              </CardContent>
            </Card>

            {campaign.tokenEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Contribute WBTC</CardTitle>
                  <CardDescription>Support this campaign with WBTC</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wbtc-amount">Amount (WBTC)</Label>
                    <Input
                      id="wbtc-amount"
                      type="number"
                      placeholder="0.0"
                      value={wbtcAmount}
                      onChange={(e) => setWbtcAmount(e.target.value)}
                      step="0.0001"
                      min="0"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleContributeWBTC}
                    disabled={loading || !wbtcAmount}
                  >
                    <DollarSign className="h-4 w-4" />
                    Contribute WBTC
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Campaign Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Goal Status</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {progress >= 100 
                      ? 'Goal Achieved!' 
                      : progress >= 75 
                        ? 'Almost There!' 
                        : `${Math.max(0, (100 - progress)).toFixed(1)}% Remaining`}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Backers</span>
                  </div>
                  <span className="text-sm font-semibold">127</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Time Remaining</span>
                  </div>
                  <span className="text-sm font-semibold">{daysLeft} days</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm">Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">KYC Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Smart Contract Audited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Team Verified</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{actionDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{actionDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>

            {actionDialog.action === 'transfer' && (
              <div className="space-y-2 py-4">
                <Label htmlFor="transfer-address">New Creator Address</Label>
                <Input
                  id="transfer-address"
                  placeholder="0x..."
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                />
              </div>
            )}

            {actionDialog.action === 'finalize' && (
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-funds"
                    checked={useFunds}
                    onCheckedChange={(checked) => setUseFunds(checked as boolean)}
                  />
                  <Label htmlFor="use-funds" className="cursor-pointer">
                    Use Funds Anyway
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  If enabled, funds will be used even if the goal was not reached
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="as-donation"
                    checked={isDonation}
                    onCheckedChange={(checked) => setIsDonation(checked as boolean)}
                  />
                  <Label htmlFor="as-donation" className="cursor-pointer">
                    Treat as Donation
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  If enabled, the campaign will be finalized as a donation campaign
                </p>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (actionDialog.action === 'transfer') {
                    handleTransferCreator();
                  } else if (actionDialog.action === 'withdraw') {
                    handleWithdraw();
                  } else if (actionDialog.action === 'finalize') {
                    handleFinalize();
                  } else {
                    executeAction();
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default CampaignDetails;
