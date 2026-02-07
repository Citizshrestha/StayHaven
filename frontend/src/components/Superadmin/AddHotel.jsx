import React, { useState } from 'react';
import './AddHotel.css';

const AddHotel = ({ isOpen, onClose, onSave, editHotel }) => {
  const [hotelData, setHotelData] = useState({
    hotelName: editHotel?.hotelName || '',
    hotelType: editHotel?.hotelType || '',
    streetAddress: editHotel?.streetAddress || '',
    city: editHotel?.city || '',
    state: editHotel?.state || '',
    zipCode: editHotel?.zipCode || '',
    description: editHotel?.description || '',
    amenities: editHotel?.amenities || [],
    images: editHotel?.images || []
  });

  const [dragOver, setDragOver] = useState(false);

  const amenitiesList = [
    'Free Wi-Fi',
    'Swimming Pool',
    'Gym',
    'Parking',
    'Restaurant',
    'Pet Friendly',
    'Spa',
    'Room Service'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHotelData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAmenityChange = (amenity) => {
    setHotelData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setHotelData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setHotelData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const removeImage = (index) => {
    setHotelData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(hotelData);
    onClose();
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
          {/* Basic Info Section */}
          <div className="form-section">
            <h3>Basic Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Hotel Name</label>
                <input
                  type="text"
                  name="hotelName"
                  value={hotelData.hotelName}
                  onChange={handleInputChange}
                  placeholder="The Grand Coastal Resort"
                  required
                />
              </div>
              <div className="form-group">
                <label>Hotel Type</label>
                <input
                  type="text"
                  name="hotelType"
                  value={hotelData.hotelType}
                  onChange={handleInputChange}
                  placeholder="Boutique"
                  required
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
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
                  required
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
                  required
                />
              </div>
            </div>
          </div>

          {/* Amenities Section */}
          <div className="form-section">
            <h3>Amenities</h3>
            <div className="amenities-grid">
              {amenitiesList.map(amenity => (
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

          {/* Description Section */}
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

          {/* Divider */}
          <div className="section-divider"></div>

          {/* Upload Images Section */}
          <div className="form-section">
            <h3>Upload Images</h3>
            
            {/* Image Preview Grid */}
            {hotelData.images.length > 0 && (
              <div className="image-preview-grid">
                {hotelData.images.map((image, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={image.preview} alt={`Preview ${index + 1}`} />
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

            {/* Upload Area */}
            <div 
              className={`upload-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">
                <span className="material-symbols-outlined">cloud_upload</span>
              </div>
              <div className="upload-text">
                <p className="upload-title">Drag & drop files here</p>
                <p className="upload-subtitle">or</p>
              </div>
              <input
                type="file"
                id="hotel-images"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              <label htmlFor="hotel-images" className="browse-btn">
                Browse Files
              </label>
            </div>
          </div>

          {/* Action Buttons */}
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
