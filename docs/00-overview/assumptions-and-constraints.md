# Assumptions and Constraints

> Key assumptions made during development and known constraints of the system

---

## 🎯 Project Assumptions

### Business Assumptions

#### 1. **Market Demand**

**Assumption**: Hotels are actively seeking all-in-one management solutions

- Hotels are dissatisfied with current fragmented systems
- Willingness to pay $99-499/month for integrated platform
- 80% of target hotels have basic internet connectivity

**Risk**: Market may not be ready or saturated with competitors

---

#### 2. **User Adoption**

**Assumption**: Staff will adapt to digital systems

- Hotel staff can learn basic app usage within 1 day
- Younger staff members will help train older colleagues
- Mobile-responsive web interface is sufficient (no native apps needed initially)

**Risk**: Technology adoption may be slower in traditional hotels

---

#### 3. **Competitive Landscape**

**Assumption**: We can compete with established players

- Existing PMS systems are too expensive or complex
- OTAs don't provide management features
- Our unique value proposition (all-in-one + real-time) is compelling

**Risk**: Established players may copy features or price us out

---

### Technical Assumptions

#### 4. **Infrastructure**

**Assumption**: Cloud services are reliable and scalable

- MongoDB Atlas provides 99.9% uptime
- Cloudinary handles image storage efficiently
- Socket.io scales to 1,000+ concurrent connections per server

**Risk**: Service outages or unexpected scaling costs

---

#### 5. **Internet Connectivity**

**Assumption**: Hotels have stable internet (3G or better)

- Minimum 1 Mbps connection speed
- Occasional disconnections are acceptable
- WebSocket reconnection handles network issues

**Risk**: Poor connectivity in rural/remote areas

---

#### 6. **Browser Compatibility**

**Assumption**: Modern browsers are widely used

- Chrome, Firefox, Safari, Edge (last 2 versions)
- JavaScript enabled
- Cookies enabled for authentication

**Risk**: Older browsers in legacy systems

---

#### 7. **Data Volume**

**Assumption**: Data growth is manageable

- Average hotel: 50 orders/day = 18K orders/year
- 1,000 hotels: 18M orders/year
- MongoDB handles this volume efficiently with indexing

**Risk**: Unexpected data growth or query performance issues

---

### User Behavior Assumptions

#### 8. **Staff Workflow**

**Assumption**: Staff will check dashboards regularly

- Waiters check dashboard every 5-10 minutes
- Kitchen checks constantly during service hours
- Managers review daily reports

**Risk**: Staff may ignore notifications or forget to update status

---

#### 9. **Guest Usage**

**Assumption**: Guests prefer digital ordering

- 70% of guests will use in-app ordering
- 30% will still call reception (legacy preference)
- QR codes in rooms drive app adoption

**Risk**: Older guests may resist digital ordering

---

#### 10. **Hotel Data Entry**

**Assumption**: Hotels will maintain accurate data

- Room status updated promptly
- Menu items kept current
- Booking information is accurate

**Risk**: Stale data leads to poor guest experience

---

## 🚧 Known Constraints

### Technical Constraints

#### 1. **Technology Stack Lock-In**

**Constraint**: MERN stack chosen, changing later is costly

**Why**:

- Team expertise in JavaScript ecosystem
- Rapid development with React and Node.js
- MongoDB flexibility for evolving schemas

**Impact**:

- ✅ Faster initial development
- ❌ Difficult to migrate to other stacks later
- ❌ Performance limitations of JavaScript

---

#### 2. **Real-Time Scalability**

**Constraint**: Socket.io connections are resource-intensive

**Why**:

- WebSocket connections require persistent TCP
- Each connection consumes server memory
- Scaling requires sticky sessions or Redis adapter

**Impact**:

- ✅ Real-time updates are instant
- ❌ Server costs increase with concurrent users
- ❌ Complex horizontal scaling

**Mitigation**:

- Room-based broadcasting reduces message overhead
- Implement connection pooling
- Add Redis adapter for multi-server deployment

---

#### 3. **No Native Mobile Apps**

**Constraint**: Web-only platform (no iOS/Android apps)

**Why**:

- Development time and cost
- Team expertise (web > mobile)
- Faster iterations with web

**Impact**:

- ✅ Single codebase to maintain
- ✅ Instant updates (no app store approval)
- ❌ Limited offline capabilities
- ❌ No push notifications (web only)
- ❌ Slower than native apps

**Mitigation**:

- Responsive design for mobile web
- Progressive Web App (PWA) in future
- Web push notifications (limited support)

---

#### 4. **No Payment Gateway Integration**

**Constraint**: No online payment processing in MVP

**Why**:

- PCI-DSS compliance complexity
- Integration time (Stripe, PayPal)
- Focus on core booking and management features

**Impact**:

- ❌ Hotels must process payments offline
- ❌ Less convenient for guests
- ❌ No automated invoicing

**Future**: Add Stripe/PayPal in Phase 2

---

#### 5. **Single-Region Database**

**Constraint**: MongoDB deployed in single region (Asia)

**Why**:

- Cost savings
- Initial target market is South Asia
- MongoDB Atlas cross-region replication is expensive

**Impact**:

- ✅ Low latency for target market
- ❌ Higher latency for users outside Asia
- ❌ Single point of failure (region outage)

**Mitigation**:

- Use CDN for static assets (Cloudinary)
- Add read replicas when expanding globally

---

#### 6. **Email-Only Notifications**

**Constraint**: No SMS notifications

**Why**:

- SMS costs (Twilio: $0.01-0.05 per message)
- Email is free (Nodemailer)
- Most hotels have email

**Impact**:

- ❌ Slower notification delivery
- ❌ Some users don't check email regularly
- ✅ Cost-effective

**Mitigation**:

- Add SMS in premium tier
- Use Socket.io for in-app notifications

---

### Security Constraints

#### 7. **No Two-Factor Authentication (2FA)**

**Constraint**: Only password + OTP for critical actions

**Why**:

- Complexity of SMS 2FA
- Additional cost (SMS provider)
- OTP via email provides basic security

**Impact**:

- ❌ Vulnerable to phishing attacks
- ❌ Less secure than 2FA
- ✅ Simpler user experience

**Future**: Add 2FA in Phase 2

---

#### 8. **JWT Storage in LocalStorage**

**Constraint**: Access tokens stored in localStorage (not httpOnly cookies)

**Why**:

- Easier to access from JavaScript
- Flexibility for API calls
- Refresh tokens ARE httpOnly cookies (secure)

**Impact**:

- ⚠️ Vulnerable to XSS attacks
- ✅ Easier token management
- ✅ Works with CORS

**Mitigation**:

- Short-lived access tokens (1 hour)
- Sanitize all user inputs
- Implement CSP headers

---

### Business Constraints

#### 9. **No Offline Mode**

**Constraint**: App requires internet connection

**Why**:

- Real-time updates require connectivity
- Offline sync complexity
- Data consistency challenges

**Impact**:

- ❌ Unusable during internet outages
- ❌ Rural hotels may struggle
- ✅ Always displays latest data

**Mitigation**:

- Graceful degradation (show cached data)
- Queue failed requests for retry
- Clear error messages

---

#### 10. **English Language Only**

**Constraint**: No multi-language support (i18n)

**Why**:

- Development complexity
- Translation costs
- Initial market (Nepal/India) uses English

**Impact**:

- ❌ Excludes non-English speakers
- ✅ Faster development
- ✅ Simpler testing

**Future**: Add Nepali, Hindi in Phase 2

---

#### 11. **No Custom Branding**

**Constraint**: All hotels use standard StayHaven branding

**Why**:

- White-label complexity
- Design consistency
- Faster onboarding

**Impact**:

- ❌ Hotels want own branding
- ✅ Consistent user experience
- ✅ Brand recognition

**Future**: White-label in Enterprise tier

---

### Legal and Compliance Constraints

#### 12. **No GDPR Compliance**

**Constraint**: Not fully compliant with EU data protection

**Why**:

- Target market is Asia (not EU)
- Compliance complexity
- Legal consultation costs

**Impact**:

- ❌ Can't operate in EU
- ✅ Faster to market
- ✅ Lower legal costs

**Future**: Add GDPR compliance for global expansion

---

#### 13. **No PCI-DSS Compliance**

**Constraint**: Cannot store credit card data

**Why**:

- No payment gateway integration
- PCI-DSS certification cost
- Security audit requirements

**Impact**:

- ❌ Can't process payments directly
- ✅ No liability for card data breaches
- ✅ Lower security costs

**Future**: Use Stripe (PCI-compliant) in Phase 2

---

### Resource Constraints

#### 14. **Small Development Team**

**Constraint**: 1-2 developers, no QA team

**Why**:

- Bootstrap/MVP project
- Budget limitations
- Learning project

**Impact**:

- ❌ Slower development
- ❌ Limited testing coverage
- ❌ Technical debt accumulation
- ✅ Full-stack learning experience

**Mitigation**:

- Focus on MVP features only
- Manual testing + Postman
- Prioritize critical bugs

---

#### 15. **No Dedicated DevOps**

**Constraint**: Developers handle deployment

**Why**:

- Small team
- Simple deployment (MongoDB Atlas, Render/Heroku)

**Impact**:

- ❌ No CI/CD pipeline
- ❌ Manual deployments
- ❌ Limited monitoring
- ✅ Cost savings

**Future**: Add CI/CD with GitHub Actions

---

## 📊 Risk Assessment

| Constraint | Severity | Likelihood | Mitigation Priority |
|------------|----------|------------|---------------------|
| Socket.io scalability | High | Medium | 🔴 High |
| No payment gateway | Medium | High | 🟡 Medium |
| No mobile apps | Medium | Medium | 🟡 Medium |
| No 2FA | High | Low | 🟡 Medium |
| Single region DB | High | Low | 🟢 Low |
| English only | Low | High | 🟢 Low |
| Small team | Medium | High | 🟡 Medium |

---

## 🎯 Decision Log

### Key Architectural Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **MERN Stack** | Team expertise, rapid development | Lock-in, JS limitations |
| **Socket.io** | Real-time requirement | Scaling complexity |
| **JWT Auth** | Stateless, scalable | Token management |
| **MongoDB** | Flexible schema, multi-tenancy | No transactions (limited) |
| **No TypeScript** | Faster initial development | Less type safety |
| **Context API** | Built-in, simpler | Less powerful than Redux |
| **Vite** | Faster build times | Newer, less mature |

---

## 🔗 Related Documents

- [System Scope](./system-scope.md) - What's included and excluded
- [Non-Functional Requirements](../01-requirements/non-functional-requirements.md)
- [Architecture Decisions Record](../02-architecture/architecture-decisions-record.md)

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete
