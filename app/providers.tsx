'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { BetslipProvider } from '@/contexts/BetslipContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { AccountUpdatesListener } from '@/components/AccountUpdatesListener';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BetslipProvider>
        <WebSocketProvider>
          <AccountUpdatesListener>
            {children}
          </AccountUpdatesListener>
        </WebSocketProvider>
      </BetslipProvider>
    </AuthProvider>
  );
}

