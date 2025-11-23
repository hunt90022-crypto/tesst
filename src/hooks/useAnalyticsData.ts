import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { getProvider, getCampaignContract } from '@/lib/contracts';
import type { CampaignData } from './useCampaignFactory';

interface ChartDataPoint {
  month: string;
  growthRate: number;
  avgDonation: number;
  retentionRate: number;
}

interface DonationEvent {
  contributor: string;
  ethAmount: bigint;
  tokenAmount: bigint;
  timestamp: number;
  month: string;
}

export function useAnalyticsData(campaigns: CampaignData[]) {
  const [analyticsData, setAnalyticsData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyticsData() {
      if (!campaigns || campaigns.length === 0) {
        console.log('No campaigns available for analytics');
        setAnalyticsData(getDefaultData());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`📊 Fetching analytics for ${campaigns.length} campaigns...`);

        // Collect all donation events from all campaigns
        const allDonations: DonationEvent[] = [];

        for (const campaign of campaigns) {
          try {
            const campaignContract = await getCampaignContract(campaign.address);
            
            // Fetch ContributionReceived events
            // Event signature: ContributionReceived(address indexed contributor, uint256 ethAmount, uint256 tokenAmount, uint256 timestamp)
            const filter = campaignContract.filters.ContributionReceived();
            const events = await campaignContract.queryFilter(filter);

            console.log(`  Found ${events.length} donation events for ${campaign.name}`);

            for (const event of events) {
              if (event.args) {
                const timestamp = Number(event.args.timestamp);
                const date = new Date(timestamp * 1000);
                const month = date.toLocaleDateString('en-US', { month: 'short' });
                
                allDonations.push({
                  contributor: event.args.contributor,
                  ethAmount: event.args.ethAmount,
                  tokenAmount: event.args.tokenAmount,
                  timestamp,
                  month,
                });
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch events for campaign ${campaign.address}:`, err);
          }
        }

        console.log(`📈 Total donations collected: ${allDonations.length}`);

        if (allDonations.length === 0) {
          console.log('No donation events found, using default data');
          setAnalyticsData(getDefaultData());
          setLoading(false);
          return;
        }

        // Process donations into monthly analytics
        const monthlyData = processMonthlyData(allDonations);
        setAnalyticsData(monthlyData);
        
      } catch (err: any) {
        console.error('Error fetching analytics data:', err);
        setError(err.message || 'Failed to fetch analytics');
        setAnalyticsData(getDefaultData());
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [campaigns]);

  return { analyticsData, loading, error };
}

function processMonthlyData(donations: DonationEvent[]): ChartDataPoint[] {
  // Group donations by month
  const monthlyDonations: Record<string, DonationEvent[]> = {};
  
  donations.forEach(donation => {
    const date = new Date(donation.timestamp * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyDonations[monthKey]) {
      monthlyDonations[monthKey] = [];
    }
    monthlyDonations[monthKey].push(donation);
  });

  // Sort by month
  const sortedMonths = Object.keys(monthlyDonations).sort();

  // Calculate metrics for each month
  const monthlyMetrics: ChartDataPoint[] = sortedMonths.map((monthKey, index) => {
    const donations = monthlyDonations[monthKey];
    const date = new Date(monthKey + '-01');
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    // Calculate total donations in USD (assuming ETH price, simplified)
    const totalEth = donations.reduce((sum, d) => sum + Number(d.ethAmount), 0);
    const avgDonation = donations.length > 0 ? (totalEth / donations.length) / 1e18 * 2000 : 0; // Rough ETH to USD conversion

    // Calculate growth rate compared to previous month
    let growthRate = 0;
    if (index > 0) {
      const prevMonthKey = sortedMonths[index - 1];
      const prevDonations = monthlyDonations[prevMonthKey];
      const prevTotal = prevDonations.reduce((sum, d) => sum + Number(d.ethAmount), 0);
      const currentTotal = totalEth;
      
      if (prevTotal > 0) {
        growthRate = ((currentTotal - prevTotal) / prevTotal) * 100;
      }
    }

    // Calculate retention rate (donors who donated before)
    const uniqueDonors = new Set(donations.map(d => d.contributor));
    const returningDonors = new Set<string>();
    
    if (index > 0) {
      // Check if donors from this month donated in previous months
      for (let i = 0; i < index; i++) {
        const prevMonthKey = sortedMonths[i];
        const prevDonors = monthlyDonations[prevMonthKey].map(d => d.contributor);
        
        uniqueDonors.forEach(donor => {
          if (prevDonors.includes(donor)) {
            returningDonors.add(donor);
          }
        });
      }
    }

    const retentionRate = uniqueDonors.size > 0 
      ? (returningDonors.size / uniqueDonors.size) * 100 
      : 0;

    return {
      month: monthName,
      growthRate: Number(growthRate.toFixed(1)),
      avgDonation: Number(avgDonation.toFixed(0)),
      retentionRate: Number(retentionRate.toFixed(0)),
    };
  });

  // If we have data but it's less than 12 months, pad with recent data or defaults
  if (monthlyMetrics.length > 0 && monthlyMetrics.length < 12) {
    const defaultMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const result: ChartDataPoint[] = [];
    
    // Show last 12 months, filling in missing data
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth - 11 + i + 12) % 12;
      const monthName = defaultMonths[monthIndex];
      
      const existingData = monthlyMetrics.find(m => m.month === monthName);
      if (existingData) {
        result.push(existingData);
      } else {
        result.push({
          month: monthName,
          growthRate: 0,
          avgDonation: 0,
          retentionRate: 0,
        });
      }
    }
    
    return result;
  }

  // If we have 12 or more months, return the last 12
  if (monthlyMetrics.length >= 12) {
    return monthlyMetrics.slice(-12);
  }

  return monthlyMetrics;
}

function getDefaultData(): ChartDataPoint[] {
  // Return empty data for each month
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(month => ({
    month,
    growthRate: 0,
    avgDonation: 0,
    retentionRate: 0,
  }));
}
