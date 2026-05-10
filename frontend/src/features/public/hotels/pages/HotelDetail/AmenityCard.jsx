import { Wifi, Dumbbell, UtensilsCrossed, CircleParking, Sparkles, PhoneCall, Dog, Waves, ShieldCheck } from 'lucide-react';

const iconMap = {
  'wifi': Wifi,
  'pool': Waves,
  'gym': Dumbbell,
  'restaurant': UtensilsCrossed,
  'parking': CircleParking,
  'spa': Sparkles,
  'room-service': PhoneCall,
  'pet-friendly': Dog
};

const amenityTheme = {
  wifi: {
    accent: '#2563EB', // blue
    bgFrom: '#EFF6FF',
    bgTo: '#E0F2FE',
  },
  pool: {
    accent: '#06B6D4', // cyan
    bgFrom: '#ECFEFF',
    bgTo: '#E0F2FE',
  },
  gym: {
    accent: '#F97316', // orange
    bgFrom: '#FFF7ED',
    bgTo: '#FFEDD5',
  },
  restaurant: {
    accent: '#EF4444', // red
    bgFrom: '#FEF2F2',
    bgTo: '#FFE4E6',
  },
  parking: {
    accent: '#64748B', // slate
    bgFrom: '#F8FAFC',
    bgTo: '#F1F5F9',
  },
  spa: {
    accent: '#A855F7', // purple
    bgFrom: '#FAF5FF',
    bgTo: '#F3E8FF',
  },
  'room-service': {
    accent: '#22C55E', // green
    bgFrom: '#F0FDF4',
    bgTo: '#DCFCE7',
  },
  'pet-friendly': {
    accent: '#EC4899', // pink
    bgFrom: '#FDF2F8',
    bgTo: '#FCE7F3',
  },
};

const AmenityCard = ({ icon, label }) => {
  const IconComponent = iconMap[icon] || Wifi;
  const theme = amenityTheme[icon] || { accent: '#00BFA6', bgFrom: '#F0FDFB', bgTo: '#E0F7FA' };
  
  return (
    <div
      className="group flex flex-col items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-[14px] transition-all duration-300 border hover:-translate-y-0.75 hover:shadow-[0_6px_16px_var(--accentShadow)] hover:border-[var(--accent)] min-h-[100px] sm:min-h-[110px]"
      style={{
        background: '#F8FAFB',
        borderColor: `${theme.accent}22`,
        '--accent': theme.accent,
        '--accentShadow': `${theme.accent}1F`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${theme.bgFrom}, ${theme.bgTo})`;
        e.currentTarget.style.borderColor = theme.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#F8FAFB';
        e.currentTarget.style.borderColor = `${theme.accent}22`;
      }}
    >
      <div className="relative flex items-center justify-center">
        <IconComponent 
          className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-110" 
          style={{ color: theme.accent }}
        />
        <ShieldCheck 
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute -right-1.5 sm:-right-2 -top-0.5 sm:-top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
          style={{ color: theme.accent }}
        />
      </div>
      <span className="text-xs sm:text-sm font-medium text-[#263238] text-center leading-tight px-1">{label}</span>
    </div>
  );
};

export default AmenityCard;