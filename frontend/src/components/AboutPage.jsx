import React from "react";
import "./AboutPage.css";

const AboutPage = () => {
  const teamMembers = [
    {
      name: "Sarah Mitchell",
      position: "Founder & CEO",
      image: "👩‍💼",
      bio: "Former luxury hotel executive with 15+ years in hospitality. Founded StayHaven to redefine luxury travel experiences.",
      expertise: "Hospitality Management, Business Strategy"
    },
    {
      name: "David Chen",
      position: "Chief Operations Officer",
      image: "👨‍💼",
      bio: "Operations expert with background in global hotel chains. Ensures seamless experiences across all properties.",
      expertise: "Operations, Quality Assurance"
    },
    {
      name: "Maria Rodriguez",
      position: "Head of Member Experience",
      image: "👩‍💼",
      bio: "Passionate about creating unforgettable moments. Leads our concierge and member services teams.",
      expertise: "Customer Experience, Service Design"
    },
    {
      name: "James Wilson",
      position: "Global Partnerships Director",
      image: "👨‍💼",
      bio: "Builds relationships with luxury properties worldwide. Curates our exclusive portfolio of destinations.",
      expertise: "Partnerships, Business Development"
    }
  ];

  const milestones = [
    {
      year: "2018",
      title: "StayHaven Founded",
      description: "Started with 10 luxury properties across Europe"
    },
    {
      year: "2019",
      title: "First 1,000 Members",
      description: "Reached our first major membership milestone"
    },
    {
      year: "2020",
      title: "Global Expansion",
      description: "Expanded to Asia and North American markets"
    },
    {
      year: "2022",
      title: "50,000 Members",
      description: "Celebrated serving 50,000 discerning travelers"
    },
    {
      year: "2023",
      title: "500+ Properties",
      description: "Grew our portfolio to 500+ luxury properties worldwide"
    }
  ];

  const values = [
    {
      icon: "💎",
      title: "Excellence",
      description: "We never compromise on quality. Every detail matters in creating exceptional experiences."
    },
    {
      icon: "🤝",
      title: "Trust",
      description: "Building lasting relationships through transparency and reliability is our foundation."
    },
    {
      icon: "🌍",
      title: "Global Mindset",
      description: "We understand and respect diverse cultures while maintaining consistent luxury standards."
    },
    {
      icon: "✨",
      title: "Innovation",
      description: "Continuously evolving to anticipate and exceed our members' expectations."
    }
  ];

  return (
    <div className="about-page">
      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-content">
            <div className="mission-text">
              <h2>Our Mission</h2>
              <p className="mission-statement">
                To transform how the world experiences luxury travel by creating exclusive, personalized journeys that exceed expectations and create lasting memories.
              </p>
              <div className="mission-stats">
                <div className="mission-stat">
                  <h3>500+</h3>
                  <p>Luxury Properties</p>
                </div>
                <div className="mission-stat">
                  <h3>40+</h3>
                  <p>Countries</p>
                </div>
                <div className="mission-stat">
                  <h3>50,000+</h3>
                  <p>Happy Members</p>
                </div>
              </div>
            </div>
            <div className="mission-image">
              <div className="image-placeholder">🏨</div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="container">
          <h2>Our Journey</h2>
          <p className="section-subtitle">From a vision to a global luxury travel community</p>
          
          <div className="timeline">
            {milestones.map((milestone, index) => (
              <div key={index} className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`}>
                <div className="timeline-content">
                  <div className="timeline-year">{milestone.year}</div>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <h2>Our Values</h2>
          <p className="section-subtitle">The principles that guide every decision we make</p>
          
          <div className="values-grid">
            {values.map((value, index) => (
              <div key={index} className="value-card">
                <div className="value-icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <h2>Leadership Team</h2>
          <p className="section-subtitle">The passionate individuals driving StayHaven's vision forward</p>
          
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div key={index} className="team-card">
                <div className="member-avatar">{member.image}</div>
                <h3>{member.name}</h3>
                <p className="member-position">{member.position}</p>
                <p className="member-bio">{member.bio}</p>
                <div className="member-expertise">
                  <strong>Expertise:</strong> {member.expertise}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="commitment-section">
        <div className="container">
          <div className="commitment-content">
            <div className="commitment-text">
              <h2>Our Commitment to Excellence</h2>
              <p>
                At StayHaven, we believe luxury is in the details. Our commitment extends beyond beautiful properties to encompass every aspect of your journey. From the moment you consider a trip to long after you return home, we're dedicated to making every experience exceptional.
              </p>
              <div className="commitment-points">
                <div className="commitment-point">
                  <div className="point-icon">⭐</div>
                  <div className="point-text">
                    <h4>Rigorous Property Selection</h4>
                    <p>Every property undergoes thorough evaluation to ensure it meets our luxury standards</p>
                  </div>
                </div>
                <div className="commitment-point">
                  <div className="point-icon">🛡️</div>
                  <div className="point-text">
                    <h4>24/7 Member Support</h4>
                    <p>Round-the-clock assistance for any needs during your travels</p>
                  </div>
                </div>
                <div className="commitment-point">
                  <div className="point-icon">🔍</div>
                  <div className="point-text">
                    <h4>Continuous Improvement</h4>
                    <p>Regular feedback collection and service enhancements based on member insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Experience StayHaven?</h2>
            <p>Join our community of discerning travelers and discover a new world of luxury experiences.</p>
            <div className="cta-buttons">
              <button 
                className="primary-cta"
                onClick={() => window.location.href = '/membership'}
              >
                Explore Memberships
              </button>
              <button 
                className="secondary-cta"
                onClick={() => window.location.href = '/contact'}
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
