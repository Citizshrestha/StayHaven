import React, { useState } from "react";
import "./MembershipPage.css";
import Navbar from "./Navbar";

const memberships = [
  {
    id: 1,
    name: "Silver Member",
    price: "Rs 2,999",
    duration: "per year",
    color: "#C0C0C0",
    benefits: [
      "5% discount on all bookings",
      "Free room upgrade (subject to availability)",
      "Priority customer support",
      "Birthday special offer",
      "Exclusive member-only deals",
      "Free WiFi at all partner hotels"
    ],
    featured: false
  },
  {
    id: 2,
    name: "Gold Member",
    price: "Rs 5,999",
    duration: "per year",
    color: "#FFD700",
    benefits: [
      "10% discount on all bookings",
      "Guaranteed room upgrade",
      "24/7 priority customer support",
      "Birthday special offer + anniversary bonus",
      "Exclusive member-only deals",
      "Free WiFi at all partner hotels",
      "Free breakfast on weekends",
      "Complimentary spa treatment (once per year)"
    ],
    featured: true
  },
  {
    id: 3,
    name: "Platinum Member",
    price: "Rs 9,999",
    duration: "per year",
    color: "#E5E4E2",
    benefits: [
      "15% discount on all bookings",
      "Guaranteed suite upgrade",
      "24/7 dedicated concierge service",
      "Birthday special offer + anniversary bonus + quarterly rewards",
      "Exclusive member-only deals",
      "Free WiFi at all partner hotels",
      "Complimentary breakfast daily",
      "Complimentary spa treatment (4 times per year)",
      "Free airport transfers",
      "Priority booking guarantee"
    ],
    featured: false
  }
];

const MembershipPage = () => {
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: ""
  });

  const handleSelectMembership = (membership) => {
    setSelectedMembership(membership);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMembership(null);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      address: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you for choosing ${selectedMembership.name}!\nWe will contact you shortly at ${formData.email}`);
    closeModal();
  };

  return (
    <div className="w-screen min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="membership-page">
        <header className="membership-header">
        <h1>Membership Plans</h1>
        <p>
          Join our membership program and enjoy exclusive benefits, special discounts,
          and premium services at all our partner hotels.
        </p>
      </header>

      <section className="membership-container">
        {memberships.map((membership) => (
          <div 
            key={membership.id} 
            className={`membership-card ${membership.featured ? 'featured' : ''}`}
          >
            {membership.featured && <div className="featured-badge">Most Popular</div>}
            
            <div className="membership-header-card">
              <div 
                className="membership-color-bar"
                style={{ backgroundColor: membership.color }}
              ></div>
              <h2>{membership.name}</h2>
              <div className="membership-price">
                <span className="price">{membership.price}</span>
                <span className="duration">{membership.duration}</span>
              </div>
            </div>

            <div className="membership-benefits">
              <h3>Benefits Include:</h3>
              <ul>
                {membership.benefits.map((benefit, index) => (
                  <li key={index}>
                    <svg className="benefit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <button 
              className={`select-btn ${membership.featured ? 'featured-btn' : ''}`}
              onClick={() => handleSelectMembership(membership)}
            >
              Choose Plan
            </button>
          </div>
        ))}
      </section>

      {/* Membership Modal */}
      {showModal && selectedMembership && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="membership-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>×</button>
            <div className="modal-content">
              <h2>Join {selectedMembership.name}</h2>
              <p className="modal-price">{selectedMembership.price} {selectedMembership.duration}</p>
              
              <form onSubmit={handleSubmit} className="membership-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+977 XXXXXXXXXX"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea 
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your address"
                    rows="3"
                    required 
                  ></textarea>
                </div>

                <div className="benefits-summary">
                  <h4>You'll get:</h4>
                  <ul>
                    {selectedMembership.benefits.slice(0, 3).map((benefit, index) => (
                      <li key={index}>✓ {benefit}</li>
                    ))}
                    {selectedMembership.benefits.length > 3 && (
                      <li>+ {selectedMembership.benefits.length - 3} more benefits</li>
                    )}
                  </ul>
                </div>

                <button type="submit" className="submit-btn">
                  Complete Registration
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
     </div>
   </div>
 );
};

export default MembershipPage;
