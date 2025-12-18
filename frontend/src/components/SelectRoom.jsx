import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

const SelectRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState(null);

  const rooms = [
    {
      id: 1,
      name: 'Deluxe Room',
      description: 'Spacious room with king-size bed, modern amenities, and stunning city views.',
      price: 249,
      size: '35 m²',
      beds: '1 King Bed',
      guests: 2,
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2074&auto=format&fit=crop',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Mini Bar', 'Coffee Maker', 'TV', 'Safe']
    },
    {
      id: 2,
      name: 'Suite Room',
      description: 'Luxurious suite with separate living area, premium furnishings, and panoramic views.',
      price: 349,
      size: '55 m²',
      beds: '1 King Bed + Sofa Bed',
      guests: 4,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Mini Bar', 'Coffee Maker', 'TV', 'Safe', 'Jacuzzi', 'Balcony']
    },
    {
      id: 3,
      name: 'Family Room',
      description: 'Perfect for families with multiple beds, extra space, and family-friendly amenities.',
      price: 299,
      size: '45 m²',
      beds: '2 Queen Beds',
      guests: 4,
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2074&auto=format&fit=crop',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Mini Fridge', 'Coffee Maker', 'TV', 'Safe', 'Extra Space']
    },
    {
      id: 4,
      name: 'Presidential Suite',
      description: 'Ultimate luxury with multiple rooms, premium amenities, and exclusive services.',
      price: 599,
      size: '95 m²',
      beds: '1 King Bed + 2 Single Beds',
      guests: 6,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Full Kitchen', 'Coffee Maker', 'TV', 'Safe', 'Jacuzzi', 'Private Terrace', 'Butler Service']
    }
  ];

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
  };

  const handleContinue = () => {
    if (selectedRoom) {
      navigate(`/hotel/${id}/checkout`, { state: { room: selectedRoom } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/hotel/${id}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Hotel Details
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your Room</h1>
          <p className="text-gray-600">Choose from our available room types</p>
        </div>

        {/* Room Cards */}
        <div className="space-y-6 mb-8">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all ${
                selectedRoom?.id === room.id ? 'ring-2 ring-teal-500' : 'hover:shadow-md'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Image */}
                <div className="md:col-span-1 h-64 md:h-auto">
                  <img
                    src={room.image}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="md:col-span-2 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{room.name}</h3>
                      <p className="text-gray-600 mb-4">{room.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">${room.price}</div>
                      <div className="text-sm text-gray-600">per night</div>
                    </div>
                  </div>

                  {/* Room Info */}
                  <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="text-sm">{room.size}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="text-sm">{room.beds}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-sm">{room.guests} Guests</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Room Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {room.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={() => handleSelectRoom(room)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      selectedRoom?.id === room.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {selectedRoom?.id === room.id ? 'Selected' : 'Select Room'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        {selectedRoom && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Selected Room</div>
                <div className="text-lg font-bold text-gray-900">{selectedRoom.name}</div>
              </div>
              <button
                onClick={handleContinue}
                className="bg-gradient-to-r from-teal-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectRoom;
