import { useState, useEffect, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACT_ABIS } from '@/config/contracts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  factoryAddress: string;
}

const CampaignModal = ({ isOpen, onClose, factoryAddress }: CampaignModalProps) => {
  const [loading, setLoading] = useState(false);
  const [tokenEnabled, setTokenEnabled] = useState(true);
  const [customFactoryAddress, setCustomFactoryAddress] = useState(factoryAddress);
  const [formData, setFormData] = useState({
    creatorAddress: '',
    campaignLabel: '',
    goalAmount: '',
    metadataHash: '',
    deadline: '',
    wbtcAddress: '',
    ethUsdFeed: '',
    wbtcUsdFeed: ''
  });

  useEffect(() => {
    setCustomFactoryAddress(factoryAddress);
  }, [factoryAddress]);

  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Track which transaction hash we've already processed to prevent duplicate notifications
  const processedHashRef = useRef<string | null>(null);
  const previousConfirmedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  
  // Keep onClose ref up to date without causing re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle successful campaign creation - only once per transaction hash
  useEffect(() => {
    // Only process if:
    // 1. Transaction is confirmed (changed from false to true)
    // 2. We have a hash
    // 3. We haven't processed this specific hash yet
    const isNewlyConfirmed = isConfirmed && !previousConfirmedRef.current;
    
    if (isNewlyConfirmed && hash && processedHashRef.current !== hash) {
      // Mark this hash as processed immediately to prevent duplicate processing
      processedHashRef.current = hash;
      previousConfirmedRef.current = true;
      
      console.log('✅ Campaign creation confirmed, processing success...');
      toast.success('Campaign created successfully!');
      
      // Emit event to parent to trigger refresh (only once per transaction)
      window.dispatchEvent(new CustomEvent('campaignCreated', { 
        detail: { 
          timestamp: Date.now(),
          txHash: hash 
        } 
      }));
      
      // Close modal and reset form using ref to avoid dependency issues
      onCloseRef.current();
      setFormData({
        creatorAddress: '',
        campaignLabel: '',
        goalAmount: '',
        metadataHash: '',
        deadline: '',
        wbtcAddress: '',
        ethUsdFeed: '',
        wbtcUsdFeed: ''
      });
    }
    
    // Update previous confirmed state
    previousConfirmedRef.current = isConfirmed;
  }, [isConfirmed, hash]); // Removed onClose from dependencies

  // Reset processed hash and confirmation state when modal opens/closes to allow new transactions
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes to allow processing new transactions
      processedHashRef.current = null;
      previousConfirmedRef.current = false;
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.creatorAddress || !formData.campaignLabel || !formData.goalAmount || !formData.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);
      
      writeContract({
        address: customFactoryAddress as `0x${string}`,
        abi: CONTRACT_ABIS.CampaignFactory,
        functionName: 'createCampaign',
        args: [
          formData.creatorAddress as `0x${string}`,
          formData.campaignLabel,
          parseUnits(formData.goalAmount, 18), // Assuming 18 decimals for USD goal
          (formData.metadataHash as `0x${string}`) || '0x0000000000000000000000000000000000000000000000000000000000000000',
          BigInt(deadlineTimestamp),
          tokenEnabled,
          (formData.wbtcAddress as `0x${string}`) || '0x0000000000000000000000000000000000000000',
          (formData.ethUsdFeed as `0x${string}`) || '0x0000000000000000000000000000000000000000',
          (formData.wbtcUsdFeed as `0x${string}`) || '0x0000000000000000000000000000000000000000'
        ],
      } as any, {
        onError: (error) => {
          toast.error(`Failed to create campaign: ${error.message}`);
        },
        onSuccess: () => {
          toast.info('Transaction submitted. Waiting for confirmation...');
        }
      });

    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="factory">Factory Address</Label>
            <Input
              id="factory"
              value={customFactoryAddress}
              onChange={(e) => setCustomFactoryAddress(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creator">Creator Address *</Label>
            <Input
              id="creator"
              placeholder="0x..."
              value={formData.creatorAddress}
              onChange={(e) => setFormData({ ...formData, creatorAddress: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Campaign Label *</Label>
            <Input
              id="label"
              placeholder="My Campaign"
              value={formData.campaignLabel}
              onChange={(e) => setFormData({ ...formData, campaignLabel: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal Amount (USD) *</Label>
            <Input
              id="goal"
              type="number"
              placeholder="100000"
              value={formData.goalAmount}
              onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata">Metadata Hash (Optional)</Label>
            <Input
              id="metadata"
              placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
              value={formData.metadataHash}
              onChange={(e) => setFormData({ ...formData, metadataHash: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ethFeed">ETH/USD Price Feed *</Label>
            <Input
              id="ethFeed"
              placeholder="0x..."
              value={formData.ethUsdFeed}
              onChange={(e) => setFormData({ ...formData, ethUsdFeed: e.target.value })}
              required={tokenEnabled}
            />
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="tokenEnabled"
              checked={tokenEnabled}
              onCheckedChange={(checked) => setTokenEnabled(checked as boolean)}
            />
            <Label htmlFor="tokenEnabled" className="cursor-pointer">
              Enable Token Contributions (WBTC)
            </Label>
          </div>

          {tokenEnabled && (
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="wbtc">WBTC Token Address *</Label>
                <Input
                  id="wbtc"
                  placeholder="0x..."
                  value={formData.wbtcAddress}
                  onChange={(e) => setFormData({ ...formData, wbtcAddress: e.target.value })}
                  required={tokenEnabled}
                />
              </div>



              <div className="space-y-2">
                <Label htmlFor="wbtcFeed">WBTC/USD Price Feed *</Label>
                <Input
                  id="wbtcFeed"
                  placeholder="0x..."
                  value={formData.wbtcUsdFeed}
                  onChange={(e) => setFormData({ ...formData, wbtcUsdFeed: e.target.value })}
                  required={tokenEnabled}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || isWritePending || isConfirming}
            >
              {isWritePending || isConfirming ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignModal;