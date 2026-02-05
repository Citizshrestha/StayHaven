# Non-Functional Requirements

> Quality attributes, performance criteria, and system constraints for StayHaven

---

## 📋 Overview

Non-functional requirements (NFRs) define **how well** the system performs its functions, rather than what it does. These requirements are critical for user satisfaction and system success.

---

## ⚡ NFR-01: Performance Requirements

### NFR-01.1: Response Time

**Requirement**: System must provide fast response times for all user interactions

| Operation | Target | Measurement |
|-----------|--------|-------------|
| **API Endpoints** | < 200ms (95th percentile) | Server response time |
| **Page Load** | < 2 seconds | First contentful paint |
| **Search Results** | < 1 second | Query execution time |
| **Real-time Updates** | < 100ms | Socket.io latency |
| **Image Load** | < 1 second | Cloudinary CDN delivery |
| **Database Queries** | < 50ms | Indexed query execution |

**Rationale**: Fast response times improve user experience and reduce bounce rates

**Testing**: Use Postman for API testing, Lighthouse for frontend performance

---

### NFR-01.2: Throughput

**Requirement**: System must handle expected load without degradation

| Metric | Target | Peak Load |
|--------|--------|-----------|
| **Concurrent Users** | 1,000 users | 2,000 users |
| **API Requests** | 10,000 req/min | 20,000 req/min |
| **WebSocket Connections** | 500 concurrent | 1,000 concurrent |
| **Orders per Hour** | 5,000 orders | 10,000 orders |
| **Database Writes** | 1,000 writes/min | 2,000 writes/min |

**Rationale**: Handle growth without infrastructure changes

**Testing**: Load testing with k6 or Artillery (recommended)

---

### NFR-01.3: Resource Utilization

**Requirement**: Efficient use of server resources

| Resource | Target | Limit |
|----------|--------|-------|
| **Server CPU** | < 60% average | < 80% peak |
| **Server Memory** | < 70% average | < 85% peak |
| **Database Storage** | Efficient indexing | Monitor growth |
| **Bandwidth** | Optimize images | < 100GB/month |
| **Socket Connections** | Connection pooling | 1,000 max per server |

**Rationale**: Cost optimization and system stability

**Monitoring**: Implement New Relic or DataDog (recommended)

---

## 🔒 NFR-02: Security Requirements

### NFR-02.1: Authentication Security

**Requirement**: Robust authentication mechanisms

**Measures**:

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT tokens with expiration (1-hour access, 7-day refresh)
- ✅ HttpOnly cookies for refresh tokens
- ✅ OTP verification for critical actions
- ✅ Google OAuth 2.0 integration
- ⚠️ **Missing**: Two-factor authentication (2FA)
- ⚠️ **Missing**: Password complexity requirements

**Security Level**: ⭐⭐⭐☆☆ (3/5 - Good, room for improvement)

---

### NFR-02.2: Authorization Security

**Requirement**: Proper access control

**Measures**:

- ✅ Role-based access control (RBAC)
- ✅ JWT verification on protected routes
- ✅ Company-level data isolation
- ✅ Property-level access restrictions
- ✅ Backend validation (not just frontend)
- ⚠️ **Missing**: Permission-based granular control
- ⚠️ **Missing**: IP whitelisting for admin

**Security Level**: ⭐⭐⭐⭐☆ (4/5 - Very Good)

---

### NFR-02.3: Data Security

**Requirement**: Protect sensitive data

**Measures**:

- ✅ Passwords never stored in plain text
- ✅ CORS configuration prevents unauthorized origins
- ✅ MongoDB connection string in environment variables
- ✅ JWT secrets in environment variables
- ⚠️ **Missing**: Data encryption at rest
- ⚠️ **Missing**: PCI-DSS compliance (no payment data stored)
- ❌ **Missing**: HTTPS enforcement in production

**Security Level**: ⭐⭐⭐☆☆ (3/5 - Adequate for MVP)

---

### NFR-02.4: Vulnerability Protection

**Requirement**: Protect against common attacks

**Measures**:

- ✅ XSS protection via React's built-in escaping
- ✅ CORS configuration
- ✅ SameSite cookie attribute
- ⚠️ **Missing**: CSRF token implementation
- ⚠️ **Missing**: Rate limiting (DDoS protection)
- ⚠️ **Missing**: Input sanitization library
- ⚠️ **Missing**: SQL/NoSQL injection prevention (rely on Mongoose)

**Threats Mitigated**: XSS, CORS attacks, cookie theft

**Threats Not Fully Mitigated**: CSRF, DDoS, brute force

**Security Level**: ⭐⭐⭐☆☆ (3/5 - Basic protection)

---

## 🔄 NFR-03: Reliability and Availability

### NFR-03.1: System Uptime

**Requirement**: System must be available for users

| Metric | Target | Downtime Allowed |
|--------|--------|------------------|
| **Availability** | 99.5% | ~3.65 hours/month |
| **Planned Maintenance** | Off-peak hours | < 2 hours/month |
| **Incident Response** | < 1 hour | Critical issues |
| **Recovery Time** | < 30 minutes | From failures |

**Rationale**: Hotels operate 24/7, downtime affects operations

**Dependencies**:

- MongoDB Atlas: 99.9% SLA
- Cloudinary: 99.9% SLA
- Hosting (Render/Vercel): 99.9% SLA

**Reality Check**: Currently ~99% (managed services dependency)

---

### NFR-03.2: Error Handling

**Requirement**: Graceful degradation and error recovery

**Implementation**:

- ✅ Global error middleware in Express
- ✅ Async error handler wrapper
- ✅ Malformed JSON protection
- ✅ Consistent error response format
- ✅ WebSocket reconnection (5 attempts)
- ⚠️ **Missing**: Error boundary components in React
- ⚠️ **Missing**: Structured logging (Winston/Pino)

**User Experience**: Errors show friendly messages, not stack traces

---

### NFR-03.3: Data Integrity

**Requirement**: Data must be accurate and consistent

**Measures**:

- ✅ Mongoose schema validation
- ✅ Unique constraints (email, username, room numbers)
- ✅ Foreign key references (ObjectId)
- ✅ Pre-save hooks for data transformation
- ✅ Timestamps (createdAt, updatedAt)
- ⚠️ **Limited**: No transactional support (MongoDB limitation)
- ⚠️ **Missing**: Database backup automation

**Consistency**: Eventually consistent (real-time Socket.io updates)

---

## 📈 NFR-04: Scalability Requirements

### NFR-04.1: Horizontal Scalability

**Requirement**: System can scale by adding more servers

**Current Architecture**:

- ⚠️ **Limited**: Socket.io requires sticky sessions
- ⚠️ **Limited**: No shared session store (Redis recommended)
- ✅ **Good**: Stateless JWT authentication
- ✅ **Good**: MongoDB Atlas auto-scaling
- ✅ **Good**: CDN for images (Cloudinary)

**Scaling Strategy**:

1. Add Redis for Socket.io adapter
2. Deploy multiple backend instances with load balancer
3. Use sticky sessions or Redis pub/sub
4. Monitor and scale MongoDB

**Target**: Support 10,000 hotels by Year 3

---

### NFR-04.2: Data Scalability

**Requirement**: Handle growing data volume

**Projections**:

- 1,000 hotels × 50 orders/day = 50K orders/day
- 18M orders/year
- Average document size: 2KB
- Total: ~36GB/year (manageable)

**Measures**:

- ✅ MongoDB indexing on frequently queried fields
- ✅ Compound indexes for complex queries
- ✅ Pagination for large result sets
- ⚠️ **Recommended**: Archive old orders after 2 years
- ⚠️ **Recommended**: Implement caching (Redis)

**Database Limit**: MongoDB Atlas supports 100GB+ easily

---

### NFR-04.3: Feature Scalability

**Requirement**: Easy to add new features

**Architecture Support**:

- ✅ Modular controller/route structure
- ✅ Middleware pattern for cross-cutting concerns
- ✅ Schema flexibility (MongoDB)
- ✅ Component-based frontend (React)
- ⚠️ **Limited**: No service layer (logic in controllers)
- ⚠️ **Limited**: No API versioning strategy

**Maintainability**: ⭐⭐⭐☆☆ (3/5 - Good structure, needs improvement)

---

## 🎨 NFR-05: Usability Requirements

### NFR-05.1: User Interface

**Requirement**: Intuitive and user-friendly interface

**Standards**:

- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Consistent navigation across pages
- ✅ Clear call-to-action buttons
- ✅ Loading states for async operations
- ✅ Form validation with helpful errors
- ⚠️ **Missing**: Accessibility (WCAG 2.1 compliance)
- ⚠️ **Missing**: Dark mode support

**Design System**: Tailwind CSS for consistency

**Target**: 4.5/5 user satisfaction score

---

### NFR-05.2: Learnability

**Requirement**: Users can learn the system quickly

**Targets**:

- **Guests**: Book hotel within 5 minutes
- **Staff**: Take first order within 10 minutes of training
- **Owners**: List hotel within 30 minutes
- **Training Time**: < 1 hour for staff, < 2 hours for owners

**Support**:

- ⚠️ **Missing**: In-app tutorials
- ⚠️ **Missing**: Help documentation
- ⚠️ **Missing**: Video guides

**Onboarding**: Currently minimal, needs improvement

---

### NFR-05.3: Accessibility

**Requirement**: Usable by people with disabilities

**Current State**:

- ⚠️ **Not Implemented**: Screen reader support
- ⚠️ **Not Implemented**: Keyboard navigation
- ⚠️ **Not Implemented**: ARIA labels
- ⚠️ **Not Implemented**: Color contrast standards

**Priority**: 🟡 Medium (should add in Phase 2)

**Standard**: WCAG 2.1 Level AA (recommended)

---

## 🔧 NFR-06: Maintainability Requirements

### NFR-06.1: Code Quality

**Requirement**: Clean, maintainable codebase

**Measures**:

- ✅ Consistent file structure (MVC pattern)
- ✅ ESLint configuration
- ✅ Meaningful variable/function names
- ✅ ES6+ modern JavaScript
- ⚠️ **Missing**: Code comments and JSDoc
- ⚠️ **Missing**: TypeScript for type safety
- ⚠️ **Missing**: Unit test coverage

**Code Complexity**: Low to moderate (maintainable)

**Technical Debt**: Manageable, document as needed

---

### NFR-06.2: Debugging and Logging

**Requirement**: Easy to diagnose issues

**Current Implementation**:

- ✅ Console.log statements in key areas
- ✅ Error stack traces in development
- ✅ MongoDB query logging
- ⚠️ **Missing**: Structured logging library (Winston/Pino)
- ⚠️ **Missing**: Log levels (debug, info, warn, error)
- ⚠️ **Missing**: Centralized log aggregation

**Monitoring**: ⭐⭐☆☆☆ (2/5 - Basic, needs improvement)

---

### NFR-06.3: Documentation

**Requirement**: Comprehensive documentation

**Current State**:

- ✅ README files in backend
- ✅ API endpoint comments in code
- ✅ This comprehensive docs/ folder
- ⚠️ **Missing**: API documentation (Swagger/OpenAPI)
- ⚠️ **Missing**: Architecture diagrams
- ⚠️ **Missing**: Deployment documentation

**Coverage**: ⭐⭐⭐⭐☆ (4/5 - Good foundation)

---

## 🌐 NFR-07: Compatibility Requirements

### NFR-07.1: Browser Compatibility

**Requirement**: Support modern browsers

**Supported Browsers**:

- ✅ Chrome/Edge (last 2 versions)
- ✅ Firefox (last 2 versions)
- ✅ Safari (last 2 versions)
- ❌ Internet Explorer (not supported)

**JavaScript**: ES6+ (transpiled by Vite)

**Testing**: Manual testing on major browsers

---

### NFR-07.2: Device Compatibility

**Requirement**: Work on various devices

**Supported Devices**:

- ✅ Desktop (1920×1080 and above)
- ✅ Laptop (1366×768 and above)
- ✅ Tablet (768×1024)
- ✅ Mobile (375×667 minimum)

**Responsive Design**: Tailwind CSS breakpoints

**Testing**: Chrome DevTools device emulation

---

### NFR-07.3: Operating System

**Requirement**: Cross-platform support

**Supported OS**:

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, Debian)
- ✅ iOS 13+ (Safari)
- ✅ Android 9+ (Chrome)

**Server**: Linux (Ubuntu 20.04+) recommended

---

## 🚀 NFR-08: Deployment Requirements

### NFR-08.1: Environment Configuration

**Requirement**: Easy deployment to different environments

**Environments**:

- **Development**: Local (localhost:5173, localhost:3000)
- **Staging**: Pre-production testing (recommended)
- **Production**: Live system

**Configuration**:

- ✅ Environment variables (.env files)
- ✅ Separate MongoDB databases per environment
- ⚠️ **Missing**: CI/CD pipeline
- ⚠️ **Missing**: Automated testing before deployment

---

### NFR-08.2: Deployment Process

**Requirement**: Reliable deployment with minimal downtime

**Current Process**:

- ⚠️ Manual deployment
- ⚠️ No automated testing
- ⚠️ No rollback strategy

**Recommended**:

- GitHub Actions for CI/CD
- Automated tests on push
- Blue-green deployment
- Rollback capability

**Deployment Time**: < 5 minutes (target)

---

### NFR-08.3: Backup and Recovery

**Requirement**: Data protection and recovery

**Current State**:

- ✅ MongoDB Atlas automatic backups (daily)
- ⚠️ **Missing**: Manual backup procedures documented
- ⚠️ **Missing**: Recovery testing
- ⚠️ **Missing**: Disaster recovery plan

**RPO (Recovery Point Objective)**: 24 hours
**RTO (Recovery Time Objective)**: 2 hours

---

## 📊 NFR-09: Monitoring and Observability

### NFR-09.1: Application Monitoring

**Requirement**: Visibility into system health

**Current State**:

- ⚠️ **Missing**: Application performance monitoring
- ⚠️ **Missing**: Error tracking (Sentry recommended)
- ⚠️ **Missing**: Uptime monitoring

**Recommended Tools**:

- New Relic / DataDog for APM
- Sentry for error tracking
- Pingdom / UptimeRobot for uptime

---

### NFR-09.2: Business Metrics

**Requirement**: Track key business metrics

**Metrics to Monitor**:

- Daily active users (DAU)
- Booking conversion rate
- Order volume per hotel
- Revenue per property
- User churn rate

**Current**: Basic analytics in code, no dashboard

**Recommended**: Google Analytics, Mixpanel, or custom dashboard

---

## 🧪 NFR-10: Testability Requirements

### NFR-10.1: Testing Coverage

**Requirement**: Comprehensive test coverage

**Current State**:

- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ✅ Manual testing only

**Target Coverage**:

- Unit tests: 70%+ (backend)
- Integration tests: Key user flows
- E2E tests: Critical paths (booking, ordering)

**Recommended Tools**:

- Jest for unit tests
- Supertest for API integration tests
- Cypress for E2E tests

---

### NFR-10.2: Test Environment

**Requirement**: Isolated test environment

**Requirements**:

- Separate test database
- Mock Socket.io connections
- Mock email service
- Seed data for testing

**Current**: Not implemented

---

## 📝 NFR-11: Compliance Requirements

### NFR-11.1: Data Protection

**Requirement**: Comply with data protection regulations

**Current State**:

- ⚠️ Basic privacy practices
- ⚠️ No GDPR compliance (not targeting EU)
- ⚠️ No CCPA compliance (not targeting California)
- ⚠️ No data retention policy documented

**User Rights**: Not implemented (data export, deletion)

---

### NFR-11.2: PCI DSS

**Requirement**: Payment card security

**Current State**:

- ✅ **Not Applicable**: No payment processing in current version
- ✅ No credit card data stored

**Future**: Use PCI-compliant gateway (Stripe, PayPal)

---

## 🎯 NFR Summary Matrix

| Requirement | Priority | Status | Score |
|-------------|----------|--------|-------|
| **Performance** | 🔴 High | 🟡 Good | ⭐⭐⭐⭐☆ 4/5 |
| **Security** | 🔴 High | 🟡 Adequate | ⭐⭐⭐☆☆ 3/5 |
| **Reliability** | 🔴 High | 🟡 Good | ⭐⭐⭐⭐☆ 4/5 |
| **Scalability** | 🟡 Medium | 🟡 Moderate | ⭐⭐⭐☆☆ 3/5 |
| **Usability** | 🔴 High | 🟡 Good | ⭐⭐⭐⭐☆ 4/5 |
| **Maintainability** | 🟡 Medium | 🟡 Moderate | ⭐⭐⭐☆☆ 3/5 |
| **Compatibility** | 🟡 Medium | ✅ Good | ⭐⭐⭐⭐☆ 4/5 |
| **Deployment** | 🟡 Medium | 🟠 Basic | ⭐⭐☆☆☆ 2/5 |
| **Monitoring** | 🟡 Medium | 🟠 Minimal | ⭐⭐☆☆☆ 2/5 |
| **Testability** | 🟡 Medium | 🔴 Poor | ⭐☆☆☆☆ 1/5 |
| **Compliance** | 🟢 Low | 🟠 Minimal | ⭐⭐☆☆☆ 2/5 |

**Overall Grade**: ⭐⭐⭐☆☆ **3.0/5** - **Production-Ready MVP**

---

## 🔗 Related Documents

- [Functional Requirements](./functional-requirements.md) - What the system does
- [System Architecture Overview](../02-architecture/system-architecture-overview.md) - How it's built
- [Performance Optimization](../10-performance/performance-goals.md) - Performance strategies

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete
