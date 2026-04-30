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
      className="group flex flex-col items-center gap-2.5 p-5 rounded-[14px] transition-all duration-300 border hover:-translate-y-0.75 hover:shadow-[0_6px_16px_var(--accentShadow)] hover:border-(--accent) hover:bg-[linear-gradient(135deg,var(--accentBgFrom),var(--accentBgTo))]"
      style={{
        background: '#F8FAFB',
        borderColor: 'var(--accentBorder)',
        '--accent': theme.accent,
        '--accentBorder': `${theme.accent}22`,
        '--accentShadow': `${theme.accent}1F`,
        '--accentBgFrom': theme.bgFrom,
        '--accentBgTo': theme.bgTo,
      }}
    >
      <div className="relative">
        <IconComponent className="w-8 h-8 text-(--accent) transition-transform duration-300 group-hover:scale-110" />
        <ShieldCheck className="w-3.5 h-3.5 text-(--accent) absolute -right-2 -top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <span className="text-sm font-medium text-[#263238] text-center">{label}</span>
    </div>
  );
};

export default AmenityCard;