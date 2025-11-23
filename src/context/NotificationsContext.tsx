import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from '@/config/contracts';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  txHash?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...data,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    
    // Also show a toast
    if (data.type === 'error') toast.error(data.title, { description: data.message });
    else if (data.type === 'success') toast.success(data.title, { description: data.message });
    else toast.message(data.title, { description: data.message });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // --- Smart Contract Event Listeners ---

  // 1. Factory Events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES[11155111].CampaignFactory as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'CampaignCreated',
    onLogs(logs) {
      logs.forEach((log) => {
        // @ts-ignore
        const { campaignAddress, creator, goal, metadataHash } = log.args;
        addNotification({
          title: 'New Campaign Created',
          message: `A new campaign has been deployed at ${campaignAddress?.slice(0, 6)}...${campaignAddress?.slice(-4)}`,
          type: 'info',
          txHash: log.transactionHash,
        });
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES[11155111].CampaignFactory as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'AdminAdded',
    onLogs(logs) {
      logs.forEach((log) => {
         // @ts-ignore
        const { who } = log.args;
        addNotification({
          title: 'Admin Added',
          message: `Address ${who?.slice(0, 6)}...${who?.slice(-4)} was granted admin privileges.`,
          type: 'warning',
          txHash: log.transactionHash,
        });
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES[11155111].CampaignFactory as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'AdminRemoved',
    onLogs(logs) {
      logs.forEach((log) => {
         // @ts-ignore
        const { who } = log.args;
        addNotification({
          title: 'Admin Removed',
          message: `Address ${who?.slice(0, 6)}...${who?.slice(-4)} was revoked admin privileges.`,
          type: 'warning',
          txHash: log.transactionHash,
        });
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES[11155111].CampaignFactory as `0x${string}`,
    abi: CONTRACT_ABIS.CampaignFactory,
    eventName: 'OwnershipTransferred',
    onLogs(logs) {
      logs.forEach((log) => {
         // @ts-ignore
        const { previousOwner, newOwner } = log.args;
        addNotification({
          title: 'Factory Ownership Transferred',
          message: `Factory ownership transferred to ${newOwner?.slice(0, 6)}...${newOwner?.slice(-4)}.`,
          type: 'warning',
          txHash: log.transactionHash,
        });
      });
    },
  });

  // 2. Campaign Events (Global Listener for specific events if possible, or just example)
  // Note: Watching ALL campaigns is expensive. We will rely on CampaignDetails to trigger specific watches,
  // OR we can watch specific events if we know the addresses. 
  // For this implementation, we'll expose the addNotification to the rest of the app 
  // so individual components can listen and report.

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
