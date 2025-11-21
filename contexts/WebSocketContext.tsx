'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

// Determine WebSocket URL based on environment
const getWebSocketUrl = () => {
  // If explicitly set in env, use it
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // Check if we're in development (localhost)
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      // Use ws:// for local development
      return 'ws://localhost:5000';
    }
  }
  
  // Default to production WebSocket URL
  return 'wss://betlab-backend.onrender.com';
};

const WS_URL = getWebSocketUrl();

interface WebSocketContextType {
  socket: WebSocket | null;
  liveMatches: any[];
  matchUpdates: any;
  subscribeToMatch: (matchId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [matchUpdates, setMatchUpdates] = useState<any>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldReconnectRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const connect = () => {
      // Don't create multiple connections
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setSocket(wsRef.current);
        return;
      }

      // Don't connect if already connecting
      if (isConnectingRef.current) {
        return;
      }

      // Don't connect if unmounted
      if (!mountedRef.current) {
        return;
      }

      // Close existing connection if any (but not open)
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore errors
        }
      }

      isConnectingRef.current = true;
      console.log('Attempting WebSocket connection to:', WS_URL);
      
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('WebSocket connected');
        isConnectingRef.current = false;
        setSocket(ws);
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'live_matches':
              console.log('Received live matches from WebSocket:', data.data?.length || 0);
              setLiveMatches(data.data || []);
              break;
            case 'score_update':
              setMatchUpdates((prev: any) => ({
                ...prev,
                [data.matchId]: {
                  score: data.score,
                  events: data.events
                }
              }));
              break;
            case 'odds_update':
              setMatchUpdates((prev: any) => ({
                ...prev,
                [data.matchId]: {
                  odds: data.odds
                }
              }));
              break;
            case 'match_finished':
              setMatchUpdates((prev: any) => ({
                ...prev,
                [data.matchId]: {
                  status: 'finished',
                  match: data.match
                }
              }));
              break;
            case 'match_started':
              setMatchUpdates((prev: any) => ({
                ...prev,
                [data.matchId]: {
                  status: 'live',
                  match: data.match,
                  duration: data.duration
                }
              }));
              break;
            case 'live_event':
              setMatchUpdates((prev: any) => ({
                ...prev,
                [data.matchId]: {
                  ...prev[data.matchId],
                  score: data.score,
                  latestEvent: data.event
                }
              }));
              break;
            case 'match_progress':
              setMatchUpdates((prev: any) => ({
                ...prev,
                [data.matchId]: {
                  ...prev[data.matchId],
                  elapsedTime: data.elapsedTime,
                  matchMinute: data.matchMinute,
                  score: data.score
                }
              }));
              break;
            case 'account_update':
              // This will be handled by AuthContext if needed
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        // Suppress browser extension errors (they're not real errors)
        const errorMessage = error?.message || '';
        if (errorMessage.includes('Receiving end does not exist') || 
            errorMessage.includes('message channel closed')) {
          // These are browser extension errors, ignore them
          return;
        }
        
        console.error('WebSocket error:', error);
        console.error('WebSocket URL:', WS_URL);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        // Error code 1006 = abnormal closure (connection lost)
        // Error code 1000 = normal closure
        // Error code 1001 = going away
        if (event.code === 1006) {
          console.warn('WebSocket disconnected abnormally (1006). This usually means:');
          console.warn('1. Server is not running');
          console.warn('2. Network connection lost');
          console.warn('3. WebSocket URL is incorrect:', WS_URL);
          console.warn('Attempting to reconnect in 3 seconds...');
        } else {
          console.log('WebSocket disconnected', event.code, event.reason || '');
        }
        
        isConnectingRef.current = false;
        setSocket(null);
        wsRef.current = null;
        
        // Only reconnect if it wasn't a manual close and we should reconnect
        if (shouldReconnectRef.current && event.code !== 1000) {
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Exponential backoff for reconnection
          const reconnectDelay = 3000;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && shouldReconnectRef.current) {
              console.log('Attempting WebSocket reconnection...');
              connect();
            }
          }, reconnectDelay);
        }
      };
      
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        isConnectingRef.current = false;
        wsRef.current = null;
        
        // Retry after delay
        if (shouldReconnectRef.current && mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && shouldReconnectRef.current) {
              connect();
            }
          }, 3000);
        }
      }
    };

    // Small delay to ensure component is fully mounted
    const initTimeout = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      shouldReconnectRef.current = false;
      
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null; // Prevent reconnect
          wsRef.current.close(1000, 'Component unmounting');
        } catch (e) {
          // Ignore errors
        }
        wsRef.current = null;
      }
      
      setSocket(null);
    };
  }, []); // Empty deps - only run once

  const subscribeToMatch = (matchId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'subscribe_match',
        matchId
      }));
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        liveMatches,
        matchUpdates,
        subscribeToMatch
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
