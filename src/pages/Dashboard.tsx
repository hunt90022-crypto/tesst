import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Eye, TrendingUp, DollarSign, Target, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CalendarWidget from '@/components/CalendarWidget';
import CampaignModal from '@/components/CampaignModal';
import DonationAnalyticsChart from '@/components/DonationAnalyticsChart';
import ActiveCampaignsWidget from '@/components/ActiveCampaignsWidget';
import { useCampaignFactory, CampaignData } from '@/hooks/useCampaignFactory';
import { useWalletWagmi } from '@/hooks/useWalletWagmi';
import { toast } from '@/components/ui/sonner';

interface DashboardProps {
  factoryAddress: string;
}

function Dashboard({ factoryAddress }: DashboardProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address, isConnected, connect } = useWalletWagmi();
  
  // Stable callback for closing modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  // Safety check for factoryAddress
  if (!factoryAddress) {
    return (
      <div className="bg-background p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive font-semibold">Factory address is missing</p>
          <p className="text-sm text-muted-foreground mt-2">Please configure the factory address in the settings.</p>
        </div>
      </div>
    );
  }
  
  const { 
    campaigns, 
    loading, 
    error, 
    totalRaised, 
    activeCampaignCount, 
    refetch 
  } = useCampaignFactory(factoryAddress);

  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = activeCampaignCount ?? (campaigns?.filter(c => c.status === 'Active').length || 0);
  const successfulCampaigns = campaigns?.filter(c => c.status === 'Completed' || (c.status === 'Active' && c.progress >= 100)).length || 0;

  // Debug: Log campaigns and their statuses
  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      console.log('📊 Dashboard campaigns:', campaigns.length);
      campaigns.forEach((c, i) => {
        console.log(`  Campaign ${i + 1}: ${c.name} - Status: "${c.status}" (type: ${typeof c.status}) - Progress: ${c.progress}% - Address: ${c.address}`);
        if (!c.status) {
          console.error(`  ⚠️ Campaign ${i + 1} has missing status!`);
        }
      });
    } else if (campaigns && campaigns.length === 0) {
      console.warn('⚠️ Dashboard: campaigns array is empty');
    }
  }, [campaigns]);

  // Auto-refresh after campaign creation - using ref to prevent infinite loops
  const isRefreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCampaignCreated = useCallback(() => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('⏸️ Refresh already in progress, skipping...');
      return;
    }

    isRefreshingRef.current = true;
    console.log('🔄 Campaign created, refreshing data in 3 seconds...');

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Debounce: wait for transaction to be fully mined and indexed
    refreshTimeoutRef.current = setTimeout(() => {
      refetch().finally(() => {
        // Reset flag after a delay to allow for potential retries
        setTimeout(() => {
          isRefreshingRef.current = false;
        }, 1000);
      });
    }, 3000);
  }, [refetch]);

  useEffect(() => {
    window.addEventListener('campaignCreated', handleCampaignCreated);
    return () => {
      window.removeEventListener('campaignCreated', handleCampaignCreated);
      // Cleanup timeout on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [handleCampaignCreated]);

  const analyticsData = [
    { month: 'Jan', growthRate: 0, avgDonation: 250, retentionRate: 45 },
    { month: 'Feb', growthRate: 15.5, avgDonation: 275, retentionRate: 48 },
    { month: 'Mar', growthRate: -8.2, avgDonation: 260, retentionRate: 46 },
    { month: 'Apr', growthRate: 22.8, avgDonation: 290, retentionRate: 52 },
    { month: 'May', growthRate: -5.3, avgDonation: 280, retentionRate: 50 },
    { month: 'Jun', growthRate: 31.2, avgDonation: 310, retentionRate: 55 },
    { month: 'Jul', growthRate: -10.5, avgDonation: 295, retentionRate: 53 },
    { month: 'Aug', growthRate: 18.4, avgDonation: 305, retentionRate: 56 },
    { month: 'Sep', growthRate: -3.7, avgDonation: 298, retentionRate: 54 },
    { month: 'Oct', growthRate: 25.6, avgDonation: 320, retentionRate: 58 },
    { month: 'Nov', growthRate: -7.8, avgDonation: 312, retentionRate: 57 },
    { month: 'Dec', growthRate: 20.1, avgDonation: 335, retentionRate: 60 },
  ];

  // Generate calendar events from real campaigns based on their expiration dates (deadlines)
  const calendarEvents = campaigns && campaigns.length > 0
    ? campaigns
        .filter(c => c.deadline && c.deadline > 0) // Only show campaigns with valid deadlines
        .map(c => {
          // Use deadline timestamp (expiration date) instead of creation date
          const timestamp = c.deadline * 1000;
          const date = new Date(timestamp);
          const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          return {
            time: `${dateStr} ${time}`,
            title: `${c.name} expires`,
            deadline: c.deadline,
            campaignName: c.name,
            campaignAddress: c.address,
          };
        })
        .sort((a, b) => a.deadline - b.deadline) // Sort by deadline (earliest first)
        .slice(0, 5) // Limit to 5 upcoming deadlines
    : [];

  const formatAddress = (address?: string): string => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleViewDetails = (campaignAddress: string) => {
    navigate(`/campaign/${campaignAddress}`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'Active': { label: 'Active', variant: 'default' },
      'Paused': { label: 'Paused', variant: 'secondary' },
      'Completed': { label: 'Completed', variant: 'default' },
      'Failed': { label: 'Failed', variant: 'destructive' },
      'Cancelled': { label: 'Cancelled', variant: 'destructive' },
      'DonationOnly': { label: 'Donation Only', variant: 'outline' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' };
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success('Data refreshed');
  };

  if (loading && (!campaigns || campaigns.length === 0)) {
    return (
      <div className="bg-background p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading campaigns from blockchain...</p>
        </div>
      </div>
    );
  }

  if (error && (!campaigns || campaigns.length === 0)) {
    return (
      <div className="bg-background p-6 space-y-4">
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive font-semibold">Error loading campaigns</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet to interact with contracts'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="icon" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveCampaignsWidget campaigns={campaigns || []} />
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <h3 className="text-base md:text-lg font-semibold">Quick Stats</h3>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-green-500/20 rounded-md">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Success Rate</p>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {totalCampaigns > 0 ? ((successfulCampaigns / totalCampaigns) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{successfulCampaigns} of {totalCampaigns} campaigns</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Raised</p>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  ${(totalRaised || 0).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
                <p className="text-xs text-muted-foreground">across all campaigns</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3">Status Distribution</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <span className="text-xs font-semibold">{activeCampaigns}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${totalCampaigns > 0 ? (activeCampaigns / totalCampaigns) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Paused</span>
                    <span className="text-xs font-semibold">{campaigns?.filter(c => c.status === 'Paused').length || 0}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${totalCampaigns > 0 ? ((campaigns?.filter(c => c.status === 'Paused').length || 0) / totalCampaigns) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Cancelled</span>
                    <span className="text-xs font-semibold">{campaigns?.filter(c => c.status === 'Cancelled').length || 0}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${totalCampaigns > 0 ? ((campaigns?.filter(c => c.status === 'Cancelled').length || 0) / totalCampaigns) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <DonationAnalyticsChart data={analyticsData} />
        </div>
        <div>
          <CalendarWidget events={calendarEvents} />
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">Recent Campaigns</h2>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={18} />
            Create Campaign
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto border border-border rounded-lg custom-scrollbar">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: hsl(var(--secondary));
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: hsl(var(--muted-foreground));
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: hsl(var(--foreground));
              }
            `}</style>
            <table className="w-full">
            <thead className="bg-secondary/50 sticky top-0 z-10 border-b border-border shadow-sm">
              <tr>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Campaign Address
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Progress
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Creator
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Goal
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {!campaigns || campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    {loading ? 'Loading campaigns...' : 'No campaigns found. Create your first campaign!'}
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign, index) => {
                  const statusBadge = getStatusBadge(campaign.status);
                  return (
                    <tr
                      key={campaign.address || index}
                      className="border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(campaign.address)}
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-primary font-semibold">
                          {formatAddress(campaign.address)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-foreground">{campaign.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden max-w-[100px]">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
                              style={{ width: `${campaign.progress > 100 ? 100 : campaign.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground min-w-[45px]">
                            {campaign.progress > 100 ? '100%' : `${campaign.progress}%`}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-muted-foreground">
                          {formatAddress(campaign.creator)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {campaign.status ? (
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="opacity-50">
                            Loading...
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-foreground">
                          ${campaign.goal.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2,
                            useGrouping: true
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(campaign.address);
                          }}
                          className="h-8 w-8"
                        >
                          <Eye size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </Card>

      <CampaignModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        factoryAddress={factoryAddress} 
      />
    </div>
  );
}

export default Dashboard;
