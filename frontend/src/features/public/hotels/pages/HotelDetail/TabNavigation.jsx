const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'location', label: 'Location' },
];

const TabNavigation = ({ activeTab, onTabChange }) => {
  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    const section = document.getElementById(`section-${tabId}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-[60px] z-[100] rounded-b-2xl border-b border-[rgba(0,191,166,0.15)] bg-white/95 backdrop-blur-[12px] px-2 md:px-6">
      <nav className="flex items-center gap-1 md:gap-3 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`whitespace-nowrap px-4 md:px-6 py-4 text-sm font-semibold transition-all duration-300 border-b-[3px] ${
              isActive
                ? 'text-[#00BFA6] border-[#00BFA6]'
                : 'text-[#546E7A] border-transparent hover:text-[#00A896]'
            }`}
          >
            {tab.label}
          </button>
        );
        })}
      </nav>
    </div>
  );
};

export default TabNavigation;