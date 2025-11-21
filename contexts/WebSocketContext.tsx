'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://betlab-backend.onrender.com';

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
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket disconnected', event.code, event.reason);
        isConnectingRef.current = false;
        setSocket(null);
        wsRef.current = null;
        
        // Only reconnect if it wasn't a manual close and we should reconnect
        if (shouldReconnectRef.current && event.code !== 1000) {
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && shouldReconnectRef.current) {
              connect();
            }
          }, 3000);
        }
      };
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
