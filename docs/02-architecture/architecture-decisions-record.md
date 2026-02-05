# Architecture Decisions Record (ADR)

> Key architectural decisions made for StayHaven

---

## 📋 Table of Contents

1. [ADR Format](#adr-format)
2. [Technology Stack Decisions](#technology-stack-decisions)
3. [Architecture Pattern Decisions](#architecture-pattern-decisions)
4. [Data Management Decisions](#data-management-decisions)
5. [Security Decisions](#security-decisions)

---

## 📝 ADR Format

Each architectural decision follows this structure:

```
## ADR-XXX: [Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: YYYY-MM-DD
**Deciders**: [List of people involved]
**Context**: Why we need to make this decision
**Decision**: What we decided to do
**Consequences**: 
  - ✅ Positive impacts
  - ⚠️ Negative impacts
  - 🔄 Trade-offs
**Alternatives Considered**: Other options we evaluated
**Related Decisions**: Links to related ADRs
```

---

## 💻 Technology Stack Decisions

### ADR-001: React for Frontend Framework

**Status**: ✅ Accepted  
**Date**: January 15, 2026  
**Deciders**: Development Team

#### Context

We needed to choose a modern frontend framework that would support:

- Component-based architecture
- Real-time updates (Socket.IO integration)
- Large ecosystem of libraries
- Good developer experience
- Strong community support

#### Decision

**Use React 18.3.1 with Vite as the build tool.**

#### Consequences

✅ **Positive**:

- Huge ecosystem of packages and components
- Virtual DOM for efficient updates
- React Hooks for state management
- Excellent Socket.IO integration
- Strong community and extensive documentation
- Vite provides extremely fast HMR (Hot Module Replacement)
- Component reusability across different roles (Waiter, Kitchen, etc.)

⚠️ **Negative**:

- Larger learning curve compared to simpler frameworks
- Need to choose additional libraries (routing, state management)
- Potential for over-engineering with too many abstractions

🔄 **Trade-offs**:

- Chose React over Vue.js for larger ecosystem
- Chose React over Angular for less opinionated structure
- Chose Vite over Create React App for better performance

#### Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|---|---|---|---|
| **Vue.js 3** | Easier learning curve, reactive | Smaller ecosystem | Less mature Socket.IO ecosystem |
| **Angular 15** | Full-featured, TypeScript | Heavyweight, opinionated | Too complex for project needs |
| **Svelte** | No virtual DOM, fast | Small ecosystem | Less familiar to team |
| **Next.js** | SSR, routing built-in | Server-side complexity | Overkill for SPA needs |

#### Related Decisions

- ADR-002: Node.js Backend
- ADR-006: Context API for State Management

---

### ADR-002: Node.js with Express for Backend

**Status**: ✅ Accepted  
**Date**: January 15, 2026  
**Deciders**: Development Team

#### Context

Backend framework needed to:

- Handle REST API requests
- Support WebSocket connections (Socket.IO)
- Integrate with MongoDB
- Fast development velocity
- JavaScript/TypeScript for full-stack consistency

#### Decision

**Use Node.js 20.x LTS with Express 5.1.0.**

#### Consequences

✅ **Positive**:

- JavaScript everywhere (full-stack)
- Non-blocking I/O for real-time features
- Excellent Socket.IO support
- Large middleware ecosystem
- Fast development with npm packages
- Easy to scale horizontally
- Strong MongoDB integration with Mongoose

⚠️ **Negative**:

- Single-threaded (mitigated with PM2 clustering)
- Callback hell potential (mitigated with async/await)
- Less type safety than compiled languages (mitigated with JSDoc)

🔄 **Trade-offs**:

- Chose Express over Fastify for maturity and ecosystem
- Chose Node.js over Python for better real-time support
- Chose Node.js over Go for development speed

#### Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|---|---|---|---|
| **Python/Django** | Mature, batteries-included | Slower real-time support | Less ideal for WebSockets |
| **Python/FastAPI** | Fast, modern, async | Smaller ecosystem | Team less familiar |
| **Go/Gin** | Compiled, very fast | Different language | Slower development |
| **Java/Spring Boot** | Enterprise-grade, type-safe | Heavyweight, verbose | Overkill for project |

#### Related Decisions

- ADR-001: React Frontend
- ADR-004: MongoDB Database
- ADR-008: Socket.IO for Real-time

---

### ADR-003: Vite for Frontend Build Tool

**Status**: ✅ Accepted  
**Date**: January 16, 2026  
**Deciders**: Development Team

#### Context

Need a build tool that provides:

- Fast development server with HMR
- Optimized production builds
- Modern JavaScript/JSX support
- Easy configuration

#### Decision

**Use Vite 6.0.13 as the build tool.**

#### Consequences

✅ **Positive**:

- Lightning-fast HMR (under 100ms)
- Native ES modules in development
- Rollup-based production builds (optimized)
- Simple configuration
- Plugin ecosystem
- Built-in TypeScript support

⚠️ **Negative**:

- Newer tool (less mature than webpack)
- Some plugins still webpack-focused

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Create React App** | Slow HMR, outdated tooling |
| **Webpack** | Complex configuration, slower |
| **Parcel** | Less control over builds |

#### Related Decisions

- ADR-001: React Frontend

---

### ADR-004: MongoDB for Primary Database

**Status**: ✅ Accepted  
**Date**: January 15, 2026  
**Deciders**: Development Team

#### Context

Database needed to:

- Store user data, hotels, orders, bookings
- Support flexible schema for multi-tenancy
- Scale horizontally
- Integrate well with Node.js
- Handle complex nested data (orders with items)

#### Decision

**Use MongoDB 6.20.0 with Mongoose 8.9.1 ODM.**

#### Consequences

✅ **Positive**:

- Flexible schema for evolving requirements
- Excellent fit for multi-tenancy (company-based isolation)
- Native JSON storage (no ORM impedance mismatch)
- Horizontal sharding support
- Mongoose provides schema validation and middleware
- Aggregation pipeline for complex queries
- Change streams for real-time features

⚠️ **Negative**:

- No ACID transactions across collections (mitigated with transactions)
- Schema-less can lead to inconsistencies (mitigated with Mongoose schemas)
- Less mature query optimization than relational DBs

🔄 **Trade-offs**:

- Chose MongoDB over PostgreSQL for schema flexibility
- Chose MongoDB over MySQL for better JSON handling
- Accepted eventual consistency for scalability

#### Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|---|---|---|---|
| **PostgreSQL** | ACID, mature, JSONB | Rigid schema, harder to scale | Less flexible for multi-tenancy |
| **MySQL** | Mature, ACID | No native JSON, rigid schema | Poor JSON support |
| **DynamoDB** | Serverless, auto-scale | Vendor lock-in, complex | AWS dependency |

#### Related Decisions

- ADR-002: Node.js Backend
- ADR-009: Multi-tenancy Design

---

### ADR-005: Mongoose ODM for MongoDB

**Status**: ✅ Accepted  
**Date**: January 16, 2026  
**Deciders**: Development Team

#### Context

Need an abstraction layer for MongoDB that provides:

- Schema definition and validation
- Middleware (hooks) for business logic
- Type casting and defaults
- Query builder

#### Decision

**Use Mongoose 8.9.1 as the ODM.**

#### Consequences

✅ **Positive**:

- Schema definition prevents data inconsistencies
- Pre/post hooks for password hashing, audit logs
- Virtuals for computed properties
- Population for references (like JOINs)
- Built-in validation
- Query chaining for readable code

⚠️ **Negative**:

- Adds abstraction layer overhead
- Can be over-used (not always need full schema)
- Learning curve for advanced features

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Native MongoDB driver** | Too low-level, no validation |
| **Prisma** | Requires schema migrations |
| **TypeORM** | Better for SQL databases |

#### Related Decisions

- ADR-004: MongoDB Database

---

## 🏛️ Architecture Pattern Decisions

### ADR-006: Context API for State Management

**Status**: ✅ Accepted  
**Date**: January 17, 2026  
**Deciders**: Development Team

#### Context

Frontend needed state management for:

- User authentication state
- Socket.IO connection
- Order management
- Notifications
- Theme (dark/light mode)

#### Decision

**Use React Context API with custom hooks (no Redux).**

#### Consequences

✅ **Positive**:

- No additional dependencies
- Simpler than Redux
- Built into React
- Custom hooks provide clean API
- Sufficient for application complexity

⚠️ **Negative**:

- No time-travel debugging
- No middleware ecosystem (like Redux DevTools)
- Can cause unnecessary re-renders if not careful

🔄 **Trade-offs**:

- Chose Context API over Redux for simplicity
- Accepted potential re-render issues for less boilerplate

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Redux** | Too much boilerplate for project size |
| **Zustand** | Additional dependency, Context API sufficient |
| **Recoil** | Experimental, not stable |
| **MobX** | Different paradigm, team unfamiliar |

#### Related Decisions

- ADR-001: React Frontend

---

### ADR-007: MVC Pattern for Backend

**Status**: ✅ Accepted  
**Date**: January 17, 2026  
**Deciders**: Development Team

#### Context

Backend needed clear separation of concerns:

- Routes (API endpoints)
- Controllers (business logic)
- Models (data layer)
- Middleware (cross-cutting concerns)

#### Decision

**Use Model-View-Controller (MVC) pattern.**

```
Routes → Middleware → Controllers → Models → Database
```

#### Consequences

✅ **Positive**:

- Clear separation of concerns
- Easy to test controllers independently
- Middleware for reusable logic (auth, validation)
- Models encapsulate data logic
- Familiar pattern to most developers

⚠️ **Negative**:

- Can be over-engineered for simple endpoints
- More files to navigate

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Flat structure** | Hard to maintain as project grows |
| **Domain-Driven Design** | Too complex for project size |
| **Hexagonal Architecture** | Overkill for CRUD operations |

#### Related Decisions

- ADR-002: Node.js Backend

---

### ADR-008: Socket.IO for Real-time Communication

**Status**: ✅ Accepted  
**Date**: January 18, 2026  
**Deciders**: Development Team

#### Context

Application requires real-time features:

- Order notifications to kitchen
- Waiter call alerts
- Live booking updates
- User presence indicators

#### Decision

**Use Socket.IO 4.8.3 for WebSocket communication.**

#### Consequences

✅ **Positive**:

- Fallback to polling if WebSocket unavailable
- Room-based broadcasting (hotel rooms, role rooms)
- Acknowledgements for reliable messaging
- Automatic reconnection
- Binary data support
- Middleware for authentication

⚠️ **Negative**:

- Slightly larger than native WebSocket
- Opinionated protocol (not pure WebSocket)

🔄 **Trade-offs**:

- Chose Socket.IO over native WebSocket for reliability features
- Accepted protocol overhead for ease of use

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Native WebSocket** | No reconnection, no rooms |
| **Server-Sent Events (SSE)** | One-way only (server to client) |
| **Long Polling** | Inefficient for frequent updates |
| **Firebase Realtime DB** | Vendor lock-in, cost |

#### Related Decisions

- ADR-002: Node.js Backend
- ADR-001: React Frontend

---

### ADR-009: Multi-tenancy with Shared Database

**Status**: ✅ Accepted  
**Date**: January 18, 2026  
**Deciders**: Development Team

#### Context

StayHaven serves multiple companies (tenants):

- Each company has independent data
- Need cost-effective solution
- Easy to scale
- Data must be isolated

#### Decision

**Use shared database with company discriminator column.**

Every document has a `company` field:

```javascript
{
  company: ObjectId("507f1f77bcf86cd799439011"),
  // ... other fields
}
```

All queries filter by `company`:

```javascript
Hotel.find({ company: req.user.company })
```

#### Consequences

✅ **Positive**:

- Cost-effective (one database for all tenants)
- Easy to add new tenants (just create Company document)
- Simple backups (one database)
- Easy cross-tenant analytics (for super admin)
- Efficient resource utilization

⚠️ **Negative**:

- Risk of data leakage if query misses company filter
- All tenants share database resources
- Harder to migrate single tenant to separate database

🔄 **Trade-offs**:

- Chose shared database over separate databases for cost
- Accepted query complexity for scalability

#### Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|---|---|---|---|
| **Separate Database per Tenant** | Complete isolation | Expensive, complex migrations | High cost for many tenants |
| **Separate Schema per Tenant** | Better isolation | Complex migrations | Still shares DB resources |

#### Related Decisions

- ADR-004: MongoDB Database
- ADR-013: Company-based Access Control

---

## 🔒 Security Decisions

### ADR-010: JWT for Authentication

**Status**: ✅ Accepted  
**Date**: January 19, 2026  
**Deciders**: Development Team

#### Context

Authentication system needed:

- Stateless authentication
- Support for multiple devices
- Token refresh mechanism
- Secure token storage

#### Decision

**Use JWT (JSON Web Tokens) with dual-token strategy:**

- **Access Token**: Short-lived (1 hour), stored in HTTP-only cookie
- **Refresh Token**: Long-lived (7 days), stored in HTTP-only cookie + database

#### Consequences

✅ **Positive**:

- Stateless (no server-side sessions)
- Scalable (works with load balancers)
- HTTP-only cookies prevent XSS attacks
- Can revoke refresh tokens in database
- JWT contains user info (no DB lookup on every request)

⚠️ **Negative**:

- Cannot revoke access tokens (wait for expiration)
- Larger cookie size than session ID
- Need to store refresh tokens in database

🔄 **Trade-offs**:

- Chose JWT over sessions for scalability
- Accepted 1-hour revocation delay for performance
- Chose HTTP-only cookies over localStorage for security

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Server-side Sessions** | Requires sticky sessions or shared store |
| **OAuth2 only** | Too complex for internal auth |
| **Basic Auth** | Not secure enough |

#### Related Decisions

- ADR-011: bcrypt for Password Hashing
- ADR-013: Role-Based Access Control

---

### ADR-011: bcrypt for Password Hashing

**Status**: ✅ Accepted  
**Date**: January 19, 2026  
**Deciders**: Development Team

#### Context

Need secure password storage:

- One-way hashing (irreversible)
- Salting to prevent rainbow tables
- Configurable work factor
- Industry-standard algorithm

#### Decision

**Use bcrypt with 10 salt rounds.**

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

#### Consequences

✅ **Positive**:

- Industry-standard, battle-tested
- Adaptive (can increase work factor)
- Automatic salting
- Slow hashing (prevents brute-force)

⚠️ **Negative**:

- CPU-intensive (10 rounds ≈ 100ms)
- Max password length 72 bytes

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Argon2** | Less mature ecosystem in Node.js |
| **PBKDF2** | Less resistant to GPU attacks |
| **SHA-256** | Too fast (vulnerable to brute-force) |

#### Related Decisions

- ADR-010: JWT Authentication

---

### ADR-012: HTTPS Everywhere

**Status**: ✅ Accepted  
**Date**: January 20, 2026  
**Deciders**: Development Team

#### Context

All communication must be encrypted:

- Prevent man-in-the-middle attacks
- Protect cookies in transit
- Secure WebSocket connections
- Required for modern browsers

#### Decision

**Enforce HTTPS in production with HTTP→HTTPS redirect.**

Use Let's Encrypt for free SSL certificates.

#### Consequences

✅ **Positive**:

- All data encrypted in transit
- Required for HTTP-only cookies
- Improves SEO ranking
- Browser security features enabled

⚠️ **Negative**:

- Need to manage SSL certificates
- Slight performance overhead (TLS handshake)

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **HTTP only** | Insecure, cookies exposed |
| **Paid SSL certificates** | Let's Encrypt is free and automated |

#### Related Decisions

- ADR-010: JWT Authentication

---

### ADR-013: Role-Based Access Control (RBAC)

**Status**: ✅ Accepted  
**Date**: January 20, 2026  
**Deciders**: Development Team

#### Context

Different users have different permissions:

- **Guests**: View hotels, book rooms
- **Waiters**: Create orders, view assigned tables
- **Kitchen Staff**: View orders, update status
- **Receptionists**: Manage bookings, check-in/out
- **Managers**: Manage staff, view reports
- **Owners**: Full control over company

#### Decision

**Use Role-Based Access Control with 8 roles:**

1. `admin` (super admin - platform level)
2. `owner` (company owner)
3. `manager` (hotel manager)
4. `chief` (kitchen staff)
5. `waiter` (wait staff)
6. `receptionist` (front desk)
7. `housekeeping` (room cleaning)
8. `maintenance` (repairs)

Implement with `authorize` middleware:

```javascript
router.post('/hotels', protect, authorize('owner', 'manager'), createHotel);
```

#### Consequences

✅ **Positive**:

- Clear permission boundaries
- Easy to add new roles
- Middleware-based enforcement
- Auditable (know who did what)

⚠️ **Negative**:

- Less flexible than permission-based (e.g., user can't have mixed permissions)
- Middleware must be applied to every route

🔄 **Trade-offs**:

- Chose roles over permissions for simplicity
- Accepted less granularity for easier implementation

#### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **Attribute-Based (ABAC)** | Too complex for project needs |
| **Permission-Based** | More granular but harder to manage |
| **No access control** | Security risk |

#### Related Decisions

- ADR-010: JWT Authentication
- ADR-009: Multi-tenancy Design

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Technology Stack](../00-overview/technology-stack.md)
- [Security Measures](../05-security/security-best-practices.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive ADR documenting all major architectural decisions
