# RainbowKit Setup Guide

## 1. Install Dependencies

Run the following command to install RainbowKit and required dependencies:

```bash
npm install @rainbow-me/rainbowkit wagmi viem
```

## 2. Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up or log in
3. Create a new project
4. Copy your Project ID
5. Add it to your `.env` file:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
VITE_CHAIN_ID=11155111  # Sepolia testnet (or 1 for mainnet)
```

## 3. Configuration

The RainbowKit configuration is in `src/lib/wagmi.ts`. It's already set up to:
- Use Sepolia testnet by default (change via `VITE_CHAIN_ID`)
- Support multiple chains (Mainnet, Sepolia, Polygon, Arbitrum, Optimism)

## 4. Features

✅ Wallet connection via RainbowKit ConnectButton in TopNav
✅ Support for MetaMask, WalletConnect, Coinbase Wallet, and more
✅ Automatic wallet detection
✅ Chain switching
✅ Account display with balance

## 5. Usage

The wallet connection button is automatically displayed in the top navigation bar. Users can:
- Click to connect their wallet
- See their connected address
- Switch networks
- Disconnect

The `useWalletWagmi` hook provides:
- `address`: Connected wallet address
- `isConnected`: Connection status
- `chain`: Current chain info
- `disconnect`: Disconnect function

## 6. Integration Points

- **TopNav**: Shows ConnectButton
- **Dashboard**: Uses `useWalletWagmi` for wallet state
- **Admins**: Uses `useWalletWagmi` for wallet state
- **CampaignModal**: Uses `useWalletWagmi` for wallet state

