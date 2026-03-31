import React, { useState } from 'react';
import { CheckCircle, LogOut, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as receptionApi from '../../../../core/api/services/reception.service';

const spinnerStyle = {
  width: '12px',
  height: '12px',
  border: '2px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  display: 'inline-block',
  animation: 'spin 0.6s linear infinite'
};

const GuestRow = React.memo(({ g, type, setArrivals, setDepartures, setShowMessaging, setMsgRecipient }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await receptionApi.performCheckIn(g.bookingId || g._id);
      toast.success(`${g.guest} checked in successfully`);
      const res = await receptionApi.getTodayArrivals();
      if (res.success) {
        setArrivals((res.data || []).slice(0, 5).map((a, i) => ({
          id: i + 1, guest: a.guest?.name || 'Unknown', room: a.room?.type || '', 
          num: a.room?.number || '', time: a.expectedTime || '', 
          source: a.source || a.bookingSource || '', 
          payment: a.paymentStatus || 'unpaid', 
          vip: a.guest?.vip || a.isVip || false, bookingId: a._id, _id: a._id
        })));
      }
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error(err.response?.data?.message || 'Failed to check in guest');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await receptionApi.performCheckOut(g.bookingId || g._id);
      toast.success(`${g.guest} checked out successfully`);
      const res = await receptionApi.getTodayDepartures();
      if (res.success) {
        setDepartures((res.data || []).slice(0, 5).map((d, i) => ({
          id: i + 1, guest: d.guest?.name || 'Unknown', room: d.room?.type || '', 
          num: d.room?.number || '', time: d.checkOutTime || '', 
          source: d.source || d.bookingSource || '', 
          payment: d.paymentStatus || 'paid', 
          vip: d.guest?.vip || d.isVip || false, bookingId: d._id, _id: d._id
        })));
      }
    } catch (err) {
      console.error('Check-out error:', err);
      toast.error(err.response?.data?.message || 'Failed to check out guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="sh-guest-cell">
          {g.avatarUrl ? (
            <img 
              src={g.avatarUrl} 
              alt={g.guest}
              className="sh-table-avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="sh-table-avatar" 
            style={{ display: g.avatarUrl ? 'none' : 'flex' }}
          >
            {g.guest.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="sh-guest-name">
            {g.guest}
            {g.vip && <span className="sh-vip-badge">VIP</span>}
          </span>
        </div>
      </td>
      <td>{g.room}</td>
      <td style={{ fontWeight: 600 }}>{g.num}</td>
      <td><span className="sh-source-badge">{g.source}</span></td>
      <td>
        <span className={`sh-payment-badge ${g.payment}`}>
          {g.payment.charAt(0).toUpperCase() + g.payment.slice(1)}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {type === 'arrival' && (
            <button
              onClick={handleCheckIn}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: loading ? 'var(--bg-tertiary)' : 'var(--accent-green)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? (
                <>
                  <span style={spinnerStyle} />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Check In
                </>
              )}
            </button>
          )}
          {type === 'departure' && (
            <button
              onClick={handleCheckOut}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: loading ? 'var(--bg-tertiary)' : 'var(--accent-orange)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? (
                <>
                  <span style={spinnerStyle} />
                  Checking Out...
                </>
              ) : (
                <>
                  <LogOut size={14} />
                  Check Out
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              setShowMessaging(true);
              // Pass guest as a contact object that MessagingPanel expects
              setMsgRecipient({
                _id: g._id || g.bookingId,
                fullname: g.guest,
                email: g.email || '',
                phone: g.phone || '',
                profilePicture: g.avatarUrl,
                companyRole: 'guest',
                role: 'guest'
              });
            }}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <MessageCircle size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

GuestRow.displayName = 'GuestRow';

export default GuestRow;
