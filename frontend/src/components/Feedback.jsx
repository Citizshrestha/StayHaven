
import React, { useState } from 'react';

import axiosClient from '../axiosClient';

const Feedback = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNo: '',
    email: '',
    address: '',
    feedback: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Send to backend server
      const { data } = await axiosClient.post('/api/feedback', formData);
      
      if (data && data.success) {
        alert(data.message || 'Thank you for your feedback!');
        
        // Reset form
        setFormData({
          fullName: '',
          phoneNo: '',
          email: '',
          address: '',
          feedback: ''
        });
      } else {
        throw new Error(data.message || 'Failed to send feedback');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert(error.message || 'There was an error sending your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline CSS styles
  const styles = {
    page: {
      minHeight: '200vh',
      backgroundColor: '#fff6f6',
      fontFamily: "'Nunito', Tahoma, Geneva, Verdana, sans-serif"
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '30px 20px'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px'
    },
    title: {
      color: '#00A797',
      fontSize: '2.5rem',
      marginBottom: '15px',
      marginTop: '60px',
      fontWeight: '600'
    },
    subtitle: {
      color: '#666',
      fontSize: '1.2rem',
      marginBottom: '10px'
    },
    form: {
      background: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)'
    },
    formGroup: {
      marginBottom: '25px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#333',
      fontSize: '1.1rem'
    },
    input: {
      width: '100%',
      padding: '14px',
      border: '2px solid #e1e8ed',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      fontFamily: 'inherit'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#00A797',
      boxShadow: '0 0 0 3px rgba(0, 167, 151, 0.2)'
    },
    textarea: {
      resize: 'vertical',
      minHeight: '100px',
      width: '100%',
      padding: '14px',
      border: '2px solid #e1e8ed',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      fontFamily: 'inherit'
    },
    submitBtn: {
      backgroundColor: '#00A797',
      color: 'white',
      border: 'none',
      padding: '16px 32px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '1.1rem',
      transition: 'background-color 0.3s ease, transform 0.2s',
      width: '100%',
      marginTop: '10px'
    },
    submitBtnHover: {
      backgroundColor: '#10A394',
      transform: 'translateY(-2px)'
    },
    submitBtnDisabled: {
      backgroundColor: '#95a5a6',
      cursor: 'not-allowed',
      transform: 'none'
    },
    // Media queries as objects
    mobile: {
      container: {
        padding: '20px 15px'
      },
      title: {
        fontSize: '2rem'
      },
      subtitle: {
        fontSize: '1.1rem'
      },
      form: {
        padding: '25px'
      },
      label: {
        fontSize: '1rem'
      },
      input: {
        padding: '12px',
        fontSize: '0.95rem'
      },
      textarea: {
        padding: '12px',
        fontSize: '0.95rem'
      },
      submitBtn: {
        padding: '14px 24px',
        fontSize: '1rem'
      }
    },
    smallMobile: {
      title: {
        fontSize: '1.8rem'
      },
      subtitle: {
        fontSize: '1rem'
      },
      form: {
        padding: '20px 15px'
      },
      formGroup: {
        marginBottom: '20px'
      }
    }
  };

  // Function to handle input focus
  const handleFocus = (e) => {
    e.target.style.outline = 'none';
    e.target.style.borderColor = '#00A797';
    e.target.style.boxShadow = '0 0 0 3px rgba(0, 167, 151, 0.2)';
  };

  // Function to handle input blur
  const handleBlur = (e) => {
    e.target.style.borderColor = '#e1e8ed';
    e.target.style.boxShadow = 'none';
  };

  // Function to handle button hover
  const handleMouseEnter = (e) => {
    if (!isSubmitting) {
      e.target.style.backgroundColor = '#10A394';
      e.target.style.transform = 'translateY(-2px)';
    }
  };

  // Function to handle button leave
  const handleMouseLeave = (e) => {
    if (!isSubmitting) {
      e.target.style.backgroundColor = '#00A797';
      e.target.style.transform = 'translateY(0)';
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>We Value Your Feedback</h1>
          <p style={styles.subtitle}>Your opinion helps us improve our services</p>
        </div>
        
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="fullName" style={styles.label}>Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
              placeholder="Enter your full name"
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="phoneNo" style={styles.label}>Phone Number *</label>
            <input
              type="tel"
              id="phoneNo"
              name="phoneNo"
              value={formData.phoneNo}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
              placeholder="Enter your phone number"
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Enter your email address"
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="address" style={styles.label}>Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              rows="3"
              placeholder="Enter your address"
              style={styles.textarea}
            ></textarea>
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="feedback" style={styles.label}>Your Feedback *</label>
            <textarea
              id="feedback"
              name="feedback"
              value={formData.feedback}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
              rows="5"
              placeholder="Please share your thoughts, suggestions, or concerns..."
              style={styles.textarea}
            ></textarea>
          </div>
          
          <button 
            type="submit" 
            style={{
              ...styles.submitBtn,
              ...(isSubmitting ? styles.submitBtnDisabled : {})
            }}
            disabled={isSubmitting}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
