import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './AddHotel.css';

const defaultHotelData = {
  name: '',
  category: 'Hotel',
  description: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  starRating: 4,
  minPrice: '',
  maxPrice: '',
  contactPhone: '',
  contactEmail: '',
  contactWebsite: '',
  amenities: [],
  images: [],
};

const amenitiesList = [
  'Free Wi-Fi',
  'Swimming Pool',
  'Gym',
  'Parking',
  'Restaurant',
  'Pet Friendly',
  'Spa',
  'Room Service',
];

const categoryOptions = ['Hotel', 'Resort', 'Villa', 'Apartment', 'Guest House', 'Hostel'];

const AddHotel = ({ isOpen, onClose, onSave, editHotel }) => {
  const [hotelData, setHotelData] = useState(defaultHotelData);
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    if (!editHotel) {
      setHotelData(defaultHotelData);
      setImageUrlInput('');
      return;
    }

    setHotelData({
      name: editHotel.name || '',
      category: editHotel.category || 'Hotel',
      description: editHotel.description || '',
      streetAddress: editHotel.location?.address || '',
      city: editHotel.location?.city || '',
      state: '',
      zipCode: '',
      starRating: editHotel.starRating || 4,
      minPrice: editHotel.priceRange?.min || '',
      maxPrice: editHotel.priceRange?.max || '',
      contactPhone: editHotel.contact?.phone || '',
      contactEmail: editHotel.contact?.email || '',
      contactWebsite: editHotel.contact?.website || '',
      amenities: editHotel.amenities || [],
      images: editHotel.images || [],
    });
    setImageUrlInput('');
  }, [editHotel]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHotelData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityChange = (amenity) => {
    setHotelData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const urls = imageUrlInput
      .split(/\s*,\s*|\n/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    setHotelData((prev) => ({
      ...prev,
      images: [...prev.images, ...urls],
    }));
    setImageUrlInput('');
  };

  const removeImage = (index) => {
    setHotelData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!hotelData.name || !hotelData.category || !hotelData.city || !hotelData.streetAddress) {
      toast.error('Please fill in all required hotel details.');
      return;
    }

    if (!hotelData.description) {
      toast.error('Please provide a hotel description.');
      return;
    }

    if (!hotelData.minPrice || !hotelData.maxPrice) {
      toast.error('Please provide a price range.');
      return;
    }

    if (Number(hotelData.minPrice) > Number(hotelData.maxPrice)) {
      toast.error('Minimum price cannot be higher than maximum price.');
      return;
    }

    if (!hotelData.contactEmail || !hotelData.contactPhone) {
      toast.error('Contact email and phone are required.');
      return;
    }

    if (hotelData.images.length === 0) {
      toast.error('Please add at least one image URL.');
      return;
    }

    const addressParts = [hotelData.streetAddress, hotelData.state, hotelData.zipCode]
      .filter(Boolean)
      .join(', ');

    const payload = {
      name: hotelData.name,
      description: hotelData.description,
      category: hotelData.category,
      location: {
        city: hotelData.city,
        address: addressParts || hotelData.streetAddress,
      },
      starRating: Number(hotelData.starRating),
      priceRange: {
        min: Number(hotelData.minPrice),
        max: Number(hotelData.maxPrice),
      },
      images: hotelData.images,
      amenities: hotelData.amenities,
      contact: {
        phone: hotelData.contactPhone,
        email: hotelData.contactEmail,
        website: hotelData.contactWebsite || undefined,
      },
    };

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editHotel ? 'Edit Hotel' : 'Add Hotel'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Basic Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Hotel Name</label>
                <input
                  type="text"
                  name="name"
                  value={hotelData.name}
                  onChange={handleInputChange}
                  placeholder="The Grand Coastal Resort"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={hotelData.category}
                  onChange={handleInputChange}
                  required
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Star Rating</label>
                <select
                  name="starRating"
                  value={hotelData.starRating}
                  onChange={handleInputChange}
                  required
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} Star</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Min Price</label>
                <input
                  type="number"
                  name="minPrice"
                  value={hotelData.minPrice}
                  onChange={handleInputChange}
                  placeholder="120"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Price</label>
                <input
                  type="number"
                  name="maxPrice"
                  value={hotelData.maxPrice}
                  onChange={handleInputChange}
                  placeholder="250"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Address</h3>
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                name="streetAddress"
                value={hotelData.streetAddress}
                onChange={handleInputChange}
                placeholder="123 Ocean Drive"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={hotelData.city}
                  onChange={handleInputChange}
                  placeholder="Sunnyvale"
                  required
                />
              </div>
              <div className="form-group">
                <label>State / Province</label>
                <input
                  type="text"
                  name="state"
                  value={hotelData.state}
                  onChange={handleInputChange}
                  placeholder="California"
                />
              </div>
              <div className="form-group">
                <label>ZIP / Postal Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={hotelData.zipCode}
                  onChange={handleInputChange}
                  placeholder="90210"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Contact</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={hotelData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="+1 555 123 4567"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={hotelData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="hotel@stayhaven.com"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="contactWebsite"
                value={hotelData.contactWebsite}
                onChange={handleInputChange}
                placeholder="https://hotel.com"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Amenities</h3>
            <div className="amenities-grid">
              {amenitiesList.map((amenity) => (
                <label key={amenity} className="amenity-checkbox">
                  <input
                    type="checkbox"
                    checked={hotelData.amenities.includes(amenity)}
                    onChange={() => handleAmenityChange(amenity)}
                  />
                  <span className="checkmark"></span>
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Description</h3>
            <div className="form-group">
              <textarea
                name="description"
                value={hotelData.description}
                onChange={handleInputChange}
                placeholder="A stunning seaside hotel with breathtaking ocean views and world-class amenities."
                rows="4"
                className="description-textarea"
              />
            </div>
          </div>

          <div className="section-divider"></div>

          <div className="form-section">
            <h3>Image URLs</h3>
            {hotelData.images.length > 0 && (
              <div className="image-preview-grid">
                {hotelData.images.map((url, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={url} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="image-url-input">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Paste image URLs separated by commas"
              />
              <button type="button" className="add-image-btn" onClick={addImageUrl}>
                Add
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save Hotel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHotel;