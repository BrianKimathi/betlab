'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betlab-backend.onrender.com/api';

export default function DepositPage() {
  const { user, token, updateBalance } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const quickAmounts = [100, 500, 1000, 5000, 10000];

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${API_URL}/users/deposit`,
        { amount: depositAmount },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      updateBalance(response.data.newBalance);
      setSuccess(`Successfully deposited KES ${depositAmount.toLocaleString()}`);
      setAmount('');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (user && user.balance < withdrawAmount) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${API_URL}/users/withdraw`,
        { amount: withdrawAmount },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      updateBalance(response.data.newBalance);
      setSuccess(`Successfully withdrew KES ${withdrawAmount.toLocaleString()}`);
      setAmount('');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Deposit & Withdraw</h1>

        {/* Balance Card */}
        <div className="bg-primary-light rounded-lg border border-gray-800 p-6 mb-6">
          <p className="text-gray-400 text-sm mb-2">Current Balance</p>
          <p className="text-4xl font-bold text-accent-green">
            KES {user.balance.toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded text-green-200">
            {success}
          </div>
        )}

        {/* Deposit Section */}
        <div className="bg-primary-light rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Deposit Funds</h2>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-primary-darker border border-gray-700 rounded text-white"
              placeholder="Enter amount"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount.toString())}
                className="px-4 py-2 bg-primary-darker hover:bg-accent-green hover:text-white rounded transition"
              >
                KES {quickAmount.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className="w-full bg-accent-green hover:bg-green-600 py-3 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Deposit'}
          </button>

          <p className="text-gray-500 text-xs mt-4 text-center">
            This is a simulation. No real money transactions are processed.
          </p>
        </div>

        {/* Withdraw Section */}
        <div className="bg-primary-light rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold mb-4">Withdraw Funds</h2>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
            <input
              type="number"
              min="1"
              max={user.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-primary-darker border border-gray-700 rounded text-white"
              placeholder="Enter amount"
            />
            <p className="text-gray-500 text-xs mt-1">
              Maximum: KES {user.balance.toLocaleString()}
            </p>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={loading || !amount}
            className="w-full bg-yellow-600 hover:bg-yellow-700 py-3 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Withdraw'}
          </button>

          <p className="text-gray-500 text-xs mt-4 text-center">
            This is a simulation. No real money transactions are processed.
          </p>
        </div>
      </div>
    </Layout>
  );
}

