import React from 'react';

const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: 'navyblue',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        position: 'fixed',
        left: '0',
        bottom: '0',
        width: '100%',
        boxShadow: '0 -2px 5px rgba(0,0,0,0.1)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          flexWrap: 'wrap'
        }}
      >
        <a
          href="/about-us"
          style={{
            color: 'white',
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid white',
            borderRadius: '5px',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.color = 'navyblue';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'white';
          }}
        >
          About Us
        </a>

        <a
          href="/report-problem"
          style={{
            color: 'white',
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid white',
            borderRadius: '5px',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.color = 'navyblue';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'white';
          }}
        >
          Report a Problem
        </a>

        <a
          href="/feedback"
          style={{
            color: 'white',
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid white',
            borderRadius: '5px',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.color = 'navyblue';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'white';
          }}
        >
          Feedback
        </a>

        <a
          href="/contact-us"
          style={{
            color: 'white',
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid white',
            borderRadius: '5px',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.color = 'navyblue';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'white';
          }}
        >
          Contact Us
        </a>
      </div>
    </footer>
  );
};

export default Footer;