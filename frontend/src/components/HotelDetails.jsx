import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // const [activeTab, setActiveTab] = useState('Overview');
  // const [checkIn, setCheckIn] = useState('');
  // const [checkOut, setCheckOut] = useState('');
  // const [guests, setGuests] = useState('2 Adults, 1 Child');
  // const [isFavorite, setIsFavorite] = useState(false);

  // Sample hotel data - in production, this would come from an API
  const hotel = {
    id: 1,
    name: 'Sunset Valley Resort',
    address: '123 Serenity Lane, Meadowville, California',
    rating: 4.5,
    reviews: 1284,
    price: 249,
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop'
    ],
    description: 'Nestled in the heart of Meadowville, Sunset Valley Resort offers a tranquil escape with breathtaking views and world-class amenities. Whether you\'re here for a romantic getaway, a family vacation, or a corporate retreat, our resort provides the perfect blend of luxury, comfort, and nature. Enjoy our pristine pools, gourmet dining, and rejuvenating spa services.',
    amenities: [
      { name: 'Free Wi-Fi', icon: '📶' },
      { name: 'Swimming Pool', icon: '🏊' },
      { name: 'Gym', icon: '💪' },
      { name: 'Restaurant', icon: '🍴' },
      { name: 'Free Parking', icon: '🅿️' },
      { name: 'Spa', icon: '🧖' },
      { name: 'Room Service', icon: '🛎️' },
      { name: 'Pet Friendly', icon: '🐾' }
    ],
    location: {
      lat: 37.7749,
      lng: -122.4194
    }
  };

  const calculateTotal = () => {
    const nights = 3; // Calculate based on check-in/out dates
    const subtotal = hotel.price * nights;
    const taxes = 92;
    return subtotal + taxes;
  };

  const handleBookNow = () => {
    navigate(`/hotel/${id}/rooms`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 ml-8" style={{marginLeft: "1rem", marginTop: "4.5rem"}}>
        <div className="flex flex-wrap gap-2 mb-4">
          <a className="text-gray-500 text-sm font-medium leading-normal" href="#">USA</a>
          <span className="text-gray-500 text-sm font-medium leading-normal">/</span>
          <a className="text-gray-500 text-sm font-medium leading-normal" href="#">California</a>
          <span className="text-gray-500 text-sm font-medium leading-normal">/</span>
          <span className="text-gray-900 text-sm font-medium leading-normal">Sunset Valley Resort</span>
        </div>

        <div className="@container w-full h-[500px] grid grid-cols-4 grid-rows-2 gap-2 mb-8">
          <div className="col-span-4 @[640px]:col-span-2 row-span-2 rounded-xl overflow-hidden">
            <div className="w-full h-full bg-cover bg-center" data-alt="Main view of the Sunset Valley Resort" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAZzmhWqcDHQHEyCtWk2xxdchhHhBiZn7i_3pW9l9y5QCqqm_pCIgXRycGs8FruyFyustk_LPggbJVf2tUjyRFLvonhV9IqriwVKUV_VJ-enlkI9OCyYf3XpIk4JhCHu9bj0eM_GZpsE3-q217IgiYqEpTkOIBLXx56lIWuiMD0qWcKi4cT5zPqSOFNK940CogmHKBHxAHFKE3qYjBmcO2tzTFkpa1KkokJVt9DuaPPFB0L-si8U_IoHFVmGDHy2tJKTsWEcnzb6A")' }}></div>
          </div>
          <div className="col-span-2 @[640px]:col-span-1 rounded-xl overflow-hidden hidden @[640px]:block">
            <div className="w-full h-full bg-cover bg-center" data-alt="Hotel room interior" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBNQJafy7sx2SfYgzcg3W4kfLIuAEOZyv1fJVHgOW27jRmFVlqhO9OZz09TWQEiuGIDqiuNfw7Q8YCb-suyqVc8smYAvOG07SFs_PqoPYUWydY6VGVNUIFXmn4enKb0NWDdfDpgRPrkh_5FiUJLUcOrNXwQUy3T-fnOkuCa2X4-zcrzTqT_WUyhWvK1Q5nhGZfNMSieH5DmzGa-FtCJ0ng25-_wqA1xndpbGDHvuIk8jJg6bxeLcKVNRJO2EHj1XB4JqBSaS5U15Q")' }}></div>
          </div>
          <div className="col-span-2 @[640px]:col-span-1 rounded-xl overflow-hidden hidden @[640px]:block">
            <div className="w-full h-full bg-cover bg-center" data-alt="Hotel swimming pool area" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDKQkx3T4SOnedUZvbGRpHVmGzQDYzicZQJh3dOCfb-wwbvXkF_1dWdGiyMKqMRKADQ-tQMwzUe8d26ijzZuCzvFfpE7Ms4Ej1vX_2al9qxeJubuS-jwo0eqZeacPDsYVeHioGp1MUPOY_2TmakaW_R8JCG-2go5KcW-k2D6hvJ07V2_2KvolnmvAHt3BUyutKU49tu2sZOvRcxJm1EbNMxJrPi4VI1avRjzRh6trIMgUyq_4CsZqg0-P4AYTBNDFA5WPNzYMK_vA")' }}></div>
          </div>
          <div className="col-span-2 @[640px]:col-span-1 rounded-xl overflow-hidden hidden @[640px]:block">
            <div className="w-full h-full bg-cover bg-center" data-alt="Hotel restaurant dining area" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB-eYV5p7qBA7ANRkdt2JKdKxVKHh7HpaodCAe0-c3z0hZYGthXCSsGBwhCjAy3VBFyJTT1_wRxoY5dMaPvE6lnP4iOXQBp9D2r8prdEvrJsOe1uFupZp-trzs__cp83-iZQ81lhOHhmkIan6cZl6bBewLvG9Z0QZPjod2502u2uNy-xYANbOj9P7MapaMAJfm8aFCsvSuyAttL9WHfbJduLr6dLEakKlaMH-IFzT0ecu3Inr5zMCu_5bsKgFuV1SQ8QgFwkCoClQ")' }}></div>
          </div>
          <div className="col-span-2 @[640px]:col-span-1 rounded-xl overflow-hidden hidden @[640px]:block">
            <div className="w-full h-full bg-cover bg-center" data-alt="View from a hotel balcony" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAyfLwFG6Y4rYmnphVauiK8DwWEhE8LdxIN5TEwo1XVqPIa0KFSCMFwUVmJwzgUrlwGo-KZSuF0lBdwcmcp8XcNcLpxnW7fPRM60cvjnO_NWoOyloODMhVikMUlVbhwkGGzniLiG0fF9ytIvsnXUGVC09UC81XWApTqNzCCZopQK6Wmz7KBDXLdEsGjdmHRkGlb4hHy3cTDJ-QHLvJhEY7HHx8cw44HU9FpnW0mH-resZ1ln9NRmFkook26fNxJQ9IgA9OaeX_a2Q")' }}></div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-2/3">
            <div className="flex flex-wrap justify-between gap-4 items-start mb-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold leading-tight text-gray-900">Sunset Valley Resort</h1>
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-base font-normal leading-normal">123 Serenity Lane, Meadowville, California</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-2 font-bold text-gray-900">4.5</span>
                  <span className="text-gray-500">(1,284 reviews)</span>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm font-medium">Add to Favorites</span>
              </button>
            </div>

            <div className="border-b border-gray-200 mb-8">
              <nav aria-label="Tabs" className="-mb-px flex space-x-8">
                <a className="whitespace-nowrap py-4 px-0 border-b-2 font-medium text-sm text-teal-600 border-teal-600 hover:text-teal-700" href="#">Overview</a>
                <a className="whitespace-nowrap py-4 px-0 border-b-2 font-medium text-sm text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300" href="#">Rooms</a>
                <a className="whitespace-nowrap py-4 px-0 border-b-2 font-medium text-sm text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300" href="#">Virtual Tour</a>
                <a className="whitespace-nowrap py-4 px-0 border-b-2 font-medium text-sm text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300" href="#">Reviews</a>
              </nav>
            </div>

            <div id="overview-content">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">About Sunset Valley Resort</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">Nestled in the heart of Meadowville, Sunset Valley Resort offers a tranquil escape with breathtaking views and world-class amenities. Whether you're here for a romantic getaway, a family vacation, or a corporate retreat, our resort provides the perfect blend of luxury, comfort, and nature. Enjoy our pristine pools, gourmet dining, and rejuvenating spa services.</p>

              <h3 className="text-xl font-bold mb-4 text-gray-900">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
                {[
                  { icon: '📶', label: 'Free Wi-Fi' },
                  { icon: '🏊', label: 'Swimming Pool' },
                  { icon: '💪', label: 'Gym' },
                  { icon: '🍴', label: 'Restaurant' },
                  { icon: '🅿️', label: 'Free Parking' },
                  { icon: '🧖', label: 'Spa' },
                  { icon: '🛎️', label: 'Room Service' },
                  { icon: '🐾', label: 'Pet Friendly' }
                ].map((a)=> (
                  <div key={a.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50">
                    <span className="text-3xl">{a.icon}</span>
                    <span className="text-sm font-medium text-gray-900 text-center">{a.label}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-bold mb-4 text-gray-900">Location</h3>
              <div className="w-full h-80 rounded-xl overflow-hidden mb-8">
                <div className="w-full h-full bg-cover bg-center" data-location="California" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC-9jtw8YSuTMkW8gSDozdQuDqrl6OtbKr1vrZTa629boVuOYoTpc85l2aA6FH2oIZOlALuqRhhuI0vZu8-MbBOuCjSRNvGuDA6Wh87XDSZHjKcfQfJIAWtJG46MrzznU7kU4XH1tti9CVkxVxnv9G7ot-vwyd-D0j4IWaFjYSKl1x7eBD-CaFS_BtAtJz9EmADqAWwhI6-ObjbHh9TPgGNwHTbjLBy4JFlVZduHZuioVcCvCjFpsPFhmAvzaALYw3R-F9fK30B4g")' }}></div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3">
            <div className="sticky top-32">
              <div className="rounded-2xl shadow-lg p-8 bg-white border border-gray-100">
                <p className="text-3xl font-bold mb-6 text-gray-900">$249 <span className="text-base font-normal text-gray-500">/ night</span></p>
                <div className="border-t border-gray-200 mb-6"></div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="checkin">Check-in</label>
                    <input className="w-full rounded-full border border-gray-300 bg-white text-sm px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent" id="checkin" type="date" placeholder="mm/dd/yyyy" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="checkout">Check-out</label>
                    <input className="w-full rounded-full border border-gray-300 bg-white text-sm px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent" id="checkout" type="date" placeholder="mm/dd/yyyy" />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="guests">Guests</label>
                  <select className="w-full rounded-full border border-gray-300 bg-white text-sm px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer" id="guests" defaultValue="2 Adults, 1 Child">
                    <option>2 Adults, 1 Child</option>
                    <option>2 Adults, 2 Children</option>
                    <option>1 Adult</option>
                    <option>2 Adults</option>
                    <option>3 Adults</option>
                  </select>
                </div>
                
                <div className="border-t border-gray-200 mb-6"></div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">$249 x 3 nights</span>
                    <span className="text-gray-900 font-medium">$747</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxes & fees</span>
                    <span className="text-gray-900 font-medium">$92</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 mb-6"></div>
                
                <div className="flex justify-between mb-8">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">$839</span>
                </div>
                
                <button onClick={() => navigate(`/hotel/${id}/rooms`)} className="w-full flex items-center justify-center rounded-full h-14 px-6 text-white text-base font-bold bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">Select Your Room</h2>
          <div className="space-y-8">
            <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center" data-alt="Deluxe King Room" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC5FhlMmyigesRYz2IamwJ4Asdjt5J1D1kLeyQRESncdDsvdsynVr5S0RRdQD5CvsXN9bpv4oTa2mqlC7ATpVeL2pCremJwIxBLIfSni_XeyW9Tw3ySwYQoSAMUc0oaYJcBvoPzCtERNN36vzb5cINygipe-Q2MsM79ED9OHHYO2ex9K249PsXI4Z6CaIFMKWMEFM3BSYQVJ1PoxdLvuA3IhbcLemK4rZ3mI1cCpMpgDexmOPgSESjD0P0QoNB7oGSrWoLm32Q1MA')" }}></div>
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Deluxe King Room</h3>
                  <p className="text-gray-600 text-sm mt-1">35m² • 1 King Bed • Max 2 guests</p>
                  <p className="my-3 text-sm text-gray-700">A spacious room with a king-sized bed, modern amenities, and a view of the gardens.</p>
                  <p className="font-bold text-lg text-teal-600 mb-4">$249 / night</p>
                  <h4 className="font-semibold text-sm mb-2 text-gray-900">Select a specific room:</h4>
                  <div className="grid grid-cols-5 gap-2 max-w-xs">
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">201</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">202</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-teal-50 border border-teal-500 text-xs font-medium text-teal-600 cursor-pointer">203</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-red-50 text-xs font-medium text-red-600 cursor-not-allowed">204</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">205</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center" data-alt="Ocean View Suite" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD73f1f9_vAxpkv58TpN6PN3qIZuEcejvIdLT1NHwN3tsgWMvO5MZLlRf8k7ILs0KnwqC2uQ4AYiol-LiqUsJ7HSpVJ3EhBzCUG0-vux447zeM1Twb5WUqUHeUc9LMUcHYFzcFV7-JP-dSYrLv2wgGDOKbmVpWea3UdtTO5WzbE3bByCsTnqXVQZUQ8iaYhvIGO3R3lvHXW5mzLF-yGcaUMRetFMOBvOZygBTPZAGw9JsL0926JtNRLDIUSmSMqgMyAnFmBK2CyWw')" }}></div>
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Ocean View Suite</h3>
                  <p className="text-gray-600 text-sm mt-1">55m² • 1 King Bed • 1 Sofa Bed • Max 4 guests</p>
                  <p className="my-3 text-sm text-gray-700">Enjoy stunning ocean views from your private balcony in this luxurious suite with a separate living area.</p>
                  <p className="font-bold text-lg text-teal-600 mb-4">$399 / night</p>
                  <h4 className="font-semibold text-sm mb-2 text-gray-900">Select a specific room:</h4>
                  <div className="grid grid-cols-5 gap-2 max-w-xs">
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">301</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-red-50 text-xs font-medium text-red-600 cursor-not-allowed">302</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">303</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-red-50 text-xs font-medium text-red-600 cursor-not-allowed">304</div>
                    <div className="aspect-square flex items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">305</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HotelDetails;
