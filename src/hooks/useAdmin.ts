import { useState, useEffect, useCallback } from 'react';
import { getCampaignFactoryContract, getSigner, getProvider } from '@/lib/contracts';
import { toast } from '@/components/ui/sonner';
import { Contract } from 'ethers';
import CampaignFactoryABI from '@/abi/CampaignFactory.json';

export interface AdminInfo {
  address: string;
  addedBy: string;
  addedAt: string;
  status: 'active' | 'pending' | 'removed';
}

export interface ActivityLog {
  id: string;
  action: string;
  performer: string;
  target: string;
  timestamp: string;
  txHash?: string;
}

export function useAdmin(factoryAddress: string) {
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  // Check if current wallet is admin
  const checkCurrentUserAdmin = useCallback(async () => {
    try {
      const signer = await getSigner();
      if (!signer) {
        setIsAdmin(false);
        setCurrentAddress(null);
        return;
      }

      const address = await signer.getAddress();
      setCurrentAddress(address);

      const factory = await getCampaignFactoryContract();
      if (factory && typeof factory.isAdmin === 'function') {
        const adminStatus = await factory.isAdmin(address);
        setIsAdmin(adminStatus);
      } else {
        console.warn('isAdmin method not available on contract');
        setIsAdmin(false);
      }
    } catch (err: any) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  }, []);

  // Fetch all admins from contract events
  const fetchAdmins = useCallback(async () => {
    if (!factoryAddress) {
      setError('Factory address is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await checkCurrentUserAdmin();

      // Get provider and create contract instance
      const provider = await getProvider();
      let abi: any = CampaignFactoryABI;
      
      if (abi && typeof abi === 'object' && 'default' in abi && !Array.isArray(abi)) {
        abi = abi.default;
      }
      
      if (!Array.isArray(abi)) {
        throw new Error('CampaignFactory ABI must be an array');
      }

      const factory = new Contract(factoryAddress, abi, provider);

      // Query AdminAdded events
      const addedFilter = factory.filters.AdminAdded();
      const addedEvents = await factory.queryFilter(addedFilter, 0, 'latest');

      // Query AdminRemoved events
      const removedFilter = factory.filters.AdminRemoved();
      const removedEvents = await factory.queryFilter(removedFilter, 0, 'latest');

      // Build admin map from events
      const adminMap = new Map<string, { addedBy: string; addedAt: number; removedAt?: number }>();
      const activityLogs: ActivityLog[] = [];

      // Process AdminAdded events
      for (const event of addedEvents) {
        if (event.args && event.args[0]) {
          const adminAddress = event.args[0] as string;
          const block = await provider.getBlock(event.blockNumber);
          const tx = await provider.getTransaction(event.transactionHash);
          
          adminMap.set(adminAddress.toLowerCase(), {
            addedBy: tx.from || 'Unknown',
            addedAt: block.timestamp,
          });

          activityLogs.push({
            id: `${event.transactionHash}-${event.logIndex}`,
            action: 'Admin Added',
            performer: tx.from || 'Unknown',
            target: adminAddress,
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            txHash: event.transactionHash,
          });
        }
      }

      // Process AdminRemoved events
      for (const event of removedEvents) {
        if (event.args && event.args[0]) {
          const adminAddress = event.args[0] as string;
          const block = await provider.getBlock(event.blockNumber);
          const tx = await provider.getTransaction(event.transactionHash);
          
          const admin = adminMap.get(adminAddress.toLowerCase());
          if (admin) {
            admin.removedAt = block.timestamp;
          }

          activityLogs.push({
            id: `${event.transactionHash}-${event.logIndex}`,
            action: 'Admin Removed',
            performer: tx.from || 'Unknown',
            target: adminAddress,
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            txHash: event.transactionHash,
          });
        }
      }

      // Convert map to array and verify current status
      const adminList: AdminInfo[] = [];
      for (const [address, info] of adminMap.entries()) {
        // Verify current status using isAdmin function
        let isCurrentlyAdmin = false;
        try {
          isCurrentlyAdmin = await factory.isAdmin(address);
        } catch (e) {
          console.warn(`Could not check admin status for ${address}:`, e);
        }

        // Only include if currently an admin (not removed)
        if (isCurrentlyAdmin) {
          adminList.push({
            address,
            addedBy: info.addedBy,
            addedAt: new Date(info.addedAt * 1000).toISOString().split('T')[0],
            status: 'active',
          });
        }
      }

      // Sort by added date (newest first)
      adminList.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      
      // Sort activity logs by timestamp (newest first)
      activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAdmins(adminList);
      setActivityLog(activityLogs);
    } catch (err: any) {
      console.error('Error fetching admins:', err);
      setError(err.message || 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  }, [factoryAddress, checkCurrentUserAdmin]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const addAdmin = useCallback(async (address: string) => {
    try {
      const signer = await getSigner();
      if (!signer) {
        toast.error('Please connect your wallet');
        return false;
      }

      const factory = await getCampaignFactoryContract(true);
      const tx = await factory.addAdmin(address);
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      toast.success('Admin added successfully!');
      
      await fetchAdmins();
      return true;
    } catch (err: any) {
      console.error('Error adding admin:', err);
      toast.error(err.reason || err.message || 'Failed to add admin');
      return false;
    }
  }, [fetchAdmins]);

  const removeAdmin = useCallback(async (address: string) => {
    try {
      const signer = await getSigner();
      if (!signer) {
        toast.error('Please connect your wallet');
        return false;
      }

      const factory = await getCampaignFactoryContract(true);
      const tx = await factory.removeAdmin(address);
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      toast.success('Admin removed successfully!');
      
      await fetchAdmins();
      return true;
    } catch (err: any) {
      console.error('Error removing admin:', err);
      toast.error(err.reason || err.message || 'Failed to remove admin');
      return false;
    }
  }, [fetchAdmins]);

  const checkAdminStatus = useCallback(async (address: string): Promise<boolean> => {
    try {
      const factory = await getCampaignFactoryContract();
      const status = await factory.isAdmin(address);
      return status;
    } catch (err: any) {
      console.error('Error checking admin status:', err);
      toast.error(err.message || 'Failed to check admin status');
      return false;
    }
  }, []);

  return {
    admins,
    activityLog,
    loading,
    error,
    isAdmin,
    currentAddress,
    addAdmin,
    removeAdmin,
    checkAdminStatus,
    refetch: fetchAdmins,
  };
}

