/**
 * WaiterCallsPanel Component
 * 
 * Displays real-time waiter call requests from guests.
 * When a guest presses "Call Waiter" from their room or table,
 * it appears here instantly via WebSocket.
 * 
 * FEATURES:
 * - Real-time updates via Socket.io
 * - Sound notification for new calls
 * - Priority-based sorting (urgent first)
 * - Acknowledge and resolve actions
 */

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Phone,
  X,
  RefreshCw,
  User,
  MapPin,
  MessageSquare,
  Hand
} from "lucide-react";
import { getActiveProperty } from "../../../../api/staff";
import axiosClient from "../../../../axiosClient";
import { useSocket } from "../../../../context/SocketContext";
import useNotificationSound from "../../../../hooks/useNotificationSound";

const WaiterCallsPanel = ({ onClose, onCallCountChange }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [processingCall, setProcessingCall] = useState(null);

  const { subscribe, isConnected } = useSocket();
  const { playWithVibration } = useNotificationSound();

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Update call count when calls change
  useEffect(() => {
    if (onCallCountChange) {
      // Only count open/unacknowledged calls
      const activeCallCount = calls.filter(c => c.status === 'open').length;
      onCallCountChange(activeCallCount);
    }
  }, [calls, onCallCountChange]);

  // Fetch active waiter calls
  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const activeProperty = getActiveProperty();
      if (!activeProperty?._id) {
        setError("No active property found");
        return;
      }

      const response = await axiosClient.get("/api/staff/waiter-calls", {
        params: { hotelId: activeProperty._id }
      });

      if (response.data.success) {
        setCalls(response.data.calls || []);
      }
    } catch (err) {
      console.error("Failed to fetch waiter calls:", err);
      setError(err.response?.data?.message || "Failed to load waiter calls");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Subscribe to real-time waiter call events
  useEffect(() => {
    if (!subscribe) return;

    // New waiter call received
    const unsubscribeNew = subscribe('new-waiter-call', (data) => {
      console.log('📞 New waiter call:', data);
      playWithVibration('waiterCall');
      setCalls(prev => [data.call, ...prev]);
    });

    // Call acknowledged by someone
    const unsubscribeAck = subscribe('waiter-call-acknowledged', (data) => {
      console.log('✅ Call acknowledged:', data);
      setCalls(prev => prev.map(call =>
        call._id === data.callId
          ? { ...call, status: 'acknowledged', acknowledgedAt: data.acknowledgedAt }
          : call
      ));
    });

    // Call resolved
    const unsubscribeResolved = subscribe('waiter-call-resolved', (data) => {
      console.log('✅ Call resolved:', data);
      setCalls(prev => prev.filter(call => call._id !== data.callId));
    });

    return () => {
      unsubscribeNew();
      unsubscribeAck();
      unsubscribeResolved();
    };
  }, [subscribe, playWithVibration]);

  // Acknowledge a call
  const handleAcknowledge = async (callId) => {
    try {
      setProcessingCall(callId);
      await axiosClient.put(`/api/staff/waiter-calls/${callId}/acknowledge`);
      // Socket will update the state automatically
    } catch (err) {
      console.error("Failed to acknowledge call:", err);
      alert(err.response?.data?.message || "Failed to acknowledge call");
    } finally {
      setProcessingCall(null);
    }
  };

  // Resolve a call
  const handleResolve = async (callId) => {
    try {
      setProcessingCall(callId);
      await axiosClient.put(`/api/staff/waiter-calls/${callId}/resolve`);
      // Socket will update the state automatically
    } catch (err) {
      console.error("Failed to resolve call:", err);
      alert(err.response?.data?.message || "Failed to resolve call");
    } finally {
      setProcessingCall(null);
    }
  };

  // Get priority styles
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return { bg: '#FEE2E2', color: '#DC2626', label: 'Urgent' };
      case 'high':
        return { bg: '#FEF3C7', color: '#D97706', label: 'High' };
      case 'medium':
        return { bg: '#DBEAFE', color: '#2563EB', label: 'Medium' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', label: 'Low' };
    }
  };

  // Get request type icon
  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle size={20} />;
      case 'roomService':
        return <Bell size={20} />;
      case 'assistance':
        return <Hand size={20} />;
      default:
        return <MessageSquare size={20} />;
    }
  };

  // Format time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  // Styles
  const containerStyle = {
    backgroundColor: 'var(--bg-secondary)',
    minHeight: '100vh',
    padding: isMobile ? '16px' : '32px 48px',
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: isMobile ? '100px' : '32px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const titleStyle = {
    fontSize: isMobile ? '28px' : '36px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const callCardStyle = (priority) => {
    const priorityStyle = getPriorityStyle(priority);
    return {
      backgroundColor: 'var(--card-bg)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      border: `2px solid ${priorityStyle.color}20`,
      borderLeft: `4px solid ${priorityStyle.color}`,
    };
  };

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            <Phone size={32} />
            Waiter Calls
            {calls.length > 0 && (
              <span style={{
                backgroundColor: '#DC2626',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '700',
              }}>
                {calls.length} active
              </span>
            )}
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10B981' : '#EF4444',
            }} />
            <span style={{
              fontSize: '14px',
              color: 'var(--text-tertiary)'
            }}>
              {isConnected ? 'Live updates active' : 'Connecting...'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchCalls}
            style={{
              ...buttonStyle,
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
            disabled={loading}
          >
            <RefreshCw size={16} style={{
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }} />
            Refresh
          </button>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                ...buttonStyle,
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                padding: '10px',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Calls List */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-tertiary)'
        }}>
          <RefreshCw
            size={48}
            style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }}
          />
          <p>Loading waiter calls...</p>
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#DC2626'
        }}>
          <p>{error}</p>
        </div>
      ) : calls.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-tertiary)'
        }}>
          <CheckCircle size={48} style={{ marginBottom: '16px' }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '8px',
            color: 'var(--text-secondary)'
          }}>
            No active calls
          </h3>
          <p>You'll be notified when a guest needs assistance.</p>
        </div>
      ) : (
        <div>
          {calls.map((call) => {
            const priorityStyle = getPriorityStyle(call.priority);
            const isProcessing = processingCall === call._id;

            return (
              <div key={call._id} style={callCardStyle(call.priority)}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  {/* Left side - Call info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: priorityStyle.bg,
                        color: priorityStyle.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {getRequestTypeIcon(call.requestType)}
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '700',
                          fontSize: '18px',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <MapPin size={16} />
                          Room {call.roomNumber}
                        </p>
                        <p style={{
                          margin: '2px 0 0 0',
                          fontSize: '14px',
                          color: 'var(--text-tertiary)',
                          textTransform: 'capitalize'
                        }}>
                          {call.requestType?.replace(/([A-Z])/g, ' $1').trim() || 'Assistance'}
                        </p>
                      </div>
                    </div>

                    {call.description && (
                      <p style={{
                        margin: '0 0 12px 0',
                        padding: '12px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: 'var(--text-secondary)'
                      }}>
                        "{call.description}"
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: priorityStyle.bg,
                        color: priorityStyle.color,
                      }}>
                        {priorityStyle.label} Priority
                      </span>
                      <span style={{
                        fontSize: '13px',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={14} />
                        {getTimeAgo(call.createdAt)}
                      </span>
                      {call.status === 'acknowledged' && (
                        <span style={{
                          fontSize: '13px',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <User size={14} />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {call.status === 'open' && (
                      <button
                        onClick={() => handleAcknowledge(call._id)}
                        disabled={isProcessing}
                        style={{
                          ...buttonStyle,
                          backgroundColor: '#2563EB',
                          color: 'white',
                          opacity: isProcessing ? 0.7 : 1,
                        }}
                      >
                        <Hand size={16} />
                        On My Way
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(call._id)}
                      disabled={isProcessing}
                      style={{
                        ...buttonStyle,
                        backgroundColor: '#10B981',
                        color: 'white',
                        opacity: isProcessing ? 0.7 : 1,
                      }}
                    >
                      <CheckCircle size={16} />
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WaiterCallsPanel;
