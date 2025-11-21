'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import Link from 'next/link';
import { FiClock } from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betlab-backend.onrender.com/api';

interface Jackpot {
  id: string;
  name: string;
  prize: number;
  stake: number;
  expiresAt: string;
  matches: any[];
}

export default function JackpotsPage() {
  const { user, token } = useAuth();
  const [jackpots, setJackpots] = useState<Jackpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJackpot, setSelectedJackpot] = useState<string | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);

  useEffect(() => {
    if (token) {
      fetchJackpots();
    }
  }, [token]);

  const selectedJackpotData = jackpots.find(j => j.id === selectedJackpot);

  // Real-time countdown timer
  useEffect(() => {
    const currentJackpot = jackpots.find(j => j.id === selectedJackpot);
    if (!currentJackpot) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const jackpot = jackpots.find(j => j.id === selectedJackpot);
      if (jackpot) {
        setTimeRemaining(calculateTimeRemaining(jackpot.expiresAt));
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [selectedJackpot, jackpots]);

  const fetchJackpots = async () => {
    try {
      const response = await axios.get(`${API_URL}/jackpots`);
      setJackpots(response.data);
      if (response.data.length > 0) {
        setSelectedJackpot(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch jackpots:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, mins, secs };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${day}/${month} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleMatchSelection = (matchId: string, selection: string) => {
    setSelectedMatches({
      ...selectedMatches,
      [matchId]: selection
    });
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Jackpots</h1>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Jackpot Selection */}
            <div className="flex space-x-4 mb-6 overflow-x-auto">
              {jackpots.map((jackpot) => (
                <button
                  key={jackpot.id}
                  onClick={() => setSelectedJackpot(jackpot.id)}
                  className={`px-6 py-3 rounded font-semibold whitespace-nowrap transition ${
                    selectedJackpot === jackpot.id
                      ? 'bg-accent-green text-white'
                      : 'bg-primary-light text-gray-400 hover:text-white'
                  }`}
                >
                  {jackpot.name}
                </button>
              ))}
            </div>

            {selectedJackpotData && (
              <>
                {/* Jackpot Info */}
                <div className="bg-gradient-to-r from-accent-green to-green-600 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {selectedJackpotData.prize.toLocaleString()} {selectedJackpotData.name}
                      </h2>
                      <p className="text-green-100">
                        Win KES {selectedJackpotData.prize.toLocaleString()}
                      </p>
                      <p className="text-green-100 text-sm mt-2">
                        Expires on {formatDate(selectedJackpotData.expiresAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="bg-white/20 rounded-lg p-4 mb-2">
                        <p className="text-white text-sm mb-1">Time Remaining</p>
                        {timeRemaining ? (
                          <div className="flex space-x-2 text-white">
                            <div>
                              <p className="text-2xl font-bold">{timeRemaining.days}</p>
                              <p className="text-xs">Days</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{timeRemaining.hours}</p>
                              <p className="text-xs">Hours</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{timeRemaining.mins}</p>
                              <p className="text-xs">Mins</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{timeRemaining.secs}</p>
                              <p className="text-xs">Secs</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex space-x-2 text-white">
                            <div>
                              <p className="text-2xl font-bold">0</p>
                              <p className="text-xs">Days</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">0</p>
                              <p className="text-xs">Hours</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">0</p>
                              <p className="text-xs">Mins</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">0</p>
                              <p className="text-xs">Secs</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <button className="bg-white text-accent-green px-6 py-2 rounded font-semibold hover:bg-green-50 transition">
                        {selectedJackpotData.stake} BOB
                      </button>
                    </div>
                  </div>
                </div>

                {/* Matches */}
                <div className="space-y-4">
                  {selectedJackpotData.matches.map((match: any) => (
                    <div
                      key={match.id}
                      className="bg-primary-light rounded-lg border border-gray-800 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">
                            {match.country} • {match.league}
                          </p>
                          <div className="flex items-center space-x-4">
                            <p className="text-white font-semibold">{match.homeTeam}</p>
                            <p className="text-gray-400">vs</p>
                            <p className="text-white font-semibold">{match.awayTeam}</p>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400 text-sm mt-2">
                            <FiClock size={14} />
                            <span>{formatDate(match.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleMatchSelection(match.id, '1')}
                          className={`p-3 rounded font-semibold transition ${
                            selectedMatches[match.id] === '1'
                              ? 'bg-accent-green text-white'
                              : 'bg-primary-darker text-gray-300 hover:bg-primary-light'
                          }`}
                        >
                          <p className="mb-1">1</p>
                          <p className="text-accent-green">{match.odds['1'].toFixed(2)}</p>
                        </button>
                        <button
                          onClick={() => handleMatchSelection(match.id, 'X')}
                          className={`p-3 rounded font-semibold transition ${
                            selectedMatches[match.id] === 'X'
                              ? 'bg-accent-green text-white'
                              : 'bg-primary-darker text-gray-300 hover:bg-primary-light'
                          }`}
                        >
                          <p className="mb-1">X</p>
                          <p className="text-accent-green">{match.odds['X'].toFixed(2)}</p>
                        </button>
                        <button
                          onClick={() => handleMatchSelection(match.id, '2')}
                          className={`p-3 rounded font-semibold transition ${
                            selectedMatches[match.id] === '2'
                              ? 'bg-accent-green text-white'
                              : 'bg-primary-darker text-gray-300 hover:bg-primary-light'
                          }`}
                        >
                          <p className="mb-1">2</p>
                          <p className="text-accent-green">{match.odds['2'].toFixed(2)}</p>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bet Summary */}
                <div className="bg-primary-light rounded-lg border border-gray-800 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Total Stake</p>
                      <p className="text-2xl font-bold text-white">
                        KES {selectedJackpotData.stake}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        Picked {Object.keys(selectedMatches).length} / {selectedJackpotData.matches.length} Matches
                      </p>
                      <p className="text-gray-400 text-sm">Combinations 0</p>
                    </div>
                  </div>
                  <button className="w-full bg-accent-green hover:bg-green-600 py-3 rounded font-semibold transition">
                    Placebet
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

