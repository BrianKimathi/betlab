'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betlab-backend.onrender.com/api';

interface CasinoGame {
  id: string;
  name: string;
  type: string;
  description: string;
  minBet: number;
  maxBet: number;
  image: string;
}

export default function CasinoPage() {
  const { user, token, updateBalance } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<CasinoGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<CasinoGame | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [gameResult, setGameResult] = useState<any>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (token) {
      fetchGames();
    }
  }, [token]);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API_URL}/casino/games`);
      setGames(response.data);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!selectedGame || !betAmount) return;

    const amount = parseFloat(betAmount);
    if (amount < selectedGame.minBet || amount > selectedGame.maxBet) {
      alert(`Bet amount must be between ${selectedGame.minBet} and ${selectedGame.maxBet}`);
      return;
    }

    if (user && user.balance < amount) {
      alert('Insufficient balance');
      return;
    }

    setPlaying(true);
    setGameResult(null);

    try {
      const response = await axios.post(
        `${API_URL}/casino/play`,
        {
          gameId: selectedGame.id,
          betAmount: amount,
          action: 'play'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const result = response.data;
      setGameResult(result);

      // Update balance
      if (result.win) {
        updateBalance(user!.balance - amount + result.payout);
      } else {
        updateBalance(user!.balance - amount);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to play game');
    } finally {
      setPlaying(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Casino</h1>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-primary-light rounded-lg border border-gray-800 p-6 hover:border-accent-green transition cursor-pointer"
                onClick={() => setSelectedGame(game)}
              >
                <div className="text-6xl mb-4 text-center">{game.image}</div>
                <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{game.description}</p>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Min: KES {game.minBet.toLocaleString()}</span>
                  <span>Max: KES {game.maxBet.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Game Modal */}
        {selectedGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-light rounded-lg border border-gray-800 p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedGame.name}</h2>
                <button
                  onClick={() => {
                    setSelectedGame(null);
                    setGameResult(null);
                    setBetAmount('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="text-6xl text-center mb-6">{selectedGame.image}</div>

              {gameResult ? (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded text-center ${
                      gameResult.win
                        ? 'bg-green-900/30 border border-green-700'
                        : 'bg-red-900/30 border border-red-700'
                    }`}
                  >
                    <p className={`text-2xl font-bold ${gameResult.win ? 'text-green-400' : 'text-red-400'}`}>
                      {gameResult.win ? '🎉 You Won!' : '😔 You Lost'}
                    </p>
                    {gameResult.win && (
                      <p className="text-green-300 mt-2">
                        Multiplier: {gameResult.multiplier.toFixed(2)}x
                      </p>
                    )}
                    <p className="text-white mt-2">
                      {gameResult.win
                        ? `Payout: KES ${gameResult.payout.toLocaleString()}`
                        : `Lost: KES ${gameResult.betAmount.toLocaleString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setGameResult(null);
                      setBetAmount('');
                    }}
                    className="w-full bg-accent-green hover:bg-green-600 py-3 rounded font-semibold transition"
                  >
                    Play Again
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Bet Amount (KES)</label>
                    <input
                      type="number"
                      min={selectedGame.minBet}
                      max={selectedGame.maxBet}
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-primary-darker border border-gray-700 rounded text-white"
                      placeholder={`Min: ${selectedGame.minBet}, Max: ${selectedGame.maxBet}`}
                    />
                  </div>
                  <button
                    onClick={handlePlay}
                    disabled={playing || !betAmount}
                    className="w-full bg-accent-green hover:bg-green-600 py-3 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {playing ? 'Playing...' : 'Play'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

