import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown } from 'lucide-react';

export const ConnectWallet = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 bg-[#1A1F1A] hover:bg-[#2A2F2A] text-[#CCCCCC] px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-[#2A2F2A]"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 20, height: 20 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                    <ChevronDown size={16} className="opacity-50" />
                  </button>

                  <div className="flex items-center bg-[#1A1F1A] rounded-lg border border-[#2A2F2A] overflow-hidden">
                    <div className="px-3 py-2 text-[#CCCCCC] text-sm font-medium border-r border-[#2A2F2A]">
                      {account.displayBalance
                        ? ` ${account.displayBalance}`
                        : ''}
                    </div>
                    <button
                      onClick={openAccountModal}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[#2A2F2A] transition-colors text-sm font-medium text-[#CCCCCC]"
                    >
                      {account.ensAvatar ? (
                        <img
                          src={account.ensAvatar}
                          alt="ENS Avatar"
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500" />
                      )}
                      {account.displayName}
                      <ChevronDown size={16} className="opacity-50" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

// Default export for compatibility
export default ConnectWallet;