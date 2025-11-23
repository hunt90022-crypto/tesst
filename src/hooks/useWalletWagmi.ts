import { useAccount, useConnect, useDisconnect } from 'wagmi';

/**
 * Wagmi-based wallet hook - replacement for useWallet
 * Uses RainbowKit/wagmi for wallet management
 */
export function useWalletWagmi() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = async () => {
    // RainbowKit handles the connection UI, but we can trigger it programmatically
    // The ConnectButton component handles the actual connection
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  return {
    address: address || null,
    isConnected,
    isConnecting,
    chain: chain?.name || null,
    chainId: chain?.id || null,
    connect: connectWallet,
    disconnect,
  };
}

