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

import { useState, useEffect, useCallback, useRef } from "react";
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
import { toast } from "react-toastify";
import { getActiveProperty, getCurrentStaffUser } from "../../../../core/api/services/staffAccount.service";
import axiosClient from "../../../../core/api/client";
import { useSocket } from "../../../../core/context/SocketContext";
import { useTheme } from "../../../../core/hooks/useTheme";

const WaiterCallsPanel = ({ onClose, onCallCountChange }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [processingCall, setProcessingCall] = useState(null);
  const { isDark } = useTheme();

  const { subscribe, isConnected } = useSocket();
  // Sound and vibration for a new call are played once, app-wide, by NotificationContext
  // (it also keeps the badge count), so this panel stays silent to avoid a double beep.
  const myId = getCurrentStaffUser()?._id;
  const myRole = getCurrentStaffUser()?.role;

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
  const fetchCalls = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const activeProperty = getActiveProperty();
      if (!activeProperty?._id) {
        setError("No active property found");
        return;
      }

      const response = await axiosClient.get("/api/v1/staff/waiter-calls", {
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

  // After a dropped connection (network loss, backend restart) events may have been missed:
  // reload the list once the socket is back.
  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !wasConnected.current) fetchCalls({ silent: true });
    wasConnected.current = isConnected;
  }, [isConnected, fetchCalls]);

  // Subscribe to real-time waiter call events
  useEffect(() => {
    if (!subscribe) return;

    // New waiter call received
    const unsubscribeNew = subscribe('new-waiter-call', (data) => {
      const incoming = data?.call || data;
      if (!incoming?._id) return;
      // The server emits to the waiters room and the hotel room, and a reconnect can replay
      // the event: never list the same call twice.
      setCalls(prev => (prev.some(c => c._id === incoming._id) ? prev : [incoming, ...prev]));
    });

    // Call acknowledged by someone
    const unsubscribeAck = subscribe('waiter-call-acknowledged', (data) => {
      setCalls(prev => prev.map(call =>
        call._id === data.callId
          ? { ...call, status: 'acknowledged', acknowledgedAt: data.acknowledgedAt, acknowledgedBy: data.acknowledgedBy }
          : call
      ));
    });

    // Call resolved
    const unsubscribeResolved = subscribe('waiter-call-resolved', (data) => {
      setCalls(prev => prev.filter(call => call._id !== data.callId));
    });

    return () => {
      unsubscribeNew();
      unsubscribeAck();
      unsubscribeResolved();
    };
  }, [subscribe]);

  // Acknowledge a call
  const handleAcknowledge = async (callId) => {
    try {
      setProcessingCall(callId);
      await axiosClient.put(`/api/v1/staff/waiter-calls/${callId}/acknowledge`);
      // Socket will update the state automatically
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to acknowledge call");
      fetchCalls({ silent: true }); // someone else may have taken it: show the real state
    } finally {
      setProcessingCall(null);
    }
  };

  // Resolve a call
  const handleResolve = async (callId) => {
    try {
      setProcessingCall(callId);
      await axiosClient.put(`/api/v1/staff/waiter-calls/${callId}/resolve`);
      // Socket will update the state automatically
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve call");
      fetchCalls({ silent: true });
    } finally {
      setProcessingCall(null);
    }
  };

  // Get priority styles
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return { bg: '#FEE2E2', color: '#B91C1C', label: 'Urgent' };
      case 'high':
        return { bg: '#FEF3C7', color: '#92400E', label: 'High' };
      case 'medium':
        return { bg: '#DBEAFE', color: '#1D4ED8', label: 'Medium' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', label: 'Low' };
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
    minHeight: '100%',
    padding: isMobile ? '16px' : '32px 48px',
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: isMobile ? 'calc(88px + env(safe-area-inset-bottom, 0px))' : '32px',
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
    fontSize: isMobile ? '24px' : '36px',
    fontWeight: '800',
    color: isDark ? '#ffffff' : '#000000',
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
    minHeight: '44px',
    justifyContent: 'center',
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
              <span role="status" aria-live="polite">{isConnected ? 'Live updates active' : 'Reconnecting… calls will refresh when back online'}</span>
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
                minWidth: '44px',
              }}
              aria-label="Close"
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
          color: isDark ? '#FCA5A5' : '#DC2626'
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
            color: isDark ? '#E2E8F0' : 'var(--text-secondary)'
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
            const assigneeId = call.assignedTo?._id || call.assignedTo;
            const takerName = call.acknowledgedBy || call.assignedTo?.fullname || 'another waiter';
            // A call another waiter is handling can only be closed by them or a supervisor (the server enforces it too).
            const takenByOther = call.status !== 'open' && (assigneeId ? String(assigneeId) !== String(myId) : !!call.acknowledgedBy && call.acknowledgedBy !== getCurrentStaffUser()?.fullname);
            const canResolve = !takenByOther || ['manager', 'owner', 'admin'].includes(myRole);

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
                          {call.tableNumber
                            ? `Table ${call.tableNumber}`
                            : `Room ${call.roomNumber}`}
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
                          {takenByOther ? `Taken by ${takerName}` : call.assignedTo || call.acknowledgedBy ? 'You are on it' : 'Acknowledged'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: isMobile ? '100%' : 'auto',
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
                      disabled={isProcessing || !canResolve}
                      title={canResolve ? undefined : `${takerName} is handling this call`}
                      style={{
                        ...buttonStyle,
                        backgroundColor: '#10B981',
                        color: 'white',
                        opacity: isProcessing || !canResolve ? 0.5 : 1,
                        cursor: canResolve ? 'pointer' : 'not-allowed',
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
