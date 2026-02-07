const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = ['Overview', 'Rooms', 'Virtual Tour', 'Reviews'];

  const getButtonStyle = (tab) => {
    const isActive = activeTab === tab.toLowerCase().replace(' ', '');
    return {
      whiteSpace: 'nowrap',
      padding: '16px 4px',
      borderBottom: `2px solid ${isActive ? '#0d9488' : 'transparent'}`,
      color: isActive ? '#0d9488' : '#6b7280',
      fontWeight: 600,
      fontSize: 14,
      transition: 'all 150ms ease',
      cursor: 'pointer',
    };
  };

  return (
    <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
      <nav style={{ display: 'flex', gap: 32, marginBottom: -2 }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab.toLowerCase().replace(' ', ''))}
            style={getButtonStyle(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;
