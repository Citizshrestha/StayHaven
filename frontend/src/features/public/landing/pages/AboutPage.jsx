import React from "react";
import { useContent } from "../../../../hooks/useContent";
import { getAboutContent } from "../../../../core/api/services/content.service";
import "./AboutPage.css";

const AboutPage = () => {
  const { data: aboutDataArray } = useContent('about', getAboutContent);
  const about = aboutDataArray?.[0] || null;

  const defaultTeamMembers = [
    {
      name: "Rajesh Shrestha",
      position: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces",
      bio: "Hospitality veteran with 15+ years experience in Nepal's tourism industry. Founded StayHaven to showcase Nepal's finest accommodations.",
      expertise: "Hospitality Management, Business Strategy"
    },
    {
      name: "Anita Gurung",
      position: "Chief Operations Officer",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces",
      bio: "Operations expert ensuring seamless experiences across all partner properties. Passionate about quality service delivery.",
      expertise: "Operations, Quality Assurance"
    },
    {
      name: "Priya Thapa",
      position: "Head of Guest Experience",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces",
      bio: "Dedicated to creating memorable stays for every guest. Leads our customer service and support teams.",
      expertise: "Customer Experience, Service Design"
    },
    {
      name: "Bikram Rai",
      position: "Partnerships Director",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces",
      bio: "Builds relationships with hotels and resorts across Nepal. Curates our exclusive portfolio of properties.",
      expertise: "Partnerships, Business Development"
    }
  ];

  const teamMembers = about?.teamMembers?.length > 0
    ? about.teamMembers.map(m => ({
        name: m.name,
        position: m.role || 'Team Member',
        image: m.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
        bio: m.bio || '',
        expertise: m.role || ''
      }))
    : defaultTeamMembers;

  const statsList = about?.stats?.length > 0
    ? about.stats
    : [
        { label: "Luxury Properties", value: "500+" },
        { label: "Countries", value: "40+" },
        { label: "Happy Members", value: "50,000+" }
      ];

  const missionText = about?.mission || "To showcase Nepal's finest hospitality by connecting travelers with exceptional hotels and resorts, while providing seamless booking experiences and personalized service that honors Nepali warmth and tradition.";

  const milestones = [
    {
      year: "2020",
      title: "StayHaven Founded",
      description: "Started with 20 premium hotels in Kathmandu Valley"
    },
    {
      year: "2021",
      title: "Expansion to Pokhara",
      description: "Extended services to lakeside resorts and mountain lodges"
    },
    {
      year: "2022",
      title: "100+ Partner Hotels",
      description: "Reached milestone of 100 verified partner properties"
    },
    {
      year: "2023",
      title: "Nationwide Coverage",
      description: "Expanded to Chitwan, Lumbini, and major tourist destinations"
    },
    {
      year: "2024",
      title: "500+ Properties",
      description: "Now serving travelers across 40+ destinations in Nepal"
    }
  ];

  const values = [
    {
      icon: "💎",
      title: "Quality First",
      description: "We partner only with verified hotels that meet our high standards for cleanliness, service, and guest satisfaction."
    },
    {
      icon: "🤝",
      title: "Trust & Transparency",
      description: "Honest pricing, genuine reviews, and reliable service form the foundation of our relationships with guests."
    },
    {
      icon: "�️",
      title: "Celebrating Nepal",
      description: "We showcase the best of Nepali hospitality while honoring local culture, traditions, and sustainable tourism."
    },
    {
      icon: "✨",
      title: "Guest Delight",
      description: "Every booking is an opportunity to exceed expectations and create memorable experiences in Nepal."
    }
  ];

  return (
    <>
      <div className="about-page">
        {/* Hero Section */}
        <section className="about-hero-section">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1>Redefining Hospitality in Nepal</h1>
            <p>Where tradition meets modern luxury, creating unforgettable experiences across the Himalayas</p>
            <div className="hero-features">
              <div className="hero-feature">
                <span className="feature-icon">🏔️</span>
                <span>Authentic Experiences</span>
              </div>
              <div className="hero-feature">
                <span className="feature-icon">⭐</span>
                <span>Premium Service</span>
              </div>
              <div className="hero-feature">
                <span className="feature-icon">🌏</span>
                <span>Local Expertise</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mission-section">
          <div className="container">
            <div className="mission-content">
              <div className="mission-text">
                <h2>Our Mission</h2>
                <p className="mission-statement">
                  {missionText}
                </p>
                <div className="mission-stats">
                  {statsList.map((stat, sIdx) => (
                    <div key={sIdx} className="mission-stat">
                      <h3>{stat.value}</h3>
                      <p>{stat.label}</p>
                    </div>
                  ))}
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
            <p className="section-subtitle">Building Nepal's premier hotel booking platform, one partnership at a time</p>

            {about?.companyStory && (
              <p className="story-paragraph text-center max-w-3xl mx-auto mb-12 text-gray-600 leading-relaxed text-lg">
                {about.companyStory}
              </p>
            )}

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
            <p className="section-subtitle">The principles that drive us to deliver exceptional experiences</p>

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
            <p className="section-subtitle">Meet the passionate team behind StayHaven's success</p>

            <div className="team-grid">
              {teamMembers.map((member, index) => (
                <div key={index} className="team-card">
                  <div className="member-avatar">
                    <img src={member.image} alt={member.name} />
                  </div>
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
                <h2>Our Commitment to You</h2>
                <p>
                  At StayHaven, we're dedicated to making your Nepal travel experience seamless and memorable.
                  From discovering the perfect hotel to enjoying exceptional service during your stay,
                  we're with you every step of the journey.
                </p>
                <div className="commitment-points">
                  <div className="commitment-point">
                    <div className="point-icon">⭐</div>
                    <div className="point-text">
                      <h4>Verified Properties Only</h4>
                      <p>Every hotel is personally inspected and verified to ensure quality, safety, and authentic guest experiences</p>
                    </div>
                  </div>
                  <div className="commitment-point">
                    <div className="point-icon">🛡️</div>
                    <div className="point-text">
                      <h4>24/7 Customer Support</h4>
                      <p>Our dedicated team is always available to assist with bookings, changes, or any questions during your stay</p>
                    </div>
                  </div>
                  <div className="commitment-point">
                    <div className="point-icon">💰</div>
                    <div className="point-text">
                      <h4>Best Price Guarantee</h4>
                      <p>We work directly with hotels to offer competitive rates and exclusive deals you won't find elsewhere</p>
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
              <h2>Start Your Nepal Adventure</h2>
              <p>Discover exceptional hotels and create unforgettable memories in the heart of the Himalayas.</p>
              <div className="cta-buttons">
                <button
                  className="primary-cta"
                  onClick={() => window.location.href = '/hotels'}
                >
                  Explore Hotels
                </button>
                <button
                  className="secondary-cta"
                  onClick={() => window.location.href = '/contactus'}
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AboutPage;
