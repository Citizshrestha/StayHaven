import React, { useState } from 'react';
import { User, Mail, Phone, FileText, MessageSquare, Send, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import axiosClient from '../../../../core/api/client';
import { usePageMeta } from '../../hotels/lib/pageMeta';
import './Contactus.css';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

const ContactUs = () => {
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  usePageMeta({
    title: 'Contact us',
    description: 'Contact the StayHaven team for help with a booking, a stay or listing your hotel.',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const next = {};
    if (!formData.name.trim()) next.name = 'Name is required';
    if (!formData.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) next.email = 'Email is invalid';
    if (formData.phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a phone number we can reach you on';
    if (!formData.subject.trim()) next.subject = 'Subject is required';
    if (!formData.message.trim()) next.message = 'Message is required';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateForm();
    setErrors(found);
    if (Object.keys(found).length) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      // Same public (rate limited) inbox the feedback form writes to. Nothing is faked client-side.
      await axiosClient.post('/api/v1/feedback', {
        fullName: formData.name.trim(),
        phoneNo: formData.phone.trim(),
        email: formData.email.trim(),
        feedback: `Subject: ${formData.subject.trim()}\n\n${formData.message.trim()}`,
      });
      setIsSubmitted(true);
      setFormData(EMPTY);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Your message could not be sent. Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (id, label, Icon, props) => (
    <div className="input-group">
      <label htmlFor={id}>
        <Icon className="label-icon" size={16} aria-hidden="true" /> {label}
      </label>
      {props.rows ? (
        <textarea id={id} name={id} value={formData[id]} onChange={handleChange} className={errors[id] ? 'error' : ''} aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-err` : undefined} {...props} />
      ) : (
        <input id={id} name={id} value={formData[id]} onChange={handleChange} className={errors[id] ? 'error' : ''} aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-err` : undefined} {...props} />
      )}
      {errors[id] && <span id={`${id}-err`} className="error-message">{errors[id]}</span>}
    </div>
  );

  return (
    <div>
      <div className="contact-us-container">
        <div className="contact-wrapper">
          <div className="contact-header">
            <div className="header-content">
              <div className="logo-section">
                <h1>Contact StayHaven</h1>
              </div>
              <p className="tagline">Questions about a booking, a stay or listing your hotel? We are here to help.</p>
              <div className="header-divider"></div>
            </div>
          </div>

          <div className="contact-content">
            <div className="form-section">
              <div className="form-container">
                <div className="form-header">
                  <h2>Get in touch with us</h2>
                  <p>Send us a message and we will reply by email or phone.</p>
                </div>

                {isSubmitted && (
                  <div className="success-message" role="status">
                    <CheckCircle2 className="success-icon" size={24} aria-hidden="true" />
                    <div>
                      <h3>Message sent</h3>
                      <p>Thank you for contacting us. We will get back to you soon.</p>
                    </div>
                  </div>
                )}

                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  {submitError && <div role="alert" className="error-message" style={{ marginBottom: 16 }}>{submitError}</div>}
                  {field('name', 'Your name *', User, { type: 'text', autoComplete: 'name', maxLength: 100, placeholder: 'Enter your full name' })}
                  {field('email', 'Your email *', Mail, { type: 'email', autoComplete: 'email', inputMode: 'email', maxLength: 100, placeholder: 'your.email@example.com' })}
                  {field('phone', 'Phone number *', Phone, { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: 20, placeholder: '+977 98XXXXXXXX' })}
                  {field('subject', 'Subject *', FileText, { type: 'text', maxLength: 150, placeholder: 'What is this regarding?' })}
                  {field('message', 'Message *', MessageSquare, { rows: 6, maxLength: 2000, placeholder: 'Type your message here...' })}

                  <button type="submit" className={`submit-btn ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="spinner"></div>
                        Sending message...
                      </>
                    ) : (
                      <>
                        <Send className="btn-icon" size={18} aria-hidden="true" />
                        Send message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="info-section">
              <div className="info-container">
                <div className="info-header">
                  <h3>Contact information</h3>
                  <p>You can also reach us through any of these channels</p>
                </div>

                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="method-icon"><Phone size={20} aria-hidden="true" /></div>
                    <div className="method-content">
                      <h4>Phone</h4>
                      <a href="tel:+97701-2136567">+977 01-2136 567</a>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="method-icon"><Mail size={20} aria-hidden="true" /></div>
                    <div className="method-content">
                      <h4>Email</h4>
                      <a href="mailto:support@stayhaven.com.np">support@stayhaven.com.np</a>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="method-icon"><MapPin size={20} aria-hidden="true" /></div>
                    <div className="method-content">
                      <h4>Office</h4>
                      <p>Thamel, Kathmandu, Nepal</p>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="method-icon"><Clock size={20} aria-hidden="true" /></div>
                    <div className="method-content">
                      <h4>Support hours</h4>
                      <p>Sunday - Friday: 9AM - 6PM (Nepal time)</p>
                    </div>
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
