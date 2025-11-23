import { useState, useEffect, useCallback } from 'react';
import { getCampaignFactoryContract, formatCampaignState, formatUSD, CONTRACT_ADDRESSES, getProvider } from '@/lib/contracts';
import { Contract, Interface } from 'ethers';
import CampaignFactoryABI from '@/abi/CampaignFactory.json';

export interface CampaignInfo {
  creator: string;
  label: string;
  createdAt: bigint;
  metadataHash: string;
  goalUSD: bigint;
}

export interface CampaignData {
  address: string;
  name: string;
  creator: string;
  goal: number;
  progress: number;
  status: 'Active' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled' | 'DonationOnly';
  started: string;
  createdAt: number;
  deadline: number; // Unix timestamp in seconds
  metadataHash: string;
}

export function useCampaignFactory(factoryAddress: string) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRaised, setTotalRaised] = useState<number>(0);
  const [activeCampaignCount, setActiveCampaignCount] = useState<number>(0);

  const fetchCampaigns = useCallback(async () => {
    if (!factoryAddress) {
      setError('Factory address is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create factory contract with the provided address
      const provider = await getProvider();
      let abi: any = CampaignFactoryABI;
      
      // Handle different possible import formats
      if (abi && typeof abi === 'object' && 'default' in abi && !Array.isArray(abi)) {
        abi = abi.default;
      }
      
      // Ensure it's an array
      if (!Array.isArray(abi)) {
        throw new Error(`CampaignFactory ABI must be an array. Got: ${typeof abi}`);
      }
      
      const factory = new Contract(
        factoryAddress,
        abi,
        provider
      );
      
      // Verify contract instance
      if (!factory || !factory.target) {
        throw new Error('Failed to create contract instance');
      }
      
      console.log('Factory contract created with address:', factoryAddress);
      
      // Debug: Check if campaignStatus exists in ABI
      const hasCampaignStatus = abi.some((item: any) => 
        item.type === 'function' && item.name === 'campaignStatus'
      );
      console.log('ABI check - has campaignStatus function:', hasCampaignStatus);
      
      // Debug: Check available methods
      console.log('Factory contract methods check:', {
        getAllCampaigns: typeof factory.getAllCampaigns,
        getActiveCampaignCount: typeof factory.getActiveCampaignCount,
        getTotalRaisedUSDPlatform: typeof factory.getTotalRaisedUSDPlatform,
        campaigns: typeof factory.campaigns,
        campaignInfo: typeof factory.campaignInfo,
        campaignStatus: typeof factory.campaignStatus,
        campaignStatusExists: 'campaignStatus' in factory,
        allMethods: Object.keys(factory).filter(key => typeof (factory as any)[key] === 'function')
      });
      
      // Get all campaigns
      // Try getAllCampaigns first, fallback to manual iteration
      let allCampaigns: CampaignInfo[] = [];
      let campaignAddresses: string[] = [];
      
      if (typeof factory.getAllCampaigns === 'function') {
        try {
          allCampaigns = await factory.getAllCampaigns();
          console.log(`getAllCampaigns returned ${allCampaigns.length} campaigns`);
          // If getAllCampaigns worked, we still need to get addresses
          // Try to get them from the campaigns array - this is critical for status fetching
          console.log('Fetching campaign addresses from campaigns array...');
          for (let i = 0; i < allCampaigns.length; i++) {
            try {
              const addr = await factory.campaigns(i);
              if (addr && addr !== '0x0000000000000000000000000000000000000000') {
                campaignAddresses.push(addr);
                console.log(`Found address ${i + 1}: ${addr}`);
              } else {
                console.log(`Empty address at index ${i}, stopping`);
                break;
              }
            } catch (e) {
              console.warn(`Could not fetch campaign address at index ${i}`, e);
              break; // Stop if we hit an error
            }
          }
          console.log(`Collected ${campaignAddresses.length} addresses from campaigns array`);
        } catch (err: any) {
          console.warn('getAllCampaigns failed, trying manual approach:', err);
          // Fall through to manual approach
        }
      }
      
      // If getAllCampaigns doesn't exist or failed, build list manually
      if (allCampaigns.length === 0 && typeof factory.campaigns === 'function') {
        console.log('Building campaign list manually from campaigns array...');
        
        // Iterate through campaigns array until we hit an empty address
        // Limit to 100 to prevent long waits (adjust based on expected campaign count)
        // Optimize by batching requests
        const maxIterations = 100;
        const batchSize = 10; // Fetch 10 addresses at a time
        
        for (let batchStart = 0; batchStart < maxIterations; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize, maxIterations);
          const batchPromises = [];
          
          for (let i = batchStart; i < batchEnd; i++) {
            const addrPromise = factory.campaigns(i).catch((e: any) => {
              const errorMsg = e.message || e.toString() || String(e);
              if (errorMsg.includes('out of bounds') || 
                  errorMsg.includes('execution reverted') ||
                  errorMsg.includes('invalid opcode') ||
                  errorMsg.includes('revert')) {
                return null; // End of array
              }
              throw e;
            });
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            
            batchPromises.push(
              Promise.race([addrPromise, timeoutPromise]).catch(() => null)
            );
          }
          
          const batchResults = await Promise.all(batchPromises);
          let foundAny = false;
          
          for (let i = 0; i < batchResults.length; i++) {
            const addr = batchResults[i] as string | null;
            if (addr && addr !== '0x0000000000000000000000000000000000000000') {
              campaignAddresses.push(addr);
              foundAny = true;
              console.log(`Found campaign ${batchStart + i + 1} at address: ${addr}`);
            }
          }
          
          // If no addresses found in this batch, we've reached the end
          if (!foundAny) {
            console.log(`Reached end of campaigns array at index ${batchStart}`);
            break;
          }
        }
        
        console.log(`Found ${campaignAddresses.length} campaign addresses`);
        
        if (campaignAddresses.length === 0) {
          console.log('No campaigns found in the array. The contract may have no campaigns yet.');
          setCampaigns([]);
          setTotalRaised(0);
          setActiveCampaignCount(0);
          setLoading(false);
          return;
        }
        
        // Get campaign info for each address
        console.log('Fetching campaign info...');
        for (let i = 0; i < campaignAddresses.length; i++) {
          const address = campaignAddresses[i];
          try {
            const info = await factory.campaignInfo(address);
            allCampaigns.push({
              creator: info.creator,
              label: info.label,
              createdAt: info.createdAt,
              metadataHash: info.metadataHash,
              goalUSD: info.goalUSD
            });
            console.log(`Loaded info for campaign ${i + 1}/${campaignAddresses.length}: ${info.label}`);
          } catch (e) {
            console.warn(`Could not get info for campaign ${address}:`, e);
          }
        }
      }
      
      if (allCampaigns.length === 0) {
        console.log('No campaigns found. This might be normal if no campaigns have been created yet.');
        // Don't throw error, just return empty array
        setCampaigns([]);
        setTotalRaised(0);
        setActiveCampaignCount(0);
        setLoading(false);
        return;
      }
      
      console.log(`Successfully loaded ${allCampaigns.length} campaigns`);

      // Ensure we have addresses - this is critical for fetching status
      if (campaignAddresses.length === 0) {
        console.error('No campaign addresses found - cannot fetch status. Need addresses from campaigns array.');
        setCampaigns([]);
        setTotalRaised(0);
        setActiveCampaignCount(0);
        setLoading(false);
        return;
      }

      // If we have addresses but not all campaign info, fetch missing info
      if (campaignAddresses.length > allCampaigns.length) {
        console.log(`Fetching missing campaign info for ${campaignAddresses.length - allCampaigns.length} campaigns...`);
        for (let i = allCampaigns.length; i < campaignAddresses.length; i++) {
          const address = campaignAddresses[i];
          try {
            const info = await factory.campaignInfo(address);
            allCampaigns.push({
              creator: info.creator,
              label: info.label,
              createdAt: info.createdAt,
              metadataHash: info.metadataHash,
              goalUSD: info.goalUSD
            });
          } catch (e) {
            console.warn(`Could not get info for campaign ${address}:`, e);
          }
        }
      }

      // Process all campaigns - for each address, fetch info, status, and details
      // This ensures proper 1:1 mapping between addresses and their data
      console.log(`Processing ${campaignAddresses.length} campaigns with status fetching...`);
      const campaignData: CampaignData[] = await Promise.all(
        campaignAddresses.map(async (address, index) => {
          try {
            // Get campaign info - use index to match with allCampaigns
            const info = allCampaigns[index];
            
            if (!info) {
              console.warn(`No campaign info found for address ${address} at index ${index}`);
              // Try to fetch info directly
              try {
                const fetchedInfo = await factory.campaignInfo(address);
                // Goal is stored with 18 decimals, convert to human-readable USD
                const goalBigInt = BigInt(fetchedInfo.goalUSD);
                const goalUSD = Number(goalBigInt) / 1e18;
                // Fetch status from factory contract
                let status = 0;
                try {
                  const statusValue = await factory.campaignStatus(address);
                  status = Number(statusValue);
                  console.log(`✓ Status for ${address.slice(0, 10)}... (direct fetch): ${status} → ${formatCampaignState(status)}`);
                } catch (e) {
                  console.warn(`Failed to fetch status for ${address} during direct fetch:`, e);
                  status = 0; // Default to DonationOnly
                }
                return {
                  address,
                  name: fetchedInfo.label || `Campaign ${index + 1}`,
                  creator: fetchedInfo.creator,
                  goal: goalUSD,
                  progress: 0,
                  status: formatCampaignState(status),
                  started: new Date(Number(fetchedInfo.createdAt) * 1000).toISOString().split('T')[0],
                  createdAt: Number(fetchedInfo.createdAt),
                  metadataHash: fetchedInfo.metadataHash,
                };
              } catch (fetchError) {
                console.error(`Failed to fetch info for ${address}:`, fetchError);
                return null;
              }
            }
            
            let status = 0;
            let totalRaisedUSD = BigInt(0);
            // Goal is stored with 18 decimals (from parseUnits in CampaignModal)
            // Convert from wei-like units to human-readable USD
            // Handle both BigInt and string/number formats
            let goalBigInt: bigint;
            if (typeof info.goalUSD === 'bigint') {
              goalBigInt = info.goalUSD;
            } else if (typeof info.goalUSD === 'string') {
              goalBigInt = BigInt(info.goalUSD);
            } else {
              goalBigInt = BigInt(info.goalUSD.toString());
            }
            const goalUSD = Number(goalBigInt) / 1e18;
            console.log(`[${index + 1}/${campaignAddresses.length}] Goal conversion for ${address}:`, {
              raw: info.goalUSD.toString(),
              bigInt: goalBigInt.toString(),
              converted: goalUSD,
              type: typeof info.goalUSD,
            });
            let progress = 0;

            // CRITICAL: Fetch status from factory using campaignStatus(address) mapping
            // The contract has: mapping(address => CampaignState) public campaignStatus;
            // Public mappings in Solidity are exposed as getter functions
            let statusFetched = false;
            
            // Method 1: Use Interface to encode/decode (most reliable for public mappings)
            // This is the recommended way to call public mappings in ethers.js v6
            try {
              // Ensure ABI is an array
              let abiForInterface: any = CampaignFactoryABI;
              if (abiForInterface && typeof abiForInterface === 'object' && 'default' in abiForInterface && !Array.isArray(abiForInterface)) {
                abiForInterface = abiForInterface.default;
              }
              
              const iface = new Interface(abiForInterface);
              const data = iface.encodeFunctionData('campaignStatus', [address]);
              const provider = await getProvider();
              
              console.log(`🔍 [${index + 1}/${campaignAddresses.length}] Fetching status for ${address} from factory ${factory.target}...`);
              
              const result = await provider.call({
                to: factory.target as string,
                data: data
              });
              
              console.log(`📥 Raw result for ${address}:`, result);
              
              if (result && result !== '0x' && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                try {
                  const decoded = iface.decodeFunctionResult('campaignStatus', result);
                  const rawStatus = decoded[0];
                  status = Number(rawStatus);
                  statusFetched = true;
                  console.log(`✅ [${index + 1}/${campaignAddresses.length}] Status SUCCESS: ${status} (${formatCampaignState(status)}) for ${address.slice(0, 10)}...`);
                } catch (decodeError: any) {
                  console.error(`❌ Failed to decode result for ${address}:`, decodeError);
                  console.error('Raw result was:', result);
                }
              } else {
                console.warn(`⚠️ [${index + 1}/${campaignAddresses.length}] Empty or zero result from campaignStatus call for ${address}. Result: ${result}`);
                // If result is 0x00...00, it might mean status is 0 (DonationOnly), but let's verify
                if (result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                  status = 0;
                  statusFetched = true;
                  console.log(`ℹ️ [${index + 1}/${campaignAddresses.length}] Status is 0 (DonationOnly) for ${address.slice(0, 10)}...`);
                }
              }
            } catch (interfaceError: any) {
              console.error(`❌ [${index + 1}/${campaignAddresses.length}] Interface method failed for ${address}:`, interfaceError?.message || interfaceError);
              console.error('Error details:', {
                address,
                factoryAddress: factory.target,
                error: interfaceError,
                stack: interfaceError?.stack
              });
            }
            
            // Method 2: Try calling campaignStatus directly (if ethers exposes it)
            if (!statusFetched) {
              try {
                // Check if the method exists on the contract
                if (typeof factory.campaignStatus === 'function') {
                  const statusValue = await factory.campaignStatus(address);
                  status = Number(statusValue);
                  statusFetched = true;
                  console.log(`✅ [${index + 1}/${campaignAddresses.length}] Status via direct call: ${status} (${formatCampaignState(status)}) for ${address.slice(0, 10)}...`);
                } else {
                  console.warn(`⚠️ factory.campaignStatus is not a function. Available methods:`, Object.keys(factory).filter(k => typeof (factory as any)[k] === 'function'));
                }
              } catch (statusError: any) {
                console.warn(`❌ Direct campaignStatus call failed for ${address}:`, statusError?.message || statusError);
              }
            }
            
            // Method 3: Fallback to campaign contract's state() method
            if (!statusFetched) {
              try {
                const { getCampaignContract } = await import('@/lib/contracts');
                const campaignContract = await getCampaignContract(address);
                if (typeof campaignContract.state === 'function') {
                  const stateValue = await campaignContract.state();
                  status = Number(stateValue);
                  statusFetched = true;
                  console.log(`✅ [${index + 1}/${campaignAddresses.length}] Status from campaign contract (fallback): ${status} (${formatCampaignState(status)}) for ${address.slice(0, 10)}...`);
                } else {
                  console.warn(`⚠️ campaignContract.state is not a function for ${address}`);
                }
              } catch (e: any) {
                console.warn(`❌ Campaign contract fallback failed for ${address}:`, e?.message || e);
              }
            }
            
            // If status still not fetched, log detailed error and default to 0
            if (!statusFetched) {
              console.error(`🚨 CRITICAL ERROR [${index + 1}/${campaignAddresses.length}]: Could not fetch status for ${address}`);
              console.error('All methods failed. Details:', {
                address,
                factoryAddress: factory.target,
                campaignIndex: index,
                factoryMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(factory))
              });
              status = 0; // Default to DonationOnly - but this should NOT happen if contract is working
            }

            // Fetch campaign contract for raised amount and deadline
            let deadline = 0;
            try {
              const { getCampaignContract } = await import('@/lib/contracts');
              const campaignContract = await getCampaignContract(address);
              if (typeof campaignContract.totalRaisedUSD === 'function') {
                totalRaisedUSD = await campaignContract.totalRaisedUSD();
                console.log(`[${index + 1}/${campaignAddresses.length}] Total raised for ${address}:`, {
                  raw: totalRaisedUSD.toString(),
                  converted: Number(totalRaisedUSD) / 1e18,
                });
              } else {
                console.warn(`[${index + 1}/${campaignAddresses.length}] totalRaisedUSD function not found for ${address}`);
              }
              
              // Fetch deadline from campaign contract
              if (typeof campaignContract.deadline === 'function') {
                const deadlineValue = await campaignContract.deadline();
                deadline = Number(deadlineValue);
              }
              
              // totalRaisedUSD is in wei (18 decimals), convert to human-readable USD
              const raised = Number(totalRaisedUSD) / 1e18;
              // Progress = (totalRaisedUSD / goalUSD) * 100
              // Ensure goalUSD is valid and not zero
              if (goalUSD > 0 && raised > 0) {
                progress = Math.min((raised / goalUSD) * 100, 100);
              } else {
                progress = 0;
              }
              console.log(`[${index + 1}/${campaignAddresses.length}] Progress calculation for ${address}:`, {
                totalRaisedUSD: totalRaisedUSD.toString(),
                raised: raised.toFixed(2),
                goalUSD: goalUSD.toFixed(2),
                progress: `${progress.toFixed(2)}%`,
                formula: goalUSD > 0 ? `(${raised.toFixed(2)} / ${goalUSD.toFixed(2)}) * 100 = ${progress.toFixed(2)}%` : 'Goal is 0, progress is 0%',
              });
            } catch (e) {
              console.warn(`Could not fetch campaign details for ${address}:`, e);
            }

            // Ensure goalUSD is a valid number and not NaN or Infinity
            const finalGoal = isNaN(goalUSD) || !isFinite(goalUSD) ? 0 : goalUSD;
            const finalProgress = isNaN(progress) || !isFinite(progress) ? 0 : Math.max(0, Math.min(100, Math.round(progress)));
            
            console.log(`[${index + 1}/${campaignAddresses.length}] Final campaign data for ${address}:`, {
              goal: finalGoal,
              progress: finalProgress,
              raised: Number(totalRaisedUSD) / 1e18,
            });

            return {
              address,
              name: info.label || `Campaign ${index + 1}`,
              creator: info.creator,
              goal: finalGoal,
              progress: finalProgress,
              status: formatCampaignState(status),
              started: new Date(Number(info.createdAt) * 1000).toISOString().split('T')[0],
              createdAt: Number(info.createdAt),
              deadline: deadline,
              metadataHash: info.metadataHash,
            };
          } catch (err) {
            console.error(`Error processing campaign ${index} (${address}):`, err);
            // Return null to filter out failed campaigns
            return null;
          }
        })
      );

      // Filter out null values (failed campaigns)
      const validCampaigns = campaignData.filter((c): c is CampaignData => c !== null);

      setCampaigns(validCampaigns);

      // Parallelize total raised and active campaign count fetching
      try {
        const [totalRaisedResult, activeCountResult] = await Promise.allSettled([
          (async () => {
            try {
              if (typeof factory.getTotalRaisedUSDPlatform === 'function') {
                const totalRaisedUSD = await factory.getTotalRaisedUSDPlatform();
                // totalRaisedUSD is in wei (18 decimals), convert to human-readable USD
                const converted = Number(totalRaisedUSD) / 1e18;
                console.log('Total Raised USD Platform:', {
                  raw: totalRaisedUSD.toString(),
                  converted,
                });
                return converted;
              } else {
                // Calculate from campaigns if method doesn't exist
                // Sum up the raised amounts from each campaign
                const calculated = validCampaigns.reduce((sum, c) => {
                  const raised = (c.goal * c.progress) / 100;
                  return sum + raised;
                }, 0);
                console.log('Calculated Total Raised from campaigns:', calculated);
                return calculated;
              }
            } catch (e) {
              console.warn('Could not get total raised:', e);
              return validCampaigns.reduce((sum, c) => sum + (c.goal * c.progress / 100), 0);
            }
          })(),
          (async () => {
            try {
              if (typeof factory.getActiveCampaignCount === 'function') {
                const activeCount = await factory.getActiveCampaignCount();
                return Number(activeCount);
              } else {
                // Count active campaigns manually
                return validCampaigns.filter(c => c.status === 'Active').length;
              }
            } catch (e) {
              console.warn('Could not get active campaign count:', e);
              return validCampaigns.filter(c => c.status === 'Active').length;
            }
          })()
        ]);

        // Set total raised
        if (totalRaisedResult.status === 'fulfilled') {
          const totalRaisedValue = totalRaisedResult.value;
          console.log('✅ Total Raised from getTotalRaisedUSDPlatform:', totalRaisedValue);
          setTotalRaised(totalRaisedValue);
        } else {
          const total = validCampaigns.reduce((sum, c) => sum + (c.goal * c.progress / 100), 0);
          console.log('⚠️ Fallback: Calculated Total Raised from campaigns:', total);
          setTotalRaised(total);
        }

        // Set active campaign count
        if (activeCountResult.status === 'fulfilled') {
          setActiveCampaignCount(activeCountResult.value);
        } else {
          const active = validCampaigns.filter(c => c.status === 'Active').length;
          setActiveCampaignCount(active);
        }
      } catch (e) {
        console.warn('Error calculating totals:', e);
        // Fallback to manual calculation
        const total = validCampaigns.reduce((sum, c) => sum + (c.goal * c.progress / 100), 0);
        setTotalRaised(total);
        const active = validCampaigns.filter(c => c.status === 'Active').length;
        setActiveCampaignCount(active);
      }

    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Failed to fetch campaigns');
      // Set empty array on error to prevent UI issues
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [factoryAddress]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    totalRaised,
    activeCampaignCount,
    refetch: fetchCampaigns,
  };
}

