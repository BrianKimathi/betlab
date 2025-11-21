'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

export function useAccountUpdates() {
  const { user, updateBalance } = useAuth();

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe_account',
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
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

    return () => {
      ws.close();
    };
  }, [user?.id, updateBalance]);
}

