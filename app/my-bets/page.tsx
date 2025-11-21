'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betlab-backend.onrender.com/api';

interface Bet {
  id: string;
  matchId: string;
  match: {
    homeTeam: string;
    awayTeam: string;
    league: string;
  };
  betType: string;
  selection: any;
  stake: number;
  odds: number;
  status: string;
  payout?: number;
  createdAt: string;
}

export default function MyBetsPage() {
  const { user, token } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [hideLost, setHideLost] = useState(false);

  useEffect(() => {
    if (token) {
      fetchBets();
    }
  }, [token, statusFilter]);

  const fetchBets = async () => {
    try {
      const url = statusFilter !== 'all' 
        ? `${API_URL}/bets/my-bets?status=${statusFilter}`
        : `${API_URL}/bets/my-bets`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let filteredBets = response.data;
      
      if (hideLost) {
        filteredBets = filteredBets.filter((bet: Bet) => bet.status !== 'lost');
      }
      
      setBets(filteredBets);
    } catch (error) {
      console.error('Failed to fetch bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won':
        return <FiCheckCircle className="text-accent-green" size={20} />;
      case 'lost':
        return <FiXCircle className="text-red-500" size={20} />;
      default:
        return <FiClock className="text-accent-yellow" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
        return 'text-accent-green';
      case 'lost':
        return 'text-red-500';
      default:
        return 'text-accent-yellow';
    }
  };

  const formatSelection = (bet: Bet) => {
    if (bet.betType === '1x2') {
      return `Result: ${bet.selection}`;
    }
    if (bet.betType === 'overUnder') {
      return `${bet.selection.direction === 'over' ? 'Over' : 'Under'} ${bet.selection.threshold}`;
    }
    if (bet.betType === 'bothTeamsToScore') {
      return `Both Teams to Score: ${bet.selection === 'yes' ? 'Yes' : 'No'}`;
    }
    if (bet.betType === 'nextGoalScorer') {
      return `Next Goal Scorer: ${bet.selection}`;
    }
    return bet.selection;
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">My Bets</h1>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            {['all', 'pending', 'won', 'lost'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded font-semibold transition ${
                  statusFilter === status
                    ? 'bg-accent-green text-white'
                    : 'bg-primary-light text-gray-400 hover:text-white'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-gray-400 text-sm">Hide Lost Bets</label>
            <input
              type="checkbox"
              checked={hideLost}
              onChange={(e) => setHideLost(e.target.checked)}
              className="w-4 h-4 text-accent-green bg-primary-darker border-gray-700 rounded focus:ring-accent-green"
            />
          </div>
        </div>
        
        <div className="text-center text-gray-400 text-sm mb-4">
          Last updated at {new Date().toLocaleTimeString()}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
          </div>
        ) : bets.length === 0 ? (
          <div className="bg-primary-light rounded-lg border border-gray-800 p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">
              You do not have any sportsbook bets {statusFilter !== 'all' ? statusFilter : 'this year'}
            </p>
            <p className="text-gray-500 text-sm">
              Last updated at {new Date().toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="bg-primary-light rounded-lg border border-gray-800 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(bet.status)}
                      <span className={`font-semibold ${getStatusColor(bet.status)}`}>
                        {bet.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-white font-semibold text-lg mb-1">
                      {bet.match.homeTeam} vs {bet.match.awayTeam}
                    </p>
                    <p className="text-gray-400 text-sm mb-3">{bet.match.league}</p>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bet Type:</span>
                        <span className="text-white">{formatSelection(bet)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stake:</span>
                        <span className="text-white">KES {bet.stake.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Odds:</span>
                        <span className="text-white">{bet.odds.toFixed(2)}</span>
                      </div>
                      {bet.status === 'won' && bet.payout && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payout:</span>
                          <span className="text-accent-green font-bold">
                            KES {bet.payout.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Placed:</span>
                        <span className="text-gray-500 text-sm">
                          {new Date(bet.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
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

