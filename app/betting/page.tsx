'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useBetslip } from '@/contexts/BetslipContext';
import axios from 'axios';
import { FiX } from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betlab-backend.onrender.com/api';

export default function BettingPage() {
  const { user, token, updateBalance } = useAuth();
  const { betslip, removeFromBetslip, clearBetslip } = useBetslip();
  const router = useRouter();
  const [totalStake, setTotalStake] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const removeBet = (index: number) => {
    removeFromBetslip(index);
  };

  const handleTotalStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTotalStake(value);
    }
  };

  const calculateStakePerBet = () => {
    const total = parseFloat(totalStake) || 0;
    if (betslip.length === 0 || total === 0) return 0;
    return total / betslip.length;
  };

  const calculateCombinedOdds = () => {
    return betslip.reduce((acc, bet) => acc * bet.odds, 1);
  };

  const calculatePotentialPayout = () => {
    const stake = parseFloat(totalStake) || 0;
    return stake * calculateCombinedOdds();
  };

  const placeBet = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (betslip.length === 0) {
      setError('Please add bets to your betslip');
      return;
    }

    const stake = parseFloat(totalStake);
    if (!stake || stake <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (user && user.balance < stake) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const stakePerBet = stake / betslip.length;
      
      // Place each bet individually
      for (let i = 0; i < betslip.length; i++) {
        const bet = betslip[i];
        
        await axios.post(
          `${API_URL}/bets`,
          {
            matchId: bet.matchId,
            betType: bet.betType,
            selection: bet.selection,
            stake: stakePerBet
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      // Update user balance
      const newBalance = user!.balance - stake;
      updateBalance(newBalance);

      // Clear betslip
      clearBetslip();
      setTotalStake('');

      router.push('/my-bets');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Place Your Bet</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}

        {betslip.length === 0 ? (
          <div className="bg-primary-light rounded-lg border border-gray-800 p-8 text-center">
            <p className="text-gray-400 mb-4">Your betslip is empty</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-accent-green hover:bg-green-600 px-6 py-2 rounded font-semibold transition"
            >
              Browse Matches
            </button>
          </div>
        ) : (
          <form onSubmit={placeBet}>
            <div className="space-y-4">
              {/* Total Stake Input */}
              <div className="bg-primary-light rounded-lg border border-gray-800 p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Stake (KES)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  min="1"
                  max={user.balance}
                  value={totalStake}
                  onChange={handleTotalStakeChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      placeBet();
                    }
                  }}
                  className="w-full px-4 py-3 bg-primary-darker border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green text-white text-lg font-semibold"
                  placeholder="Enter total stake amount"
                />
                <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
                  <span>Available Balance: KES {user.balance.toLocaleString()}</span>
                  {totalStake && (
                    <button
                      type="button"
                      onClick={() => setTotalStake(user.balance.toString())}
                      className="text-accent-green hover:text-green-400 transition"
                    >
                      Use Max
                    </button>
                  )}
                </div>
              </div>

              {/* Bet List */}
              {betslip.map((bet, index) => (
                <div
                  key={index}
                  className="bg-primary-light rounded-lg border border-gray-800 p-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-white font-semibold mb-1">
                        {bet.match.homeTeam} vs {bet.match.awayTeam}
                      </p>
                      <p className="text-gray-400 text-sm mb-2">{bet.match.league}</p>
                      <p className="text-gray-300 text-sm">
                        {bet.betType === '1x2' && `Result: ${bet.selection}`}
                        {bet.betType === 'overUnder' &&
                          `${bet.selection.direction === 'over' ? 'Over' : 'Under'} ${bet.selection.threshold}`}
                        {bet.betType === 'bothTeamsToScore' &&
                          `Both Teams to Score: ${bet.selection === 'yes' ? 'Yes' : 'No'}`}
                        {bet.betType === 'nextGoalScorer' &&
                          `Next Goal Scorer: ${bet.selection}`}
                        {bet.betType === 'firstHalf1x2' &&
                          `1st Half Result: ${bet.selection}`}
                        {bet.betType === 'firstHalfTotal' &&
                          `1st Half ${bet.selection.direction === 'over' ? 'Over' : 'Under'} ${bet.selection.threshold}`}
                        {bet.betType === 'exactGoals' &&
                          `Exact Goals: ${bet.selection}`}
                        {bet.betType === 'firstGoal' &&
                          `First Goal: ${bet.selection}`}
                        {bet.betType === 'firstGoalScorer' &&
                          `First Goal Scorer: ${bet.selection.player}`}
                        {bet.betType === 'doubleChance' &&
                          `Double Chance: ${bet.selection}`}
                        {bet.betType === 'penalty' &&
                          `Penalty: ${bet.selection === 'yes' ? 'Awarded' : bet.selection === 'no' ? 'No Penalty' : bet.selection === 'home' ? `${bet.match.homeTeam} Penalty` : `${bet.match.awayTeam} Penalty`}`}
                        {bet.betType === 'penaltyInTime' &&
                          `Penalty in Min ${bet.selection.timeWindow.start}-${bet.selection.timeWindow.end}`}
                      </p>
                      <p className="text-accent-green font-bold mt-2">Odds: {bet.odds.toFixed(2)}</p>
                      {totalStake && (
                        <p className="text-gray-400 text-xs mt-1">
                          Stake per bet: KES {(calculateStakePerBet()).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBet(index)}
                      className="text-gray-400 hover:text-red-400 transition ml-4"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="bg-primary-light rounded-lg border border-gray-800 p-6 mt-6">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Number of Bets:</span>
                    <span className="text-white font-semibold">{betslip.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Total Stake:</span>
                    <span className="text-white font-semibold">
                      KES {(parseFloat(totalStake) || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Combined Odds:</span>
                    <span className="text-white font-semibold">
                      {calculateCombinedOdds().toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between text-accent-green text-lg font-bold pt-2 border-t border-gray-700">
                    <span>Potential Payout:</span>
                    <span>
                      KES {calculatePotentialPayout().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !totalStake || parseFloat(totalStake) <= 0}
                  className="w-full bg-accent-green hover:bg-green-600 py-3 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Placing Bet...' : 'Place Bet'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
