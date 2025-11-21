'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import axios from 'axios';
import Link from 'next/link';
import { FiClock, FiChevronRight } from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betlab-backend.onrender.com/api';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country: string;
  sport: string;
  date: string;
  status: string;
  score: { home: number; away: number };
  odds: {
    homeWin: number;
    draw?: number;
    awayWin: number;
  };
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { matchUpdates, liveMatches } = useWebSocket();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('highlights');
  const statusFilter = searchParams.get('status');

  // Fetch matches from API
  useEffect(() => {
    if (token) {
      fetchMatches();
    }
  }, [token, statusFilter]);

  // Update with WebSocket live matches when available (for live filter)
  useEffect(() => {
    if (statusFilter === 'live' && liveMatches && liveMatches.length > 0) {
      console.log('✅ Updating with WebSocket live matches:', liveMatches.length);
      setMatches(liveMatches as Match[]);
      setLoading(false);
    }
  }, [liveMatches, statusFilter]);

  // Update matches when WebSocket receives updates
  useEffect(() => {
    if (matchUpdates && Object.keys(matchUpdates).length > 0) {
      setMatches(prevMatches => {
        return prevMatches.map(match => {
          const update = matchUpdates[match.id];
          if (update) {
            return {
              ...match,
              score: update.score || match.score,
              status: update.status || match.status,
              odds: update.odds || match.odds,
              liveEvents: update.events || match.liveEvents
            };
          }
          return match;
        });
      });
    }
  }, [matchUpdates]);

  const fetchMatches = async () => {
    try {
      const url = statusFilter === 'live' 
        ? `${API_URL}/matches/live/all`
        : `${API_URL}/matches`;
      console.log('📡 Fetching matches from:', url);
      const response = await axios.get(url);
      const fetchedMatches = response.data;
      console.log(`✅ Fetched ${fetchedMatches.length} matches from API`);
      
      // For live matches, ensure we only show live status matches
      if (statusFilter === 'live') {
        const liveOnly = fetchedMatches.filter((m: Match) => m.status === 'live');
        console.log(`📊 Filtered to ${liveOnly.length} live matches`);
        setMatches(liveOnly);
      } else {
        setMatches(fetchedMatches);
      }
    } catch (error) {
      console.error('❌ Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${day}/${month}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return null;
  }

  // Filter matches based on active tab (when not using status filter)
  const filteredMatches = statusFilter === 'live' 
    ? matches.filter(m => m.status === 'live')
    : activeTab === 'highlights'
    ? matches.slice(0, 10)
    : activeTab === 'upcoming'
    ? matches.filter(m => m.status === 'upcoming')
    : activeTab === 'live'
    ? matches.filter(m => m.status === 'live')
    : matches;

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Account Balance</p>
              <p className="text-3xl font-bold text-accent-green mt-1">
                KES {user.balance.toLocaleString()}
              </p>
            </div>
            <Link
              href="/deposit"
              className="bg-accent-green hover:bg-green-600 px-6 py-2 rounded font-semibold transition"
            >
              Deposit
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('highlights')}
            className={`pb-3 px-4 font-semibold transition ${
              activeTab === 'highlights'
                ? 'text-accent-green border-b-2 border-accent-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Highlights
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 px-4 font-semibold transition ${
              activeTab === 'upcoming'
                ? 'text-accent-green border-b-2 border-accent-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Upcoming
          </button>
          {statusFilter === 'live' && (
            <button
              onClick={() => setActiveTab('live')}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === 'live'
                  ? 'text-accent-green border-b-2 border-accent-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Live ({matches.filter(m => m.status === 'live').length})
            </button>
          )}
        </div>

        {/* Matches List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>No matches available at the moment</p>
            {statusFilter === 'live' && (
              <p className="text-sm mt-2">
                Waiting for live matches... (Check console for WebSocket updates)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-primary-light rounded-lg border border-gray-800 p-4 hover:border-accent-green transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm">
                        {match.country} • {match.league}
                      </span>
                      {match.status === 'live' && (
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex-1">
                        <p className="text-white font-semibold">{match.homeTeam}</p>
                        <p className="text-white font-semibold">{match.awayTeam}</p>
                      </div>
                      {match.status === 'live' && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-accent-green">
                            {match.score.home} - {match.score.away}
                          </p>
                          {matchUpdates[match.id]?.matchMinute && (
                            <p className="text-gray-400 text-xs mt-1">
                              Min {matchUpdates[match.id].matchMinute}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <FiClock size={14} />
                      <span>{formatDate(match.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    {match.odds.draw ? (
                      <>
                        <Link
                          href={`/match/${match.id}`}
                          className="bg-primary-darker hover:bg-accent-green hover:text-white px-4 py-2 rounded font-semibold transition min-w-[60px] text-center"
                        >
                          1<br />
                          <span className="text-accent-green">{match.odds.homeWin.toFixed(2)}</span>
                        </Link>
                        <Link
                          href={`/match/${match.id}`}
                          className="bg-primary-darker hover:bg-accent-green hover:text-white px-4 py-2 rounded font-semibold transition min-w-[60px] text-center"
                        >
                          X<br />
                          <span className="text-accent-green">{match.odds.draw.toFixed(2)}</span>
                        </Link>
                        <Link
                          href={`/match/${match.id}`}
                          className="bg-primary-darker hover:bg-accent-green hover:text-white px-4 py-2 rounded font-semibold transition min-w-[60px] text-center"
                        >
                          2<br />
                          <span className="text-accent-green">{match.odds.awayWin.toFixed(2)}</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/match/${match.id}`}
                          className="bg-primary-darker hover:bg-accent-green hover:text-white px-4 py-2 rounded font-semibold transition min-w-[60px] text-center"
                        >
                          {match.homeTeam.substring(0, 3)}<br />
                          <span className="text-accent-green">{match.odds.homeWin.toFixed(2)}</span>
                        </Link>
                        <Link
                          href={`/match/${match.id}`}
                          className="bg-primary-darker hover:bg-accent-green hover:text-white px-4 py-2 rounded font-semibold transition min-w-[60px] text-center"
                        >
                          {match.awayTeam.substring(0, 3)}<br />
                          <span className="text-accent-green">{match.odds.awayWin.toFixed(2)}</span>
                        </Link>
                      </>
                    )}
                    <Link
                      href={`/match/${match.id}`}
                      className="text-accent-green hover:text-green-400 p-2"
                    >
                      <FiChevronRight size={20} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
