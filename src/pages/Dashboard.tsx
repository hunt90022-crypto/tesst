import { useState, useEffect } from 'react';
import { Plus, Eye, TrendingUp, Users, DollarSign, Target, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatsCard from '@/components/StatsCard';
import CalendarWidget from '@/components/CalendarWidget';
import CampaignModal from '@/components/CampaignModal';
import DonationAnalyticsChart from '@/components/DonationAnalyticsChart';
import ActiveCampaignsWidget from '@/components/ActiveCampaignsWidget';

interface Campaign {
  id: number;
  address: string;
  name: string;
  progress: number;
  status: 'Active' | 'Pause' | 'Cancel';
  goal: number;
  started: string;
  creator?: string;
  admin?: string;
  expiryDate?: string;
}

interface DashboardProps {
  factoryAddress: string;
}

function Dashboard({ factoryAddress }: DashboardProps) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const mockCampaigns: Campaign[] = [
      {
        id: 35,
        address: '0x1234567890123456789012345678901234567890',
        name: 'Konklux',
        progress: 23,
        status: 'Active',
        goal: 61,
        started: '2021-09-12',
        creator: '0x1111111111111111111111111111111111111111',
        admin: '0x2222222222222222222222222222222222222222',
        expiryDate: '2024-12-31T23:59:59Z'
      },
      {
        id: 34,
        address: '0x2234567890123456789012345678901234567890',
        name: 'Tres-Zap',
        progress: 5,
        status: 'Pause',
        goal: 47,
        started: '2021-05-11',
        creator: '0x3333333333333333333333333333333333333333',
        admin: '0x4444444444444444444444444444444444444444',
        expiryDate: '2024-11-30T23:59:59Z'
      },
      {
        id: 33,
        address: '0x3234567890123456789012345678901234567890',
        name: 'Keylex',
        progress: 44,
        status: 'Active',
        goal: 44,
        started: '2021-09-19',
        creator: '0x5555555555555555555555555555555555555555',
        admin: '0x6666666666666666666666666666666666666666',
        expiryDate: '2025-01-15T23:59:59Z'
      },
      {
        id: 32,
        address: '0x4234567890123456789012345678901234567890',
        name: 'Latlux',
        progress: 69,
        status: 'Cancel',
        goal: 37,
        started: '2021-05-16',
        creator: '0x7777777777777777777777777777777777777777',
        admin: '0x8888888888888888888888888888888888888888',
        expiryDate: '2024-10-20T23:59:59Z'
      },
    ];

    setCampaigns(mockCampaigns);
  }, []);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.goal * c.progress / 100), 0);
  const successfulCampaigns = campaigns.filter(c => c.progress >= 100 || c.status === 'Active' && c.progress >= 75).length;

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

  const events = [
    { time: '16:00', title: 'Summer Campaign ended!' },
    { time: '14:00', title: '2 plus 1 promotions ended!' },
    { time: '13:00', title: 'Winter Campaign ended!' },
    { time: '09:00', title: 'Summer Campaign ended!' },
  ];

  const formatAddress = (address?: string): string => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleViewDetails = (campaignAddress: string) => {
    navigate(`/campaign/${campaignAddress}`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      'Active': { label: 'Complete', variant: 'default' },
      'Pause': { label: 'Pending', variant: 'secondary' },
      'Cancel': { label: 'Failed', variant: 'destructive' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' };
  };

  return (
    <div className="bg-background p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          icon={Users}
          title="Total Campaigns"
          value={totalCampaigns.toString()}
          change="10.0"
          changeType="positive"
          period="Month"
          iconColor="#667eea"
        />
        <StatsCard
          icon={TrendingUp}
          title="Active Campaigns"
          value={activeCampaigns.toString()}
          change="10.0"
          changeType="positive"
          period="Month"
          iconColor="#10b981"
        />
        <StatsCard
          icon={DollarSign}
          title="Total Raised"
          value={`$${totalRaised.toFixed(0)}`}
          period="Month"
          iconColor="#3b82f6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveCampaignsWidget />
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Quick Stats</h3>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {totalCampaigns > 0 ? ((successfulCampaigns / totalCampaigns) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">{successfulCampaigns} of {totalCampaigns} campaigns</p>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
                <p className="text-2xl font-bold text-foreground">45</p>
                <p className="text-xs text-muted-foreground mt-1">days per campaign</p>
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
                      style={{ width: `${(activeCampaigns / totalCampaigns) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Paused</span>
                    <span className="text-xs font-semibold">{campaigns.filter(c => c.status === 'Pause').length}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${(campaigns.filter(c => c.status === 'Pause').length / totalCampaigns) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Cancelled</span>
                    <span className="text-xs font-semibold">{campaigns.filter(c => c.status === 'Cancel').length}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(campaigns.filter(c => c.status === 'Cancel').length / totalCampaigns) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DonationAnalyticsChart data={analyticsData} />
        </div>
        <div>
          <CalendarWidget events={events} />
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Recent Campaigns</h2>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={18} />
            Create Campaign
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
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
              {campaigns.slice(0, 5).map((campaign) => {
                const statusBadge = getStatusBadge(campaign.status);
                return (
                  <tr
                    key={campaign.id}
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
                            style={{ width: `${campaign.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-foreground min-w-[45px]">
                          {campaign.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm text-muted-foreground">
                        {formatAddress(campaign.creator)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-foreground">${campaign.goal}</span>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewDetails(campaign.address)}
                        className="h-8 w-8"
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <CampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        factoryAddress={factoryAddress} 
      />
    </div>
  );
}

export default Dashboard;
