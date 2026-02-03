import React, { useState } from 'react';
import Navbar from '../../../common/Navbar';
import './Contactus.css';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Form submitted:', formData);
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setIsSubmitting(false);
      
      // Reset success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div>
      <Navbar/>
    
    <div className="contact-us-container">
      {/* Animated Background */}
      <div className="contact-background">
        <div className="floating-leaf">🍃</div>
        <div className="floating-leaf">🌿</div>
        <div className="floating-leaf">🍂</div>
        <div className="floating-vegetable">🥦</div>
        <div className="floating-vegetable">🥕</div>
        <div className="floating-vegetable">🍅</div>
      </div>

      <div className="contact-wrapper">
        {/* Header Section */}
        <div className="contact-header">
          <div className="header-content">
            <div className="logo-section">
              <span className="logo-icon">🛒</span>
              <h1>StayHeaven</h1>
            </div>
            <p className="tagline">Trade Policies from Self Agency</p>
            <div className="header-divider"></div>
          </div>
        </div>

        <div className="contact-content">
          {/* Left Side - Contact Form */}
          <div className="form-section">
            <div className="form-container">
              <div className="form-header">
                <h2>Get in Touch with Us</h2>
                <p>Fill out the form below and we'll get back to you shortly</p>
              </div>

              {isSubmitted && (
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  <div>
                    <h3>Message Sent Successfully!</h3>
                    <p>Thank you for contacting us. We'll get back to you within 24 hours.</p>
                  </div>
                </div>
              )}

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="name">
                    <span className="label-icon">👤</span>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="email">
                    <span className="label-icon">📧</span>
                    Your Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="subject">
                    <span className="label-icon">📝</span>
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={errors.subject ? 'error' : ''}
                    placeholder="What is this regarding?"
                  />
                  {errors.subject && <span className="error-message">{errors.subject}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="message">
                    <span className="label-icon">💬</span>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className={errors.message ? 'error' : ''}
                    placeholder="Type your message here..."
                    rows="6"
                  />
                  {errors.message && <span className="error-message">{errors.message}</span>}
                </div>

                <button 
                  type="submit" 
                  className={`submit-btn ${isSubmitting ? 'submitting' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner"></div>
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🚀</span>
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Side - Contact Information */}
          <div className="info-section">
            <div className="info-container">
              <div className="info-header">
                <h3>Contact Information</h3>
                <p>Feel free to reach out to us through any of these channels</p>
              </div>

              <div className="contact-methods">
                <div className="contact-method">
                  <div className="method-icon">
                    <span>📞</span>
                  </div>
                  <div className="method-content">
                    <h4>Phone Number</h4>
                    <a href="tel:+977 234567890">+977 234 567 890</a>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="method-icon">
                    <span>📧</span>
                  </div>
                  <div className="method-content">
                    <h4>Email Address</h4>
                    <a href="mailto:information@greencart.com">information@greencart.com</a>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="method-icon">
                    <span>📍</span>
                  </div>
                  <div className="method-content">
                    <h4>Office Address</h4>
                    <p>123 Green Road, Bharatpur, Chitwan</p>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="method-icon">
                    <span>🕒</span>
                  </div>
                  <div className="method-content">
                    <h4>Business Hours</h4>
                    <p>Monday - Friday: 9AM - 5PM</p>
                  </div>
                </div>
              </div>

              

              <div className="social-section">
                <h4>Follow Us</h4>
                <div className="social-links">
                  <a href="#" className="social-link">📘</a>
                  <a href="#" className="social-link">📷</a>
                  <a href="#" className="social-link">🐦</a>
                  <a href="#" className="social-link">💼</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ContactUs;