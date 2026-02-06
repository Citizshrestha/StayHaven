import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../axiosClient';
import './LoyaltyRewards.css';

const DEMO_REWARDS = [
  { id: 'r1', title: 'Free Breakfast', points: 500, img: 'https://images.unsplash.com/photo-1542144582-1ba0041e9a90?auto=format&fit=crop&w=1200&q=60' },
  { id: 'r2', title: '10% Off Next Stay', points: 1000, img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60' },
  { id: 'r3', title: 'Spa Voucher', points: 1500, img: 'https://images.unsplash.com/photo-1585155770315-09c4b1e9f5d8?auto=format&fit=crop&w=1200&q=60' }
];

export default function LoyaltyRewards({ embedded = false, onNavigate }) {
  const navigate = useNavigate();
  const [points, setPoints] = useState(2450);
  const [tier, setTier] = useState('Gold');
  const [progress, setProgress] = useState(0.6);
  const [rewards, setRewards] = useState(DEMO_REWARDS);
  const [activity, setActivity] = useState([
    { date: '2023-08-15', description: 'Booking at Hotel Everest', points: +1000 },
    { date: '2023-08-16', description: 'Dining at Hotel Everest', points: +500 },
    { date: '2023-08-17', description: 'Redeemed Spa Voucher', points: -1500 }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Try fetching loyalty info from a backend endpoint if available
    let mounted = true;
    const fetchLoyalty = async () => {
      setLoading(true);
      try {
        // Attempt common endpoints - adapt when backend available
        const candidate = [
          '/api/loyalty/me',
          '/api/user/loyalty',
          '/api/loyalty',
        ];
        for (const ep of candidate) {
          try {
            const res = await axiosClient.get(ep);
            if (!mounted) return;
            // Look for common shapes
            const data = res.data;
            if (data) {
              if (data.points !== undefined) setPoints(data.points);
              if (data.tier) setTier(data.tier);
              if (data.progress) setProgress(data.progress);
              if (data.rewards) setRewards(data.rewards);
              if (data.activity) setActivity(data.activity);
              break; // stop once we have a successful response
            }
          } catch (err) {
            // ignore and try next
          }
        }
      } catch (err) {
        console.warn('Loyalty fetch failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLoyalty();
    return () => { mounted = false };
  }, []);

  function handleRedeem(reward) {
    // Navigate to Redeem page or use embedded callback
    if (onNavigate) return onNavigate('redeem', { reward });
    navigate(`/guest/loyalty/redeem/${reward.id}`, { state: { reward } });
  }

  return (
    <div className="loyalty-root">
      <aside className="loyalty-side">
        <div className="brand">HotelsInNepal</div>
        <nav className="side-nav">
          <button className="nav-btn" onClick={() => navigate('/guest-dashboard')}>Home</button>
          <button className="nav-btn active">Loyalty Rewards</button>
          <button className="nav-btn" onClick={() => navigate('/my-bookings')}>My Bookings</button>
          <button className="nav-btn" onClick={() => navigate('/order-food')}>Order Food</button>
        </nav>
      </aside>

      <main className="loyalty-main">
        <header className="loyalty-header">
          <h1>Loyalty Rewards</h1>
          <p className="subtitle">Explore your rewards and recent activity</p>
        </header>

        <section className="points-box">
          <div className="points-left">
            <div className="balance">{points.toLocaleString()} Points</div>
            <div className="tier">{tier} Member</div>
          </div>
          <div className="points-right">
            <div className="tier-progress">Tier Progress</div>
            <div className="progress-bar" aria-hidden>
              <div className="progress" style={{ width: `${Math.round((progress||0)*100)}%` }} />
            </div>
            <div className="progress-label">{tier} Status</div>
          </div>
        </section>

        <section className="rewards">
          <h3>Redeemable Rewards</h3>
          <div className="rewards-grid">
            {rewards.map(r => (
              <div key={r.id} className="reward-card">
                <img src={r.img} alt={r.title} />
                <div className="reward-meta">
                  <div className="reward-title">{r.title}</div>
                  <div className="reward-points">{r.points} Points</div>
                  <button className="redeem-btn" onClick={() => handleRedeem(r)}>Redeem</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="activity">
          <h3>Recent Activity</h3>
          <div className="activity-table">
            <div className="table-row table-head">
              <div>Date</div><div>Description</div><div>Points</div>
            </div>
            {activity.map((a, i) => (
              <div className="table-row" key={i}>
                <div>{a.date}</div>
                <div>{a.description}</div>
                <div className={`points ${a.points >=0 ? 'pos' : 'neg'}`}>{a.points >=0 ? `+${a.points}` : a.points}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
