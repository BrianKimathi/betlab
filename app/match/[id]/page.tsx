'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useBetslip } from '@/contexts/BetslipContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import axios from 'axios';
import { FiArrowLeft, FiStar, FiInfo, FiClock } from 'react-icons/fi';

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
  odds: any;
  liveEvents: any[];
}

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { addToBetslip, betslip } = useBetslip();
  const { matchUpdates, subscribeToMatch } = useWebSocket();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMarket, setActiveMarket] = useState('main');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [matchMinute, setMatchMinute] = useState(0);

  useEffect(() => {
    if (token && params.id) {
      fetchMatch();
      subscribeToMatch(params.id as string);
    }
  }, [token, params.id]);

  // Update match with WebSocket data
  useEffect(() => {
    if (match && matchUpdates[match.id]) {
      const update = matchUpdates[match.id];
      setMatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          score: update.score || prev.score,
          status: update.status || prev.status,
          odds: update.odds || prev.odds,
          liveEvents: update.events || prev.liveEvents
        };
      });
      if (update.elapsedTime !== undefined) {
        setElapsedTime(update.elapsedTime);
        setMatchMinute(update.matchMinute || 0);
      }
    }
  }, [matchUpdates, match?.id]);

  const fetchMatch = async () => {
    try {
      const response = await axios.get(`${API_URL}/matches/${params.id}`);
      setMatch(response.data);
    } catch (error) {
      console.error('Failed to fetch match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBetslip = (betType: string, selection: any, odds: number) => {
    if (!match) return;

    const bet = {
      matchId: match.id,
      match: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league
      },
      betType,
      selection,
      odds
    };

    addToBetslip(bet);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${day}/${month} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
        </div>
      </Layout>
    );
  }

  if (!match) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">
          <p>Match not found</p>
        </div>
      </Layout>
    );
  }

  const renderMainMarkets = () => (
    <div className="space-y-4">
      {/* 1x2 Market */}
      {match.odds.homeWin && match.odds.draw && match.odds.awayWin && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>1x2 (Full Time Result)</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleAddToBetslip('1x2', '1', match.odds.homeWin)}
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">1</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.homeWin.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() => handleAddToBetslip('1x2', 'X', match.odds.draw)}
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">X</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.draw.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() => handleAddToBetslip('1x2', '2', match.odds.awayWin)}
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">2</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.awayWin.toFixed(2)}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Both Teams to Score */}
      {match.odds.bothTeamsToScore && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>Both Teams To Score (GG/NG)</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                handleAddToBetslip('bothTeamsToScore', 'yes', match.odds.bothTeamsToScore.yes)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">Yes</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.bothTeamsToScore.yes.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('bothTeamsToScore', 'no', match.odds.bothTeamsToScore.no)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">No</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.bothTeamsToScore.no.toFixed(2)}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Double Chance */}
      {match.odds.doubleChance && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>Double Chance</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(match.odds.doubleChance).map(([key, odds]: [string, any]) => (
              <button
                key={key}
                onClick={() => handleAddToBetslip('doubleChance', key, odds)}
                className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
              >
                <p className="font-semibold mb-1">{key}</p>
                <p className="text-accent-green text-lg font-bold">{odds.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderGoalsMarkets = () => (
    <div className="space-y-4">
      {/* Over/Under Goals */}
      {match.odds.overUnder && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>Total (Over/Under Goals)</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(match.odds.overUnder).map(([threshold, odds]: [string, any]) => (
              <div key={threshold} className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleAddToBetslip('overUnder', { threshold, direction: 'over' }, odds.over)
                  }
                  className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                >
                  <p className="text-sm mb-1">Over {threshold}</p>
                  <p className="text-accent-green font-bold">{odds.over.toFixed(2)}</p>
                </button>
                <button
                  onClick={() =>
                    handleAddToBetslip('overUnder', { threshold, direction: 'under' }, odds.under)
                  }
                  className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                >
                  <p className="text-sm mb-1">Under {threshold}</p>
                  <p className="text-accent-green font-bold">{odds.under.toFixed(2)}</p>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exact Goals */}
      {match.odds.goals?.exact && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>Exact Goals</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(match.odds.goals.exact).map(([goals, odds]: [string, any]) => (
              <button
                key={goals}
                onClick={() => handleAddToBetslip('exactGoals', goals, odds)}
                className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
              >
                <p className="font-semibold mb-1">{goals}</p>
                <p className="text-accent-green font-bold">{odds.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* First Goal */}
      {match.odds.goals?.firstGoal && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>First Goal</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() =>
                handleAddToBetslip('firstGoal', '1', match.odds.goals.firstGoal['1'])
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">{match.homeTeam.substring(0, 10)}</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.goals.firstGoal['1'].toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('firstGoal', 'none', match.odds.goals.firstGoal.none)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">None</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.goals.firstGoal.none.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('firstGoal', '2', match.odds.goals.firstGoal['2'])
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">{match.awayTeam.substring(0, 10)}</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.goals.firstGoal['2'].toFixed(2)}
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderFirstHalfMarkets = () => (
    <div className="space-y-4">
      {/* First Half 1x2 */}
      {match.odds.firstHalf?.['1x2'] && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>1st Half - 1x2</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(match.odds.firstHalf['1x2']).map(([key, odds]: [string, any]) => (
              <button
                key={key}
                onClick={() => handleAddToBetslip('firstHalf1x2', key, odds)}
                className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
              >
                <p className="font-semibold mb-1">{key}</p>
                <p className="text-accent-green text-lg font-bold">{odds.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* First Half Total */}
      {match.odds.firstHalf?.total && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>1st Half - Total</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(match.odds.firstHalf.total).map(([threshold, odds]: [string, any]) => (
              <div key={threshold} className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleAddToBetslip('firstHalfTotal', { threshold, direction: 'over' }, odds.over)
                  }
                  className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                >
                  <p className="text-sm mb-1">Over {threshold}</p>
                  <p className="text-accent-green font-bold">{odds.over.toFixed(2)}</p>
                </button>
                <button
                  onClick={() =>
                    handleAddToBetslip('firstHalfTotal', { threshold, direction: 'under' }, odds.under)
                  }
                  className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                >
                  <p className="text-sm mb-1">Under {threshold}</p>
                  <p className="text-accent-green font-bold">{odds.under.toFixed(2)}</p>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPlayerMarkets = () => (
    <div className="space-y-4">
      {/* First Goal Scorer */}
      {match.odds.player?.firstGoalScorer && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>First Goal Scorer</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">{match.homeTeam}</p>
              <div className="grid grid-cols-3 gap-2">
                {match.odds.player.firstGoalScorer.home?.map((player: any) => (
                  <button
                    key={player.name}
                    onClick={() => handleAddToBetslip('firstGoalScorer', { team: 'home', player: player.name }, player.odds)}
                    className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                  >
                    <p className="text-sm font-semibold mb-1">{player.name}</p>
                    <p className="text-accent-green font-bold">{player.odds.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">{match.awayTeam}</p>
              <div className="grid grid-cols-3 gap-2">
                {match.odds.player.firstGoalScorer.away?.map((player: any) => (
                  <button
                    key={player.name}
                    onClick={() => handleAddToBetslip('firstGoalScorer', { team: 'away', player: player.name }, player.odds)}
                    className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                  >
                    <p className="text-sm font-semibold mb-1">{player.name}</p>
                    <p className="text-accent-green font-bold">{player.odds.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Goal Scorer (Live) */}
      {match.status === 'live' && match.odds.nextGoalScorer && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>Next Goal Scorer</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() =>
                handleAddToBetslip('nextGoalScorer', 'home', match.odds.nextGoalScorer.home)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">{match.homeTeam}</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.nextGoalScorer.home.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('nextGoalScorer', 'none', match.odds.nextGoalScorer.none)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">None</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.nextGoalScorer.none.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('nextGoalScorer', 'away', match.odds.nextGoalScorer.away)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">{match.awayTeam}</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.nextGoalScorer.away.toFixed(2)}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Penalty Betting (Live) */}
      {match.status === 'live' && match.odds.penalty && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiStar className="text-accent-yellow" />
              <span>Penalty Betting</span>
            </h3>
            <FiInfo className="text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() =>
                handleAddToBetslip('penalty', 'yes', match.odds.penalty.yes)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">Penalty Awarded</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.penalty.yes.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('penalty', 'no', match.odds.penalty.no)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">No Penalty</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.penalty.no.toFixed(2)}
              </p>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                handleAddToBetslip('penalty', 'home', match.odds.penalty.home)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">{match.homeTeam} Penalty</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.penalty.home.toFixed(2)}
              </p>
            </button>
            <button
              onClick={() =>
                handleAddToBetslip('penalty', 'away', match.odds.penalty.away)
              }
              className="bg-primary-darker hover:bg-accent-green hover:text-white p-4 rounded transition text-center"
            >
              <p className="font-semibold mb-1">{match.awayTeam} Penalty</p>
              <p className="text-accent-green text-lg font-bold">
                {match.odds.penalty.away.toFixed(2)}
              </p>
            </button>
          </div>
          
          {/* Penalty in Time Window */}
          {matchMinute > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-gray-400 text-sm mb-3">Penalty in Time Window</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { start: matchMinute, end: matchMinute + 5, label: `Min ${matchMinute}-${matchMinute + 5}` },
                  { start: matchMinute + 5, end: matchMinute + 10, label: `Min ${matchMinute + 5}-${matchMinute + 10}` },
                  { start: matchMinute + 10, end: matchMinute + 15, label: `Min ${matchMinute + 10}-${matchMinute + 15}` }
                ].map((window, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      handleAddToBetslip('penaltyInTime', { timeWindow: window }, 8.00 + Math.random() * 4)
                    }
                    className="bg-primary-darker hover:bg-accent-green hover:text-white p-3 rounded transition text-center"
                  >
                    <p className="text-xs font-semibold mb-1">{window.label}</p>
                    <p className="text-accent-green font-bold">{(8.00 + Math.random() * 4).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Events Feed */}
      {match.status === 'live' && match.liveEvents && match.liveEvents.length > 0 && (
        <div className="bg-primary-light rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <FiClock className="text-accent-yellow" />
              <span>Live Events</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...match.liveEvents].reverse().map((event: any, idx: number) => (
              <div key={idx} className="flex items-center space-x-3 p-2 bg-primary-darker rounded">
                <span className="text-gray-400 text-sm">Min {event.minute}</span>
                {event.type === 'goal' && (
                  <span className="text-accent-green">⚽ Goal - {event.player}</span>
                )}
                {event.type === 'penalty' && (
                  <span className="text-yellow-400">
                    {event.converted ? '✅ Penalty Scored' : '❌ Penalty Missed'} - {event.team === 'home' ? match.homeTeam : match.awayTeam}
                  </span>
                )}
                {event.type === 'card' && (
                  <span className={event.cardType === 'red' ? 'text-red-400' : 'text-yellow-400'}>
                    {event.cardType === 'red' ? '🟥' : '🟨'} Card - {event.player}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center space-x-2 text-gray-400 hover:text-white transition"
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Match Header */}
        <div className="bg-primary-light rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">
                {match.country}, {match.league}
              </p>
              <p className="text-gray-400 text-sm">#{match.id}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">{formatDate(match.date)}</p>
              {match.status === 'live' && (
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded mt-1 inline-block">
                  LIVE
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center space-x-8 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-darker rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">🏆</span>
              </div>
              <p className="text-white font-semibold">{match.homeTeam}</p>
            </div>

            {match.status === 'live' ? (
              <div className="text-center">
                <p className="text-4xl font-bold text-accent-green">
                  {match.score.home} - {match.score.away}
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded animate-pulse">
                    LIVE
                  </span>
                  {matchMinute > 0 && (
                    <span className="text-gray-400 text-sm">Min {matchMinute}</span>
                  )}
                  {elapsedTime > 0 && (
                    <span className="text-gray-500 text-xs">
                      {Math.floor(elapsedTime)}s / {Math.floor((matchUpdates[match.id]?.duration || 50))}s
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-400">VS</p>
              </div>
            )}

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-darker rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">🏆</span>
              </div>
              <p className="text-white font-semibold">{match.awayTeam}</p>
            </div>
          </div>
        </div>

        {/* Market Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {[
            { id: 'main', label: 'Main' },
            { id: 'goals', label: 'Goals' },
            { id: 'firstHalf', label: 'First Half' },
            { id: 'player', label: 'Player' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMarket(tab.id)}
              className={`px-4 py-2 rounded font-semibold whitespace-nowrap transition ${
                activeMarket === tab.id
                  ? 'bg-accent-green text-white'
                  : 'bg-primary-light text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Betting Markets */}
        {activeMarket === 'main' && renderMainMarkets()}
        {activeMarket === 'goals' && renderGoalsMarkets()}
        {activeMarket === 'firstHalf' && renderFirstHalfMarkets()}
        {activeMarket === 'player' && renderPlayerMarkets()}

        {/* Betslip Indicator */}
        {betslip.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-accent-green hover:bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold transition z-50">
            <button onClick={() => router.push('/betting')}>
              Betslip ({betslip.length})
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
