import { ArrowLeft, Search, Bell, ChevronDown, Plus, X } from 'lucide-react';
import ConnectWallet from '@/components/ConnectWallet';
import NotificationsBell from './NotificationsBell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function TopNav() {
  const navigate = useNavigate();
  const [factoryAddresses, setFactoryAddresses] = useState<string[]>([
    '0x9Ec6...c5a5',
  ]);
  const [selectedFactory, setSelectedFactory] = useState(factoryAddresses[0]);
  const [newAddress, setNewAddress] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const handleAddFactory = () => {
    if (newAddress.trim() && !factoryAddresses.includes(newAddress.trim())) {
      setFactoryAddresses([...factoryAddresses, newAddress.trim()]);
      setNewAddress('');
      setShowAddInput(false);
    }
  };

  const handleRemoveFactory = (address: string) => {
    if (factoryAddresses.length > 1) {
      const newAddresses = factoryAddresses.filter(a => a !== address);
      setFactoryAddresses(newAddresses);
      if (selectedFactory === address) {
        setSelectedFactory(newAddresses[0]);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border/40 bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Sidebar Toggle + Return */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-primary hover:bg-primary/10" />
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 hover:bg-primary/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Return</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search campaigns, addresses..."
          className="w-full pl-10 bg-background/50 border-border/40 focus-visible:ring-primary"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Factory Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 border-border/40 hover:bg-primary/10 hover:border-primary/50">
            <span className="text-sm text-muted-foreground">Factory</span>
            <span className="font-mono text-xs text-foreground">
              {selectedFactory}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 bg-card border-border/40">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              Factory Addresses
            </div>
            {factoryAddresses.map((addr) => (
              <div
                key={addr}
                className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-accent group"
              >
                <button
                  onClick={() => setSelectedFactory(addr)}
                  className="flex-1 text-left font-mono text-xs text-foreground"
                >
                  {addr === selectedFactory && (
                    <span className="text-primary mr-2">●</span>
                  )}
                  {addr}
                </button>
                {factoryAddresses.length > 1 && (
                  <button
                    onClick={() => handleRemoveFactory(addr)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </div>
            ))}
            
            <DropdownMenuSeparator className="my-2" />
            
            {showAddInput ? (
              <div className="flex gap-2 px-2">
                <Input
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFactory()}
                  className="h-8 text-xs font-mono"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAddFactory}
                  className="h-8 px-3"
                  disabled={!newAddress.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewAddress('');
                  }}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInput(true)}
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Factory
              </button>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <NotificationsBell />

      {/* Wallet Connection */}
      <ConnectWallet />
    </header>
  );
}
