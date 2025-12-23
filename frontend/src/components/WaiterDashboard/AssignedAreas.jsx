import { useState, useEffect, useMemo } from "react";
import { MapPin, Users, Clock, ChefHat, CheckCircle, AlertCircle, X } from "lucide-react";

const AssignedAreas = ({ orders = [], onFilterByArea, onClose }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Calculate assigned areas from actual orders
  const assignedAreas = useMemo(() => {
    const areaMap = new Map();

    orders.forEach(order => {
      const areaName = order.table || 'Unknown';
      const isRoom = areaName.toLowerCase().includes('room');

      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, {
          id: areaName,
          name: areaName,
          type: isRoom ? 'room' : 'table',
          orders: [],
          totalOrders: 0,
          pendingOrders: 0,
          preparingOrders: 0,
          readyOrders: 0,
          deliveredOrders: 0,
        });
      }

      const area = areaMap.get(areaName);
      area.orders.push(order);
      area.totalOrders++;

      switch (order.status) {
        case 'new':
        case 'pending':
          area.pendingOrders++;
          break;
        case 'preparing':
          area.preparingOrders++;
          break;
        case 'ready':
          area.readyOrders++;
          break;
        case 'delivered':
          area.deliveredOrders++;
          break;
        default:
          break;
      }
    });

    return Array.from(areaMap.values()).sort((a, b) => {
      // Sort by active orders first (pending + preparing + ready)
      const aActive = a.pendingOrders + a.preparingOrders + a.readyOrders;
      const bActive = b.pendingOrders + b.preparingOrders + b.readyOrders;
      return bActive - aActive;
    });
  }, [orders]);

  const getStatusColor = (area) => {
    if (area.readyOrders > 0) return '#10B981'; // Green - ready to serve
    if (area.preparingOrders > 0) return '#F59E0B'; // Yellow - preparing
    if (area.pendingOrders > 0) return '#3B82F6'; // Blue - new orders
    return '#9CA3AF'; // Gray - completed or no orders
  };

  const getStatusText = (area) => {
    if (area.readyOrders > 0) return `${area.readyOrders} ready`;
    if (area.preparingOrders > 0) return `${area.preparingOrders} preparing`;
    if (area.pendingOrders > 0) return `${area.pendingOrders} new`;
    return 'No active orders';
  };

  const handleAreaClick = (areaName) => {
    if (onFilterByArea) {
      onFilterByArea(areaName);
    }
  };

  // Styles
  const containerStyle = {
    backgroundColor: 'var(--bg-secondary)',
    minHeight: '100vh',
    padding: isMobile ? '16px' : '32px 48px',
    fontFamily: "'Nunito', sans-serif",
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  };

  const titleStyle = {
    fontSize: isMobile ? '28px' : '36px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: 'var(--text-tertiary)',
    marginTop: '8px',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  };

  const cardStyle = {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: 'var(--shadow-sm)',
  };

  const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  };

  const areaNameStyle = {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const badgeStyle = (color) => ({
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    backgroundColor: `${color}20`,
    color: color,
  });

  const statsRowStyle = {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
  };

  const statItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-tertiary)',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Assigned Areas</h1>
          <p style={subtitleStyle}>
            {assignedAreas.length} {assignedAreas.length === 1 ? 'area' : 'areas'} with orders
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-tertiary)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} color="var(--text-secondary)" />
          </button>
        )}
      </div>

      {assignedAreas.length === 0 ? (
        <div style={emptyStateStyle}>
          <MapPin size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            No assigned areas yet
          </h3>
          <p>Orders will appear here as they come in</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {assignedAreas.map((area) => {
            const statusColor = getStatusColor(area);
            const activeOrders = area.pendingOrders + area.preparingOrders + area.readyOrders;

            return (
              <div
                key={area.id}
                style={cardStyle}
                onClick={() => handleAreaClick(area.name)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div style={cardHeaderStyle}>
                  <div style={areaNameStyle}>
                    {area.type === 'room' ? (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#DBEAFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        🛏️
                      </div>
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#D1FAE5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        🍽️
                      </div>
                    )}
                    <span>{area.name}</span>
                  </div>
                  <span style={badgeStyle(statusColor)}>
                    {getStatusText(area)}
                  </span>
                </div>

                <div style={statsRowStyle}>
                  {area.pendingOrders > 0 && (
                    <div style={statItemStyle}>
                      <AlertCircle size={14} color="#3B82F6" />
                      <span>{area.pendingOrders} new</span>
                    </div>
                  )}
                  {area.preparingOrders > 0 && (
                    <div style={statItemStyle}>
                      <ChefHat size={14} color="#F59E0B" />
                      <span>{area.preparingOrders} preparing</span>
                    </div>
                  )}
                  {area.readyOrders > 0 && (
                    <div style={statItemStyle}>
                      <CheckCircle size={14} color="#10B981" />
                      <span>{area.readyOrders} ready</span>
                    </div>
                  )}
                  {activeOrders === 0 && (
                    <div style={statItemStyle}>
                      <Clock size={14} />
                      <span>{area.deliveredOrders} delivered</span>
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    Total orders: {area.totalOrders}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--color-primary)',
                    fontWeight: '600',
                  }}>
                    View Orders →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignedAreas;
