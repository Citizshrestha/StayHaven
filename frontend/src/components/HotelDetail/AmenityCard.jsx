import { Wifi, Dumbbell, UtensilsCrossed, CircleParking, Sparkles, PhoneCall, Dog } from 'lucide-react';

const iconMap = {
  'wifi': Wifi,
  'pool': Wifi, // Using Wifi as placeholder since no exact pool icon
  'gym': Dumbbell,
  'restaurant': UtensilsCrossed,
  'parking': CircleParking,
  'spa': Sparkles,
  'room-service': PhoneCall,
  'pet-friendly': Dog
};

const AmenityCard = ({ icon, label }) => {
  const IconComponent = iconMap[icon] || Wifi;
  
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100">
      <IconComponent className="w-8 h-8 text-teal-600" />
      <span className="text-sm font-medium text-gray-900 text-center">{label}</span>
    </div>
  );
};

export default AmenityCard;
