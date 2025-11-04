import React, { useState } from "react";
import "./Membership.css";

const MembershipPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    selectedTier: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const membershipTiers = [
    {
      id: "classic",
      tier: "Classic",
      price: "Rs.23,000/year",
      description: "Perfect for occasional travelers seeking value",
      perks: [
        "10% off all stays",
        "Early check‑in & late check‑out (subject to availability)",
        "Welcome drink on arrival",
        "Complimentary Wi-Fi",
        "Member-only promotions",
        "Priority booking for special events"
      ],
      features: [
        "5% bonus points on all bookings",
        "Flexible cancellation (up to 48 hours)",
        "Digital membership card",
        "Quarterly newsletter",
        "Basic customer support"
      ]
    },
    {
      id: "premium",
      tier: "Premium",
      price: "Rs.60,500/year",
      description: "Ideal for frequent travelers who value premium experiences",
      perks: [
        "20% off all stays",
        "One complimentary room upgrade per year",
        "Airport lounge access (select locations)",
        "Welcome amenity at each stay",
        "Dedicated check-in counter",
        "Late checkout guaranteed until 2 PM"
      ],
      features: [
        "10% bonus points on all bookings",
        "24/7 member support line",
        "Exclusive member events access",
        "Complimentary breakfast for two",
        "Personalized travel recommendations"
      ]
    },
    {
      id: "elite",
      tier: "Elite",
      price: "Rs.180,000/year",
      description: "The ultimate experience for discerning travelers",
      perks: [
        "30% off all stays",
        "Suite upgrade voucher (up to 3 times per year)",
        "Personal concierge service",
        "Luxury airport transfers (select cities)",
        "Access to private hotel facilities",
        "Guaranteed room availability (72-hour notice)"
      ],
      features: [
        "15% bonus points on all bookings",
        "Complimentary spa treatment per stay",
        "Priority restaurant reservations",
        "Quarterly luxury gifts",
        "Exclusive partner benefits",
        "Dedicated account manager"
      ]
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      tier: "Elite Member",
      text: "The personal concierge service has transformed how I travel. Every detail is handled perfectly, from airport transfers to dinner reservations.",
      avatar: "👩"
    },
    {
      name: "Michael Chen",
      tier: "Premium Member",
      text: "The airport lounge access alone is worth the membership. Plus the upgrades make every stay special. I've saved over $2,000 in my first year.",
      avatar: "👨"
    },
    {
      name: "Emma Rodriguez",
      tier: "Classic Member",
      text: "As a business traveler, the discounts and priority booking save me both time and money. The welcome drink is a nice touch after a long flight.",
      avatar: "👩"
    }
  ];

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!isLogin) {
      if (!formData.firstName || !formData.lastName) {
        setError("Please enter your full name");
        return false;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
      if (!formData.selectedTier) {
        setError("Please select a membership tier");
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    // Simulate API call
    setTimeout(() => {
      setSuccess(isLogin ? "You are signed in successfully!" : `Your ${formData.selectedTier} account has been created!`);
      setLoading(false);
      if (!isLogin) {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          selectedTier: "",
        });
      }
    }, 1500);
  };

  const handleTierSelect = (tier) => {
    setSelectedTier(tier);
  };

  const closeTierModal = () => {
    setSelectedTier(null);
  };

  const scrollToSection = (sectionClass) => {
    const element = document.querySelector(sectionClass);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleJoinTier = (tier) => {
    setFormData(prev => ({ ...prev, selectedTier: tier.tier }));
    setSelectedTier(null);
    scrollToSection('.signup-section');
    setIsLogin(false);
  };

  return (
    <div className="membership-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>StayHaven Membership</h1>
          <p>Unlock exclusive experiences, privileges, and luxury stays worldwide. Join our community of discerning travelers today.</p>
          <button 
            className="hero-cta" 
            onClick={() => scrollToSection('.tiers-section')}
          >
            Explore Memberships
          </button>
        </div>
      </div>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <h2>Why Join StayHaven?</h2>
          <p className="section-subtitle">Experience travel redefined with benefits crafted for the modern traveler</p>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="icon">🏝️</div>
              <h3>Curated Escapes</h3>
              <p>Access exclusive properties and personalized stays crafted just for you by our travel experts.</p>
            </div>
            <div className="benefit-card">
              <div className="icon">💎</div>
              <h3>Elite Privileges</h3>
              <p>From suite upgrades to private concierge — your stay is our priority with personalized service.</p>
            </div>
            <div className="benefit-card">
              <div className="icon">🎁</div>
              <h3>Members Only Deals</h3>
              <p>Special rates, early offers and VIP access available only to members throughout the year.</p>
            </div>
            <div className="benefit-card">
              <div className="icon">🌍</div>
              <h3>Global Network</h3>
              <p>Access to over 500 luxury properties worldwide with consistent quality and service standards.</p>
            </div>
            <div className="benefit-card">
              <div className="icon">⚡</div>
              <h3>Priority Access</h3>
              <p>Be the first to book limited availability properties and exclusive experiences before the public.</p>
            </div>
            <div className="benefit-card">
              <div className="icon">💳</div>
              <h3>Flexible Payment</h3>
              <p>Multiple payment options and installment plans to suit your financial preferences.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <h3>50,000+</h3>
              <p>Happy Members</p>
            </div>
            <div className="stat-item">
              <h3>500+</h3>
              <p>Luxury Properties</p>
            </div>
            <div className="stat-item">
              <h3>40+</h3>
              <p>Countries</p>
            </div>
            <div className="stat-item">
              <h3>24/7</h3>
              <p>Member Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Tiers Section */}
      <section className="tiers-section">
        <div className="container">
          <h2>Membership Tiers</h2>
          <p className="section-subtitle">Choose the perfect membership level for your travel needs</p>
          <div className="tiers-grid">
            {membershipTiers.map((tier, idx) => (
              <div 
                key={tier.id}
                className={`tier-card ${tier.tier === "Premium" ? "recommended" : ""}`}
              >
                {tier.tier === "Premium" && <div className="ribbon">Most Popular</div>}
                <h3>{tier.tier}</h3>
                <p className="price">{tier.price}</p>
                <p className="tier-description">{tier.description}</p>
                <ul>
                  {tier.perks.slice(0, 4).map((perk, pIdx) => (
                    <li key={pIdx}>{perk}</li>
                  ))}
                </ul>
                <button 
                  className="join-btn"
                  onClick={() => handleTierSelect(tier)}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <h2>What Our Members Say</h2>
          <p className="section-subtitle">Hear from our valued members about their StayHaven experiences</p>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-content">
                  <p>"{testimonial.text}"</p>
                </div>
                <div className="testimonial-author">
                  <div className="avatar">{testimonial.avatar}</div>
                  <div className="author-info">
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.tier}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>Can I upgrade my membership later?</h3>
              <p>Yes, you can upgrade your membership at any time. The remaining value of your current membership will be applied toward the new tier.</p>
            </div>
            <div className="faq-item">
              <h3>Is there a family plan available?</h3>
              <p>Our Elite membership includes benefits for you and one additional family member. For larger families, please contact our membership services.</p>
            </div>
            <div className="faq-item">
              <h3>How do I cancel my membership?</h3>
              <p>You can cancel your membership at any time through your account dashboard. Refunds are available for unused portions of annual memberships.</p>
            </div>
            <div className="faq-item">
              <h3>Are the discounts applicable to all room types?</h3>
              <p>Yes, your member discounts apply to all standard room types. Some premium suites and special accommodations may have limited availability for discounts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Signup / Login Form Section */}
      <section className="signup-section">
        <div className="container">
          <div className="signup-content">
            <div className="signup-text">
              <h2>Ready to Elevate Your Travel Experience?</h2>
              <p>Join thousands of discerning travelers who have transformed their stays with StayHaven membership.</p>
              <ul className="signup-benefits">
                <li>Instant access to member-only rates</li>
                <li>Flexible booking with premium cancellation policies</li>
                <li>Personalized service from our dedicated team</li>
                <li>Exclusive events and experiences</li>
                <li>24/7 customer support</li>
                <li>No hidden fees or charges</li>
              </ul>
            </div>
            <div className="form-container">
              <div className="form-header">
                <button 
                  onClick={() => setIsLogin(true)} 
                  className={isLogin ? "active" : ""}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setIsLogin(false)} 
                  className={!isLogin ? "active" : ""}
                >
                  Create Account
                </button>
              </div>
              <form onSubmit={handleSubmit} className="signup-form">
                {!isLogin && (
                  <div className="name-fields">
                    <input 
                      type="text" 
                      name="firstName" 
                      placeholder="First Name" 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      required 
                    />
                    <input 
                      type="text" 
                      name="lastName" 
                      placeholder="Last Name" 
                      value={formData.lastName} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                )}
                <input 
                  type="email" 
                  name="email" 
                  placeholder="Email Address" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                />
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="Phone Number" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                />
                <input 
                  type="password" 
                  name="password" 
                  placeholder="Password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                />
                {!isLogin && (
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    placeholder="Confirm Password" 
                    value={formData.confirmPassword} 
                    onChange={handleInputChange} 
                    required 
                  />
                )}
                
                {!isLogin && (
                  <div className="tier-selection">
                    <label>Select Membership Tier</label>
                    <select 
                      name="selectedTier" 
                      value={formData.selectedTier} 
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Choose a tier</option>
                      {membershipTiers.map((tier, idx) => (
                        <option key={tier.id} value={tier.tier}>
                          {tier.tier} - {tier.price}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {error && <div className="message error">{error}</div>}
                {success && <div className="message success">{success}</div>}
                
                <button type="submit" disabled={loading}>
                  {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
                </button>
                
                <div className="form-footer">
                  <p>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                      type="button" 
                      className="text-button"
                      onClick={() => setIsLogin(!isLogin)}
                    >
                      {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Detail Modal */}
      {selectedTier && (
        <div className="modal-overlay" onClick={closeTierModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeTierModal}>×</button>
            <h2>{selectedTier.tier} Membership</h2>
            <p className="modal-price">{selectedTier.price}</p>
            <p className="modal-description">{selectedTier.description}</p>
            
            <div className="modal-details">
              <div className="modal-section">
                <h3>Key Benefits</h3>
                <ul>
                  {selectedTier.perks.map((perk, idx) => (
                    <li key={idx}>{perk}</li>
                  ))}
                </ul>
              </div>
              
              <div className="modal-section">
                <h3>Additional Features</h3>
                <ul>
                  {selectedTier.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="secondary-btn" onClick={closeTierModal}>
                Learn More
              </button>
              <button 
                className="primary-btn" 
                onClick={() => handleJoinTier(selectedTier)}
              >
                Select This Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPage;