'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
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

export default function SportsbookPage() {
  const { user, token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('Soccer');

  useEffect(() => {
    if (token) {
      fetchMatches();
    }
  }, [token, selectedSport]);

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API_URL}/matches?sport=${selectedSport}`);
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
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

  const sports = ['Soccer', 'Basketball', 'Volleyball', 'Table Tennis', 'Ice Hockey'];

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Sportsbook</h1>

        {/* Sport Filter */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`px-4 py-2 rounded font-semibold whitespace-nowrap transition ${
                selectedSport === sport
                  ? 'bg-accent-green text-white'
                  : 'bg-primary-light text-gray-400 hover:text-white'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>No {selectedSport.toLowerCase()} matches available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
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
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
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

