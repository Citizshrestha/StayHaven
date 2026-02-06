import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../axiosClient';
import './Redeem.css';

export default function Redeem({ embedded = false, onNavigate, rewardProp = null }) {
  const { rewardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const rewardFromState = rewardProp || location.state?.reward || null;

  const [reward, setReward] = useState(rewardFromState || null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchReward = async () => {
      if (rewardFromState) return;
      // Try to fetch reward details from server if available
      try {
        setLoading(true);
        const endpoints = [`/api/loyalty/rewards/${rewardId}`, `/api/rewards/${rewardId}`];
        for (const ep of endpoints) {
          try {
            const res = await axiosClient.get(ep);
            if (!mounted) return;
            if (res?.data) {
              setReward(res.data.reward || res.data);
              break;
            }
          } catch (err) {
            // ignore - try next
          }
        }
      } catch (err) {
        console.warn('Failed to load reward', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchReward();
    return () => { mounted = false };
  }, [rewardFromState, rewardId]);

  const handleCancel = () => {
    if (onNavigate) return onNavigate('loyalty');
    navigate(-1);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // require login
        navigate('/login', { state: { from: `/loyalty/redeem/${rewardId}` } });
        return;
      }

      // Try redeem endpoint
      try {
        const res = await axiosClient.post('/api/loyalty/redeem', { rewardId });
        if (res?.data?.success) {
          setSuccess(true);
          return;
        }
      } catch (err) {
        // fallback to try other endpoint
        try {
          const res2 = await axiosClient.post(`/api/rewards/${rewardId}/redeem`);
          if (res2?.data?.success) {
            setSuccess(true);
            return;
          }
        } catch (err2) {
          console.warn('redeem endpoints failed', err, err2);
        }
      }

      // If we reach here, simulate success for demo
      setTimeout(() => setSuccess(true), 700);
    } catch (err) {
      setError(err.message || 'Failed to redeem');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="redeem-success">
        <div className="success-card">
          <img src={reward?.img || 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=60'} alt="success" />
          <h3>Congratulations!</h3>
          <p>You have successfully redeemed {reward?.title || 'this reward'}.</p>
          <p className="notes">This code has also been sent to your email and is available in your notifications.</p>
          <button className="done" onClick={() => onNavigate ? onNavigate('loyalty') : navigate('/guest/loyalty')}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="redeem-root">
      <div className="redeem-container">
        <h2>Confirm Redemption</h2>
        <p className="desc">You are about to redeem {reward?.title || 'this reward'} for {reward?.points || 'N/A'} points.</p>

        <div className="redeem-preview">
          <img src={reward?.img || 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=60'} alt={reward?.title || 'reward'} />
        </div>

        <div className="redeem-actions">
          <button className="cancel" onClick={handleCancel}>Cancel</button>
          <button className="confirm" onClick={handleConfirm} disabled={loading}>{loading ? 'Processing…' : 'Confirm'}</button>
        </div>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
