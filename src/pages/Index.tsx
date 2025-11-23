import Dashboard from './Dashboard';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

const Index = () => {
  // Use the contract address from configuration
  const factoryAddress = CONTRACT_ADDRESSES.CAMPAIGN_FACTORY;
  
  return <Dashboard factoryAddress={factoryAddress} />;
};

export default Index;
