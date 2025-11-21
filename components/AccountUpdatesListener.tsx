'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

export function AccountUpdatesListener({ children }: { children: React.ReactNode }) {
  const { user, updateBalance } = useAuth();
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!user || !socket || socket.readyState !== WebSocket.OPEN) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'account_update' && data.userId === user.id) {
          if (data.balance !== undefined) {
            updateBalance(data.balance);
          }
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    socket.addEventListener('message', handleMessage);

    // Subscribe to account updates
    socket.send(JSON.stringify({
      type: 'subscribe_account',
      userId: user.id
    }));

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [user?.id, socket, updateBalance]);

  return <>{children}</>;
}

