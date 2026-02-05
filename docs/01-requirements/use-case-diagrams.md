# Use Case Diagrams

> Visual representation of system interactions for all user roles in the StayHaven platform

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [System Context Diagram](#system-context-diagram)
3. [Guest Use Cases](#guest-use-cases)
4. [Hotel Owner Use Cases](#hotel-owner-use-cases)
5. [Hotel Manager Use Cases](#hotel-manager-use-cases)
6. [Receptionist Use Cases](#receptionist-use-cases)
7. [Chef Use Cases](#chef-use-cases)
8. [Waiter Use Cases](#waiter-use-cases)
9. [Platform Administrator Use Cases](#platform-administrator-use-cases)
10. [Cross-Role Interactions](#cross-role-interactions)
11. [Real-Time Communication Flows](#real-time-communication-flows)

---

## 📖 Introduction

### Purpose

This document provides comprehensive use case diagrams showing how different actors interact with the StayHaven platform. Each diagram illustrates the functional scope available to each user role.

### Diagram Conventions

**Actors** (External):

```
    ┌────┐
    │ 👤 │  = User/Person
    └────┘

    ┌────┐
    │ 📧 │  = External System (Email, Payment Gateway)
    └────┘
```

**Use Cases** (System Functions):

```
    ┌─────────────────┐
    │  Use Case Name  │  = Primary Use Case
    └─────────────────┘

    ┌─ ─ ─ ─ ─ ─ ─ ─ ┐
       Extension      │  = Optional Extension
    └─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Relationships**:

```
    ────────>  = Association (Actor performs Use Case)
    ─ ─ ─ ─>  = Include (Required dependency)
    - - - ->   = Extend (Optional extension)
```

---

## 🌐 System Context Diagram

### High-Level System Overview

```
                                    ┌─────────────────────────────────────────────────┐
                                    │                                                 │
                                    │           STAYHAVEN PLATFORM                    │
                                    │                                                 │
                                    │  ┌───────────────────────────────────────┐     │
    ┌────┐                          │  │     Guest Services                    │     │
    │👤  │─────────────────────────>│  │  - Hotel Search & Booking             │     │
    │Guest                          │  │  - Room Service Orders                │     │
    └────┘                          │  │  - Waiter Calls                       │     │
                                    │  │  - Reviews & Feedback                 │     │
                                    │  └───────────────────────────────────────┘     │
                                    │                                                 │
    ┌────┐                          │  ┌───────────────────────────────────────┐     │
    │👤  │─────────────────────────>│  │     Owner Portal                      │     │
    │Owner                          │  │  - Hotel & Room Management            │     │
    └────┘                          │  │  - Staff Management                   │     │
                                    │  │  - Menu Management                    │     │
                                    │  │  - Analytics & Reports                │     │
    ┌────┐                          │  └───────────────────────────────────────┘     │
    │👤  │─────────────────────────>│                                                 │
    │Manager                        │  ┌───────────────────────────────────────┐     │
    └────┘                          │  │     Staff Operations                  │     │
                                    │  │  - Manager Dashboard                  │     │
    ┌────┐                          │  │  - Reception Desk                     │     │
    │👤  │─────────────────────────>│  │  - Kitchen Dashboard                  │     │
    │Receptionist                   │  │  - Waiter Service App                 │     │
    └────┘                          │  └───────────────────────────────────────┘     │
                                    │                                                 │
    ┌────┐                          │  ┌───────────────────────────────────────┐     │
    │👤  │─────────────────────────>│  │     Admin Panel                       │     │
    │Admin                          │  │  - Hotel Approvals                    │     │
    └────┘                          │  │  - User Management                    │     │
                                    │  │  - Platform Analytics                 │     │
    ┌────┐                          │  │  - System Configuration               │     │
    │👤  │─────────────────────────>│  └───────────────────────────────────────┘     │
    │Chef │                         │                                                 │
    └────┘                          │  ┌───────────────────────────────────────┐     │
                                    │  │     Real-Time Services                │     │
    ┌────┐                          │  │  - WebSocket Communication            │     │
    │👤  │─────────────────────────>│  │  - Order Status Updates               │     │
    │Waiter                         │  │  - Waiter Call Notifications          │     │
    └────┘                          │  │  - Live Dashboard Updates             │     │
                                    │  └───────────────────────────────────────┘     │
                                    │                                                 │
                                    └─────────────┬───────────┬───────────────────────┘
                                                  │           │
                                         ┌────────▼───┐   ┌──▼─────────┐
                                         │  Email     │   │ Cloudinary │
                                         │  Service   │   │  (Images)  │
                                         │ (Nodemailer│   └────────────┘
                                         └────────────┘
```

---

## 👥 Guest Use Cases

### Guest Actor Interactions

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         GUEST PORTAL                            │
                    │                                                 │
                    │                                                 │
┌────┐              │   ┌─────────────────────┐                      │
│👤  │──────────────┼──>│  Search Hotels      │                      │
│    │              │   └─────────────────────┘                      │
│Guest              │            │                                    │
│    │              │            │ includes                           │
│    │              │            ▼                                    │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Filter Hotels      │                      │
│    │              │   │  (Location, Price,  │                      │
│    │              │   │   Rating, Amenities)│                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Hotel Details │                      │
│    │              │   │  - Photos           │                      │
│    │              │   │  - Rooms            │                      │
│    │              │   │  - Amenities        │                      │
│    │              │   │  - Reviews          │                      │
│    │              │   │  - Menu             │                      │
│    │              │   └─────────────────────┘                      │
│    │              │            │                                    │
│    │              │            │ extends                            │
│    │              │            ▼                                    │
│    │              │   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                        │
│    │──────────────┼──>  Add to Wishlist                            │
│    │              │   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                        │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Book Room          │                      │
│    │              │   │  - Select dates     │                      │
│    │              │   │  - Choose room type │                      │
│    │              │   │  - Enter guest info │                      │
│    │              │   │  - Confirm booking  │◄────────┐            │
│    │              │   └─────────────────────┘         │            │
│    │              │            │                      │            │
│    │              │            │ includes             │            │
│    │              │            ▼                      │            │
│    │              │   ┌─────────────────────┐        │            │
│    │              │   │  Authenticate        │        │            │
│    │              │   │  - Login/Register    │        │            │
│    │              │   └─────────────────────┘        │            │
│    │              │            │                      │            │
│    │              │            │ includes             │            │
│    │              │            ▼                      │            │
│    │              │   ┌─────────────────────┐        │            │
│    │              │   │  Receive Confirmation        │            │
│    │              │   │  Email              │────────┘            │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View My Bookings   │                      │
│    │              │   └─────────────────────┘                      │
│    │              │            │                                    │
│    │              │            │ extends                            │
│    │              │            ▼                                    │
│    │              │   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                        │
│    │──────────────┼──>  Modify Booking                             │
│    │              │   │  (Before Check-in)  │                      │
│    │              │   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                        │
│    │              │                                                 │
│    │              │   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                        │
│    │──────────────┼──>  Cancel Booking                             │
│    │              │   │  (With Cancellation │                      │
│    │              │   │   Policy)           │                      │
│    │              │   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                        │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Place Order        │                      │
│    │              │   │  (Room Service)     │                      │
│    │              │   │  - Browse menu      │                      │
│    │              │   │  - Add items        │                      │
│    │              │   │  - Add notes        │                      │
│    │              │   │  - Submit order     │                      │
│    │              │   └─────────────────────┘                      │
│    │              │            │                                    │
│    │              │            │ includes                           │
│    │              │            ▼                                    │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Track Order Status │                      │
│    │              │   │  - Pending          │                      │
│    │              │   │  - Confirmed        │                      │
│    │              │   │  - Preparing        │                      │
│    │              │   │  - Ready            │                      │
│    │              │   │  - Delivered        │                      │
│    │              │   │  + ETA Display      │◄────────┐            │
│    │              │   └─────────────────────┘         │            │
│    │              │                                   │            │
│    │              │   ┌─────────────────────┐        │            │
│    │──────────────┼──>│  Call Waiter        │        │            │
│    │              │   │  - One-tap button   │        │            │
│    │              │   │  - Specify need     │        │            │
│    │              │   │  - Track response   │────────┘            │
│    │              │   └─────────────────────┘     (real-time)     │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Manage Profile     │                      │
│    │              │   │  - Update info      │                      │
│    │              │   │  - Change password  │                      │
│    │              │   │  - Upload photo     │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Leave Review       │                      │
│    │              │   │  (After Checkout)   │                      │
│    │              │   │  - Rate hotel       │                      │
│    │              │   │  - Write feedback   │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
└────┘              │                                                 │
                    └─────────────────────────────────────────────────┘
```

### Guest Authentication Flow

```
┌────┐              ┌─────────────────────┐
│Guest ───────────>│  Register           │
└────┘              │  - Email/Password   │
     │              │  - Profile Info     │
     │              └──────────┬──────────┘
     │                         │
     │                         ▼
     │              ┌─────────────────────┐         ┌────────────┐
     │              │  Verify Email       │────────>│ Email      │
     │              │  (Token Link)       │         │ Service    │
     │              └──────────┬──────────┘         └────────────┘
     │                         │
     │                         ▼
     │              ┌─────────────────────┐
     └─────────────>│  Login              │
                    │  - Email/Password   │
                    │  - Google OAuth     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  JWT Token          │
                    │  - Access (1 hour)  │
                    │  - Refresh (7 days) │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Auto Refresh       │
                    │  (Before Expiry)    │
                    └─────────────────────┘
```

---

## 🏨 Hotel Owner Use Cases

### Owner Portal Functions

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         OWNER PORTAL                            │
                    │                                                 │
┌────┐              │                                                 │
│👤  │              │   ┌─────────────────────┐                      │
│Hotel              │   │  Create Company     │                      │
│Owner ─────────────┼──>│  - Legal name       │                      │
│    │              │   │  - Contact info     │                      │
│    │              │   │  - Address          │                      │
│    │              │   │  - Logo upload      │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ enables                          │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Create Hotel       │                      │
│    │              │   │  - Hotel name       │                      │
│    │              │   │  - Location         │                      │
│    │              │   │  - Description      │                      │
│    │              │   │  - Amenities        │                      │
│    │              │   │  - Upload photos    │────────┐             │
│    │              │   │  - Set policies     │        │             │
│    │              │   └──────────┬──────────┘        │             │
│    │              │              │                   │             │
│    │              │              │ triggers          │             │
│    │              │              ▼                   │             │
│    │              │   ┌─────────────────────┐       │             │
│    │              │   │  Admin Reviews Hotel│       │             │
│    │              │   │  - Approve/Reject   │       │             │
│    │              │   └──────────┬──────────┘       │             │
│    │              │              │                   │             │
│    │              │       ┌──────┴────────┐         │             │
│    │              │       ▼               ▼         │             │
│    │              │   [Approved]      [Rejected]    │             │
│    │              │       │                         │             │
│    │              │       │ enables                 │             │
│    │              │       ▼                         ▼             │
│    │              │   ┌─────────────────────┐   ┌──────────┐     │
│    │──────────────┼──>│  Manage Rooms       │   │ Cloudinary    │
│    │              │   │  - Create rooms     │   │ (Images)  │    │
│    │              │   │  - Set types        │   └──────────┘     │
│    │              │   │  - Set pricing      │                     │
│    │              │   │  - Set capacity     │                     │
│    │              │   │  - Upload photos    │─────────────┘       │
│    │              │   │  - Set amenities    │                     │
│    │              │   │  - Mark available   │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Manage Menu        │                     │
│    │              │   │  - Create items     │                     │
│    │              │   │  - Set categories   │                     │
│    │              │   │  - Set pricing      │                     │
│    │              │   │  - Upload photos    │                     │
│    │              │   │  - Mark available   │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Invite Staff       │                     │
│    │              │   │  - Enter email      │                     │
│    │              │   │  - Assign role      │                     │
│    │              │   │  - Assign property  │─────────┐           │
│    │              │   │  - Send invitation  │         │           │
│    │              │   └─────────────────────┘         │           │
│    │              │              │                    │           │
│    │              │              │ triggers           │           │
│    │              │              ▼                    │           │
│    │              │   ┌─────────────────────┐        │           │
│    │              │   │  Email Invitation   │◄───────┘           │
│    │              │   │  - Unique token     │                     │
│    │              │   │  - Role details     │                     │
│    │              │   └──────────┬──────────┘                     │
│    │              │              │                                 │
│    │              │              ▼                                 │
│    │              │   ┌─────────────────────┐                     │
│    │              │   │  Staff Onboards     │                     │
│    │              │   │  - Accepts invite   │                     │
│    │              │   │  - Sets password    │                     │
│    │              │   │  - Completes profile│                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Manage Staff       │                     │
│    │              │   │  - View all staff   │                     │
│    │              │   │  - Change roles     │                     │
│    │              │   │  - Reassign hotels  │                     │
│    │              │   │  - Deactivate       │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  View Analytics     │                     │
│    │              │   │  - Bookings         │                     │
│    │              │   │  - Revenue          │                     │
│    │              │   │  - Occupancy rate   │                     │
│    │              │   │  - Order volume     │                     │
│    │              │   │  - Staff performance│                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Generate Reports   │                     │
│    │              │   │  - Financial        │                     │
│    │              │   │  - Occupancy        │                     │
│    │              │   │  - Guest feedback   │                     │
│    │              │   │  - Export to CSV    │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Respond to Reviews │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
└────┘              │                                                │
                    └─────────────────────────────────────────────────┘
```

---

## 👔 Hotel Manager Use Cases

### Manager Dashboard Functions

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         MANAGER DASHBOARD                       │
                    │                                                 │
┌────┐              │                                                 │
│👤  │              │   ┌─────────────────────┐                      │
│Hotel              │   │  Select Active Hotel│                      │
│Manager────────────┼──>│  (From Assigned)    │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ sets context                     │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Dashboard     │                      │
│    │              │   │  - Today's arrivals │                      │
│    │              │   │  - Departures       │                      │
│    │              │   │  - Occupancy        │                      │
│    │              │   │  - Pending orders   │                      │
│    │              │   │  - Staff status     │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Manage Bookings    │                      │
│    │              │   │  - View all         │                      │
│    │              │   │  - Modify details   │                      │
│    │              │   │  - Assign rooms     │                      │
│    │              │   │  - Process special  │                      │
│    │              │   │    requests         │                      │
│    │              │   │  - Handle early     │                      │
│    │              │   │    checkin/late     │                      │
│    │              │   │    checkout         │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Monitor Orders     │                      │
│    │              │   │  - View all orders  │                      │
│    │              │   │  - Track status     │                      │
│    │              │   │  - Set priority     │◄────────┐            │
│    │              │   │  - Handle issues    │         │            │
│    │              │   └─────────────────────┘         │            │
│    │              │              │                    │            │
│    │              │              │ includes           │            │
│    │              │              ▼                    │            │
│    │              │   ┌─────────────────────┐        │            │
│    │              │   │  Mark as High       │        │            │
│    │              │   │  Priority           │────────┘            │
│    │              │   │  (Appears red in    │                     │
│    │              │   │   kitchen)          │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Manage Room Status │                     │
│    │              │   │  - Available        │                     │
│    │              │   │  - Occupied         │                     │
│    │              │   │  - Cleaning         │                     │
│    │              │   │  - Maintenance      │                     │
│    │              │   │  - Out of order     │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Supervise Staff    │                     │
│    │              │   │  - View activity    │                     │
│    │              │   │  - Assign tasks     │                     │
│    │              │   │  - Monitor          │                     │
│    │              │   │    performance      │                     │
│    │              │   │  - Provide feedback │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Invite Staff       │                     │
│    │              │   │  (For assigned hotel│                     │
│    │              │   │   only)             │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Handle Guest       │                     │
│    │              │   │  Complaints         │                     │
│    │              │   │  - Receive issue    │                     │
│    │              │   │  - Assign to staff  │                     │
│    │              │   │  - Track resolution │                     │
│    │              │   │  - Follow up        │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  View Analytics     │                     │
│    │              │   │  (Property-specific)│                     │
│    │              │   │  - Daily occupancy  │                     │
│    │              │   │  - Order metrics    │                     │
│    │              │   │  - Staff efficiency │                     │
│    │              │   │  - Guest            │                     │
│    │              │   │    satisfaction     │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
│    │              │   ┌─────────────────────┐                     │
│    │──────────────┼──>│  Generate Reports   │                     │
│    │              │   │  - Daily summary    │                     │
│    │              │   │  - Incident reports │                     │
│    │              │   │  - Staff reports    │                     │
│    │              │   └─────────────────────┘                     │
│    │              │                                                │
└────┘              │                                                │
                    └─────────────────────────────────────────────────┘
```

---

## 🎫 Receptionist Use Cases

### Reception Desk Operations

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         RECEPTION DESK SYSTEM                   │
                    │                                                 │
┌────┐              │                                                 │
│👤  │              │   ┌─────────────────────┐                      │
│Reception          │   │  View Today's       │                      │
│ist   ─────────────┼──>│  Schedule           │                      │
│    │              │   │  - Arrivals         │                      │
│    │              │   │  - Departures       │                      │
│    │              │   │  - Room status      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Check-In Guest     │                      │
│    │              │   │  1. Verify booking  │                      │
│    │              │   │  2. Check ID        │                      │
│    │              │   │  3. Collect info    │                      │
│    │              │   │  4. Assign room     │                      │
│    │              │   │  5. Explain         │                      │
│    │              │   │     amenities       │                      │
│    │              │   │  6. Issue key       │                      │
│    │              │   │  7. Update status   │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ triggers                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Update Room Status │                      │
│    │              │   │  to "Occupied"      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Check-Out Guest    │                      │
│    │              │   │  1. Verify room #   │                      │
│    │              │   │  2. Check minibar   │                      │
│    │              │   │  3. Process payment │                      │
│    │              │   │  4. Collect feedback│                      │
│    │              │   │  5. Generate invoice│                      │
│    │              │   │  6. Collect key     │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ triggers                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Update Room Status │                      │
│    │              │   │  to "Cleaning"      │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ notifies                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Housekeeping       │                      │
│    │              │   │  Receives Task      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Create Walk-in     │                      │
│    │              │   │  Booking            │                      │
│    │              │   │  - Check            │                      │
│    │              │   │    availability     │                      │
│    │              │   │  - Select room      │                      │
│    │              │   │  - Enter guest info │                      │
│    │              │   │  - Set dates        │                      │
│    │              │   │  - Process payment  │                      │
│    │              │   │  - Immediate        │                      │
│    │              │   │    check-in         │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Modify Booking     │                      │
│    │              │   │  - Change dates     │                      │
│    │              │   │  - Change room      │                      │
│    │              │   │  - Add guests       │                      │
│    │              │   │  - Special requests │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Process            │                      │
│    │              │   │  Cancellation       │                      │
│    │              │   │  - Check policy     │                      │
│    │              │   │  - Calculate refund │                      │
│    │              │   │  - Update status    │                      │
│    │              │   │  - Send             │                      │
│    │              │   │    confirmation     │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Handle Service     │                      │
│    │              │   │  Requests           │                      │
│    │              │   │  - Room service     │                      │
│    │              │   │  - Housekeeping     │                      │
│    │              │   │  - Maintenance      │                      │
│    │              │   │  - Wake-up calls    │                      │
│    │              │   │  - Extra amenities  │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ assigns to                       │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Staff Member       │                      │
│    │              │   │  (Waiter/           │                      │
│    │              │   │   Housekeeping)     │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Waiter Calls  │◄────────┐            │
│    │              │   │  - Room number      │         │            │
│    │              │   │  - Request type     │         │            │
│    │              │   │  - Assign to waiter │─────────┘            │
│    │              │   └─────────────────────┘    (real-time)       │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Answer Guest       │                      │
│    │              │   │  Inquiries          │                      │
│    │              │   │  - Room info        │                      │
│    │              │   │  - Hotel amenities  │                      │
│    │              │   │  - Local area       │                      │
│    │              │   │  - Directions       │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Forward Complaints │                      │
│    │              │   │  to Manager         │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
└────┘              │                                                 │
                    └─────────────────────────────────────────────────┘
```

---

## 👨‍🍳 Chef Use Cases

### Kitchen Dashboard Operations

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         KITCHEN DASHBOARD                       │
                    │                                                 │
┌────┐              │                                                 │
│👤  │              │   ┌─────────────────────┐                      │
│Chef│              │   │  View Order Queue   │◄────────┐            │
│(Chief)────────────┼──>│  - Pending orders   │         │            │
│    │              │   │  - Preparing orders │         │            │
│    │              │   │  - Priority flags   │─────────┘            │
│    │              │   │  - Time stamps      │    (real-time        │
│    │              │   └─────────────────────┘     Socket.io)       │
│    │              │              │                                  │
│    │              │              │ sorted by                        │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Priority Algorithm │                      │
│    │              │   │  1. High priority   │                      │
│    │              │   │  2. Order time      │                      │
│    │              │   │  3. Preparation     │                      │
│    │              │   │     complexity      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Order Details │                      │
│    │              │   │  - Items list       │                      │
│    │              │   │  - Quantities       │                      │
│    │              │   │  - Special notes    │                      │
│    │              │   │  - Dietary          │                      │
│    │              │   │    requirements     │                      │
│    │              │   │  - Table/room #     │                      │
│    │              │   │  - Waiter name      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Confirm Order      │                      │
│    │              │   │  (Acknowledge)      │                      │
│    │              │   │  Status: Pending -> │                      │
│    │              │   │          Confirmed  │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ notifies                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Waiter Notified    │                      │
│    │              │   │  "Order Confirmed"  │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Start Preparation  │                      │
│    │              │   │  - Click "Preparing"│                      │
│    │              │   │  - Gather           │                      │
│    │              │   │    ingredients      │                      │
│    │              │   │  - Cook items       │                      │
│    │              │   │  - Monitor progress │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ updates                          │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Real-time Status   │◄────────┐            │
│    │              │   │  Broadcast          │         │            │
│    │              │   │  - Waiter sees      │─────────┘            │
│    │              │   │  - Manager sees     │    (WebSocket)       │
│    │              │   │  - Guest sees ETA   │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Quality Check      │                      │
│    │              │   │  - Inspect dish     │                      │
│    │              │   │  - Check            │                      │
│    │              │   │    presentation     │                      │
│    │              │   │  - Verify items     │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Mark as Ready      │                      │
│    │              │   │  - Click "Ready"    │                      │
│    │              │   │  - Place on pickup  │                      │
│    │              │   │  - Ring bell        │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ triggers                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Waiter Notified    │◄────────┐            │
│    │              │   │  "Order Ready for   │         │            │
│    │              │   │   Pickup"           │─────────┘            │
│    │              │   │  - Room/table #     │    (Push             │
│    │              │   │  - Items list       │     notification)    │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Mark Item          │                      │
│    │              │   │  Unavailable        │                      │
│    │              │   │  (Out of stock)     │                      │
│    │              │   │  - Select item      │                      │
│    │              │   │  - Toggle           │                      │
│    │              │   │    availability     │                      │
│    │              │   │  - Add reason       │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ notifies                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Manager Notified   │                      │
│    │              │   │  "Item Unavailable" │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Report Issue       │                      │
│    │              │   │  to Manager         │                      │
│    │              │   │  - Equipment        │                      │
│    │              │   │    failure          │                      │
│    │              │   │  - Ingredient       │                      │
│    │              │   │    shortage         │                      │
│    │              │   │  - Order delay      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Kitchen       │                      │
│    │              │   │  Metrics            │                      │
│    │              │   │  - Orders completed │                      │
│    │              │   │  - Avg prep time    │                      │
│    │              │   │  - Pending count    │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
└────┘              │                                                 │
                    └─────────────────────────────────────────────────┘
```

---

## 🍽️ Waiter Use Cases

### Waiter Service Application

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         WAITER SERVICE APP                      │
                    │                                                 │
┌────┐              │                                                 │
│👤  │              │   ┌─────────────────────┐                      │
│Waiter             │   │  View Assigned      │                      │
│    │──────────────┼──>│  Tables/Rooms       │                      │
│    │              │   │  - Table numbers    │                      │
│    │              │   │  - Occupancy status │                      │
│    │              │   │  - Active orders    │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Take Order         │                      │
│    │              │   │  Step 1: Select     │                      │
│    │              │   │          table/room │                      │
│    │              │   │  Step 2: Browse     │                      │
│    │              │   │          menu       │                      │
│    │              │   │  Step 3: Add items  │                      │
│    │              │   │  Step 4: Set        │                      │
│    │              │   │          quantity   │                      │
│    │              │   │  Step 5: Add notes  │                      │
│    │              │   │  Step 6: Submit     │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ generates                        │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Generate KOT/BOT   │                      │
│    │              │   │  (Kitchen/Bar Order │                      │
│    │              │   │   Token)            │                      │
│    │              │   │  - Auto order #     │                      │
│    │              │   │  - Timestamp        │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ sends to                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Kitchen Dashboard  │◄────────┐            │
│    │              │   │  (Chef Receives)    │         │            │
│    │              │   └─────────────────────┘─────────┘            │
│    │              │                            (Real-time)          │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Track Orders       │◄────────┐            │
│    │              │   │  - Pending          │         │            │
│    │              │   │  - Confirmed        │         │            │
│    │              │   │  - Preparing        │─────────┘            │
│    │              │   │  - Ready            │    (Live updates)    │
│    │              │   │  - Delivered        │                      │
│    │              │   │  + ETA display      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │              │                                  │
│    │              │              │ when "Ready"                     │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Receive            │◄────────┐            │
│    │              │   │  Notification       │         │            │
│    │              │   │  "Order Ready"      │─────────┘            │
│    │              │   │  - Sound alert      │    (Push)            │
│    │              │   │  - Visual badge     │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Pickup Order       │                      │
│    │              │   │  from Kitchen       │                      │
│    │              │   │  - Go to kitchen    │                      │
│    │              │   │  - Verify items     │                      │
│    │              │   │  - Take tray        │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Deliver to Guest   │                      │
│    │              │   │  - Serve items      │                      │
│    │              │   │  - Check            │                      │
│    │              │   │    satisfaction     │                      │
│    │              │   │  - Mark as          │                      │
│    │              │   │    "Delivered"      │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ updates                          │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Order Status       │                      │
│    │              │   │  - Complete         │                      │
│    │              │   │  - Guest notified   │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Receive Waiter Call│◄────────┐            │
│    │              │   │  - Room/table #     │         │            │
│    │              │   │  - Request type     │─────────┘            │
│    │              │   │  - Priority         │    (Push)            │
│    │              │   │  - Timestamp        │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Respond to Call    │                      │
│    │              │   │  - Acknowledge      │                      │
│    │              │   │  - Go to room       │                      │
│    │              │   │  - Assist guest     │                      │
│    │              │   │  - Mark resolved    │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Menu          │                      │
│    │              │   │  (For               │                      │
│    │              │   │   Recommendations)  │                      │
│    │              │   │  - Item details     │                      │
│    │              │   │  - Prices           │                      │
│    │              │   │  - Availability     │                      │
│    │              │   │  - Ingredients      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Process Payment    │                      │
│    │              │   │  (Offline - Current)│                      │
│    │              │   │  - Calculate total  │                      │
│    │              │   │  - Accept payment   │                      │
│    │              │   │  - Generate receipt │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Daily Summary │                      │
│    │              │   │  - Orders served    │                      │
│    │              │   │  - Tables handled   │                      │
│    │              │   │  - Tips earned      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
└────┘              │                                                 │
                    └─────────────────────────────────────────────────┘
```

---

## 🔐 Platform Administrator Use Cases

### Admin Panel Functions

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │         ADMIN PANEL                             │
                    │                                                 │
┌────┐              │                                                 │
│👤  │              │   ┌─────────────────────┐                      │
│Platform           │   │  View Pending       │                      │
│Admin ─────────────┼──>│  Hotel Approvals    │                      │
│    │              │   │  - New submissions  │                      │
│    │              │   │  - Hotel details    │                      │
│    │              │   │  - Owner info       │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Review Hotel       │                      │
│    │              │   │  Submission         │                      │
│    │              │   │  - Check photos     │                      │
│    │              │   │  - Verify location  │                      │
│    │              │   │  - Validate details │                      │
│    │              │   │  - Check compliance │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │        ┌─────┴─────┐                           │
│    │              │        ▼           ▼                           │
│    │              │   ┌─────────┐  ┌─────────┐                     │
│    │──────────────┼──>│ Approve │  │ Reject  │                     │
│    │              │   │ Hotel   │  │ Hotel   │                     │
│    │              │   └────┬────┘  └────┬────┘                     │
│    │              │        │            │                           │
│    │              │        │            │ triggers                  │
│    │              │        │            ▼                           │
│    │              │        │    ┌─────────────────────┐            │
│    │              │        │    │  Send Rejection     │            │
│    │              │        │    │  Email with Reason  │            │
│    │              │        │    └─────────────────────┘            │
│    │              │        │                                        │
│    │              │        │ triggers                               │
│    │              │        ▼                                        │
│    │              │   ┌─────────────────────┐                      │
│    │              │   │  Hotel Goes Live    │                      │
│    │              │   │  - Visible to guests│                      │
│    │              │   │  - Owner notified   │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Feature Hotels     │                      │
│    │              │   │  on Homepage        │                      │
│    │              │   │  - Select hotels    │                      │
│    │              │   │  - Set featured flag│                      │
│    │              │   │  - Set display order│                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Manage All Users   │                      │
│    │              │   │  - View all accounts│                      │
│    │              │   │  - Filter by role   │                      │
│    │              │   │  - Search users     │                      │
│    │              │   └──────────┬──────────┘                      │
│    │              │              │                                  │
│    │              │              │ includes                         │
│    │              │              ▼                                  │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Deactivate User    │                      │
│    │              │   │  - Select user      │                      │
│    │              │   │  - Enter reason     │                      │
│    │              │   │  - Confirm action   │                      │
│    │              │   │  - Invalidate tokens│                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View All Hotels    │                      │
│    │              │   │  - All statuses     │                      │
│    │              │   │  - All companies    │                      │
│    │              │   │  - Performance data │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  View Platform      │                      │
│    │              │   │  Analytics          │                      │
│    │              │   │  - Total bookings   │                      │
│    │              │   │  - Active users     │                      │
│    │              │   │  - Revenue          │                      │
│    │              │   │  - Growth metrics   │                      │
│    │              │   │  - Popular hotels   │                      │
│    │              │   │  - Geographic data  │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Monitor System     │                      │
│    │              │   │  Health             │                      │
│    │              │   │  - API performance  │                      │
│    │              │   │  - Database status  │                      │
│    │              │   │  - Error rates      │                      │
│    │              │   │  - Socket.io status │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Handle Disputes    │                      │
│    │              │   │  - Guest complaints │                      │
│    │              │   │  - Owner appeals    │                      │
│    │              │   │  - Investigate      │                      │
│    │              │   │  - Take action      │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Manage Content     │                      │
│    │              │   │  - Review reviews   │                      │
│    │              │   │  - Remove           │                      │
│    │              │   │    inappropriate    │                      │
│    │              │   │  - Flag spam        │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Configure Platform │                      │
│    │              │   │  Settings           │                      │
│    │              │   │  - Commission rates │                      │
│    │              │   │  - Feature flags    │                      │
│    │              │   │  - Email templates  │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
│    │              │   ┌─────────────────────┐                      │
│    │──────────────┼──>│  Generate Reports   │                      │
│    │              │   │  - Financial        │                      │
│    │              │   │  - User growth      │                      │
│    │              │   │  - Hotel performance│                      │
│    │              │   │  - Export CSV/PDF   │                      │
│    │              │   └─────────────────────┘                      │
│    │              │                                                 │
└────┘              │                                                 │
                    └─────────────────────────────────────────────────┘
```

---

## 🔄 Cross-Role Interactions

### Booking Lifecycle (Multi-Role)

```
┌───────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Guest │     │ Receptionist │     │   Manager    │     │ Housekeeping │
└───┬───┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
    │                │                    │                    │
    │ 1. Search Hotels                   │                    │
    │────────>       │                    │                    │
    │                │                    │                    │
    │ 2. Book Room   │                    │                    │
    │────────────────>                    │                    │
    │                │                    │                    │
    │ 3. Payment     │                    │                    │
    │────────────────>                    │                    │
    │                │                    │                    │
    │ 4. Confirmation Email               │                    │
    │<───────────────┘                    │                    │
    │                │                    │                    │
    │ [Arrival Date] │                    │                    │
    │                │                    │                    │
    │ 5. Check-In    │                    │                    │
    │────────────────>│                    │                    │
    │                │                    │                    │
    │                │ 6. Assign Room     │                    │
    │                │────────────────────>│                    │
    │                │                    │                    │
    │                │ 7. Update Status   │                    │
    │                │    (Occupied)      │                    │
    │                │<───────────────────┘                    │
    │                │                    │                    │
    │ 8. Stay Period │                    │                    │
    │   (Order food, │                    │                    │
    │    call waiter)│                    │                    │
    │                │                    │                    │
    │ 9. Check-Out   │                    │                    │
    │────────────────>│                    │                    │
    │                │                    │                    │
    │                │ 10. Process Payment│                    │
    │<───────────────┘                    │                    │
    │                │                    │                    │
    │                │ 11. Update Status  │                    │
    │                │     (Cleaning)     │                    │
    │                │────────────────────────────────────────>│
    │                │                    │                    │
    │                │                    │ 12. Clean Room    │
    │                │                    │<───────────────────┘
    │                │                    │                    │
    │                │                    │ 13. Mark Available│
    │                │<───────────────────────────────────────┘
    │                │                    │                    │
    │ 14. Request Review                  │                    │
    │<───────────────┘                    │                    │
    │                │                    │                    │
    │ 15. Leave Review                    │                    │
    │────────────────>                    │                    │
    │                │                    │                    │
```

### Order Lifecycle (Multi-Role)

```
┌───────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Guest │     │    Waiter    │     │     Chef     │     │   Manager    │
└───┬───┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
    │                │                    │                    │
    │ 1. Browse Menu │                    │                    │
    │────────>       │                    │                    │
    │                │                    │                    │
    │ 2. Place Order │                    │                    │
    │   (Room Service)                    │                    │
    │────────────────>│                    │                    │
    │                │                    │                    │
    │                │ 3. Create KOT      │                    │
    │                │    (Kitchen Order  │                    │
    │                │     Token)         │                    │
    │                │────────────────────>│                    │
    │                │                    │                    │
    │ 4. Order Confirmation               │                    │
    │<───────────────┘                    │                    │
    │                │                    │                    │
    │                │                    │ 5. Acknowledge    │
    │                │                    │<──────────────────>│
    │                │                    │    (Real-time)    │
    │                │                    │                    │
    │                │                    │ 6. Start Preparing│
    │                │                    │────>              │
    │                │                    │                    │
    │ 7. Status: Preparing (Real-time)    │                    │
    │<─────────────────────────────────────                    │
    │                │                    │                    │
    │                │ 8. Waiter notified │                    │
    │                │    (Preparing)     │                    │
    │                │<───────────────────┘                    │
    │                │                    │                    │
    │                │                    │ 9. Complete Dish  │
    │                │                    │────>              │
    │                │                    │                    │
    │                │                    │ 10. Mark as Ready │
    │                │                    │<──────────────────┘
    │                │                    │                    │
    │                │ 11. Notification:  │                    │
    │                │     "Order Ready"  │                    │
    │                │<───────────────────┘                    │
    │                │    (Push + Sound)  │                    │
    │                │                    │                    │
    │ 12. Status: Ready (Real-time)       │                    │
    │<─────────────────────────────────────                    │
    │                │                    │                    │
    │                │ 13. Pickup from    │                    │
    │                │     Kitchen        │                    │
    │                │────────────────────>│                    │
    │                │                    │                    │
    │                │ 14. Deliver to Room                     │
    │<───────────────┘                    │                    │
    │                │                    │                    │
    │                │ 15. Mark Delivered │                    │
    │                │────────────────────────────────────────>│
    │                │                    │                    │
    │ 16. Status: Delivered               │                    │
    │<─────────────────────────────────────                    │
    │                │                    │                    │
```

---

## 🔔 Real-Time Communication Flows

### WebSocket Room Structure

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │      SOCKET.IO SERVER                   │
                    │                                         │
                    └────────────┬────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
          ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
          │Hotel Rooms  │ │Role Rooms │ │User Rooms   │
          └──────┬──────┘ └─────┬─────┘ └──────┬──────┘
                 │               │               │
      ┌──────────┴────────┐     │     ┌─────────┴─────────┐
      │                   │     │     │                   │
┌─────▼─────┐     ┌───────▼────┐│┌────▼────┐     ┌───────▼────┐
│hotel-12345│     │hotel-67890 │││role-chef│     │role-waiter │
└───────────┘     └────────────┘││         │     │            │
│ - All staff     │ - All staff  │└─────────┘     └────────────┘
│   at this hotel │   at this    ││ - All chefs  │ - All waiters
│                 │   hotel      │               │
│ - Order updates │              │               │
│ - Waiter calls  │              │               │
└─────────────────┴──────────────┴───────────────┴─────────────┘
```

### Waiter Call Flow (Real-Time)

```
┌───────┐                  ┌──────────────┐                  ┌──────────────┐
│ Guest │                  │  Socket.io   │                  │   Waiter     │
└───┬───┘                  │    Server    │                  └──────┬───────┘
    │                      └──────┬───────┘                         │
    │                             │                                 │
    │ 1. Click "Call Waiter"      │                                 │
    │    Button                   │                                 │
    │────────────────────────────>│                                 │
    │                             │                                 │
    │                             │ 2. Broadcast to hotel room      │
    │                             │    "hotel-<hotelId>"            │
    │                             │────────────────────────────────>│
    │                             │                                 │
    │                             │ 3. Also broadcast to            │
    │                             │    "role-waiter"                │
    │                             │────────────────────────────────>│
    │                             │                                 │
    │ 4. Confirmation             │                                 │
    │<───────────────────────────┘                                 │
    │   "Waiter notified"         │                                 │
    │                             │                                 │
    │                             │                      5. Receives│
    │                             │                         Alert   │
    │                             │                         (Push,  │
    │                             │                          Sound) │
    │                             │                                ↓│
    │                             │                      6. View Call
    │                             │                         Details │
    │                             │                         - Room # │
    │                             │                         - Time   │
    │                             │                                 │
    │                             │ 7. Acknowledge                  │
    │                             │<────────────────────────────────┘
    │                             │                                 │
    │ 8. Update: "Waiter on way"  │                                 │
    │<───────────────────────────┘                                 │
    │                             │                                 │
    │                             │                      9. Arrive  │
    │                             │                         at Room │
    │                             │                                 │
    │ 10. Waiter arrives          │                                 │
    │<────────────────────────────────────────────────────────────┘
    │                             │                                 │
    │                             │ 11. Mark as Resolved            │
    │                             │<────────────────────────────────┘
    │                             │                                 │
    │ 12. Call closed             │                                 │
    │<───────────────────────────┘                                 │
    │                             │                                 │
```

---

## 📝 Notes

### Diagram Interpretation

- All diagrams use text-based notation for version control compatibility
- Solid lines indicate primary flows
- Dashed lines indicate optional or conditional flows
- Real-time communications are marked with "(Socket.io)" or "(Real-time)"

### System Boundaries

- External actors (users) are shown outside system boxes
- Internal use cases are within system boundaries
- External systems (email, Cloudinary) are shown as separate actors

### Relationships

- **Association**: Direct interaction between actor and use case
- **Include**: Mandatory dependency (use case A always includes B)
- **Extend**: Optional extension (use case A may extend B under conditions)
- **Generalization**: Inheritance (not heavily used in current system)

---

## 🔗 Related Documents

- [Functional Requirements](./functional-requirements.md)
- [Use Case Descriptions](./use-case-descriptions.md) (Detailed textual descriptions)
- [User Roles and Permissions](./user-roles-and-permissions.md)
- [Real-Time Architecture](../02-architecture/real-time-architecture.md)

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete - Comprehensive use case diagrams for all roles
**Reviewed By**: System Architect
**Next Review**: Q2 2026

---

## 📌 Appendix

### Creating New Use Case Diagrams

When adding new features:

1. **Identify Actor**: Which role(s) use this feature?
2. **Define Use Case**: What is the goal?
3. **Map Dependencies**: What other use cases are included/extended?
4. **Add to Diagram**: Update appropriate role section
5. **Check Cross-Role**: Does it affect multiple roles?
6. **Update Real-Time**: Is WebSocket involved?

### Diagram Maintenance

- Update diagrams when adding features
- Keep consistent notation
- Review quarterly for accuracy
- Synchronize with code changes
