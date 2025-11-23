import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign } from 'lucide-react';
import { CampaignData } from '@/hooks/useCampaignFactory';

interface ActiveCampaignsWidgetProps {
  campaigns?: CampaignData[];
}

const ActiveCampaignsWidget = ({ campaigns = [] }: ActiveCampaignsWidgetProps) => {
  // Sort all campaigns by progress (descending) and take top 5
  // Show all campaigns, not just active ones, to ensure campaigns are visible
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Top Campaigns by Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCampaigns.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No active campaigns found
              </div>
            ) : (
              topCampaigns.map((campaign, index) => (
                <div
                  key={campaign.address}
                  className="p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-semibold text-sm">{campaign.name}</span>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {campaign.progress.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">
                      {formatAddress(campaign.address)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${(campaign.goal * (campaign.progress / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveCampaignsWidget;