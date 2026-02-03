<div align="center">

# 📋 Project Documentation

## **StayHaven**
### Hotel Booking & Order Management System

---

**A Comprehensive Two-Sided Marketplace Platform**  
**for Hospitality Industry Management**

---

**Prepared by:** StayHaven Development Team  
**Contact:** support@stayhaven.com  
**Date:** February 2, 2026

</div>

---

## 📑 Table of Contents

1. [Roles and Responsibilities](#1-roles-and-responsibilities)
2. [Acknowledgement](#2-acknowledgement)
3. [Abstract](#3-abstract)
4. [Introduction](#chapter-1-introduction)
   - 1.1 [Background](#11-background)
   - 1.2 [Objectives](#12-objectives)
   - 1.3 [Purpose, Scope, and Stakeholders](#13-purpose-scope-and-stakeholders)
   - 1.4 [Achievements](#14-achievements)
   - 1.5 [Organization of Report](#15-organization-of-report)
5. [Survey of Technologies](#chapter-2-survey-of-technologies)
   - 2.1 [Introduction](#21-introduction)
   - 2.2 [Review of Similar Projects](#22-review-of-similar-projects)
   - 2.3 [Technologies Used](#23-technologies-used)
6. [Requirements and Analysis](#chapter-3-requirements-and-analysis)
   - 3.1 [Problem Definition](#31-problem-definition)
   - 3.2 [Requirement Specifications](#32-requirement-specifications)
   - 3.3 [Planning and Scheduling](#33-planning-and-scheduling)
   - 3.4 [Software and Hardware Requirements](#34-software-and-hardware-requirements)
   - 3.5 [Preliminary Product Description](#35-preliminary-product-description)
   - 3.6 [Conceptual Models](#36-conceptual-models)
7. [System Design](#chapter-4-system-design)
   - 4.1 [Introduction](#41-introduction)
   - 4.2 [System Design](#42-system-design)
   - 4.3 [Database Design](#43-database-design)
   - 4.4 [Interface Design](#44-interface-design)
   - 4.5 [Summary](#45-summary)
8. [Implementation and Testing](#chapter-5-implementation-and-testing)
   - 5.1 [Implementation Approaches](#51-implementation-approaches)
   - 5.2 [Coding Details and Code Efficiency](#52-coding-details-and-code-efficiency)
   - 5.3 [Testing Approach](#53-testing-approach)
   - 5.4 [Challenges and Solutions](#54-challenges-and-solutions)
   - 5.5 [Test Cases](#55-test-cases)
9. [Results and Discussion](#chapter-6-results-and-discussion)
   - 6.1 [Key Metrics Achieved](#61-key-metrics-achieved)
   - 6.2 [User Documentation](#62-user-documentation)
10. [Conclusions](#chapter-7-conclusions)
    - 7.1 [Conclusion](#71-conclusion)
    - 7.2 [Significance of the System](#72-significance-of-the-system)
    - 7.3 [Limitations of the System](#73-limitations-of-the-system)
    - 7.4 [Future Scope of the Project](#74-future-scope-of-the-project)
11. [References](#references)
12. [Appendices](#appendices)

---

## 1. Roles and Responsibilities

| **Project Name** | Hotel Booking and Order Management System |
|------------------|-------------------------------------------|

### Team Members

| # | Name | Role | Tasks and Responsibilities |
|---|------|------|---------------------------|
| 1 | Citiz Shrestha | Project Leader & Backend Developer | Overall project planning, task allocation, and backend APIs development |
| 2 | Bibek Poudel | Full-Stack Developer | Developed layouts and managed database operations with API integration |
| 3 | Binusha Kandel | UI/UX Designer | Designed user interface layouts and screen flows |
| 4 | Pratikshya Maske | Frontend Developer | Integrated frontend with backend APIs |
| 5 | Sumina Pokhrel | Frontend Developer | Implemented responsive design for different screen sizes |

### Signatures

| Team Member | Signature |
|-------------|-----------|
| 1. Citiz Shrestha | ___________________ |
| 2. Bibek Poudel | ___________________ |
| 3. Binusha Kandel | ___________________ |
| 4. Pratikshya Maske | ___________________ |
| 5. Sumina Pokhrel | ___________________ |

**Signature of Project Guide:** ___________________  
**Date:** 02 February 2026

---

## 2. Acknowledgement

We wish to express our deepest gratitude to our **Project Guide, Tri-Brikam Regmi**, and the management of **Nw Tech** for providing us with the invaluable opportunity to undertake this challenging and enriching project. Their unwavering support, expert guidance, and constant encouragement have been instrumental in the successful completion of this work.

Our sincere thanks also go to our team members for their dedication, collaborative spirit, and hard work throughout the development lifecycle. We are also thankful to our colleagues and the technical staff who assisted us whenever needed.

---

## 3. Abstract

**StayHaven** is a comprehensive, full-stack multi-tenant web application designed to revolutionize hotel management by integrating customer-facing booking services with internal operational control into a single, cohesive platform. The system addresses the critical industry gap of fragmented software solutions by providing a unified ecosystem for hotel administrators, restaurant staff, kitchen personnel, and customers.

The platform features:
- 🏨 **Responsive Customer Portal** - For browsing and booking luxury hotels
- 📊 **Administrative Dashboard** - For managing rooms, staff, inventory, and analytics
- 🍽️ **Restaurant Management Module** - Real-time table and order management
- 👨‍🍳 **Kitchen Order-Tracking Dashboard** - Live order status monitoring

Built using the modern **React.js** library, the application emphasizes a component-based architecture, responsive design, and a user-centric interface. It implements secure, role-based authentication (JWT & OAuth), dynamic theming, and efficient state management.

This project demonstrates proficiency in contemporary web development paradigms, problem-solving through systematic design, and the delivery of a functional, scalable solution that meets both business and user experience objectives within a structured internship framework.

---

## Table of Figures

| Figure No. | Description | Page |
|------------|-------------|------|
| Figure 3.1 | Use Case Diagram for StayHaven | - |
| Figure 4.1 | High-Level System Architecture Diagram | - |
| Figure 4.2 | Hotel Booking Process Flow Chart | - |
| Figure 4.3 | Context-Level Data Flow Diagram (DFD) | - |
| Figure 4.4 | Entity-Relationship Diagram | - |
| Figure 4.5 | Project Development Timeline Gantt Chart | - |
| Figure 4.6 | Core Database Schema Diagram | - |
| Figure 4.7 | Homepage Wireframe | - |
| Figure 6.1 | StayHaven About Page Implementation | - |
| Figure 6.2 | Hotel Detail & Booking Page | - |
| Figure 6.3 | Hotel Admin Dashboard Overview | - |
| Figure 6.4 | Kitchen Order Management Dashboard | - |

---

# CHAPTER 1: INTRODUCTION

## 1.1 Background

The global hospitality industry is undergoing rapid digital transformation, driven by rising customer expectations for seamless online experiences and the operational need for efficiency. Traditionally, hotels rely on a patchwork of disconnected systems:

- **Online Travel Agency (OTA)** bookings
- **Property Management Systems (PMS)**
- Separate solutions for **Point-of-Sale (POS)** in restaurants
- Independent **staff scheduling** systems

This fragmentation leads to:
- ❌ Data silos
- ❌ Manual reconciliation errors
- ❌ Poor inter-departmental communication
- ❌ Degraded guest experience

**StayHaven** is conceived to bridge this gap by offering a unified, cloud-based platform that seamlessly connects the guest journey—from discovery to checkout—with the hotel's internal workflows, thereby enhancing operational transparency, efficiency, and service quality.

## 1.2 Objectives

The primary objectives of the StayHaven project are:

1. **Customer Portal Development** - Design and develop an intuitive, responsive customer portal for discovering and booking hotel accommodations with real-time availability.

2. **Administrative Dashboard** - Create a comprehensive, role-based administrative dashboard empowering hotel managers with tools for end-to-end operations management.

3. **Restaurant Integration** - Implement an integrated restaurant management system encompassing table reservations, dine-in/takeaway orders, and a real-time kitchen display system (KDS) for efficient order flow.

4. **Core Modules** - Develop modules for staff management, billing, inventory tracking, and reporting to centralize hotel operations.

5. **Security Implementation** - Ensure robust security through authentication, authorization, and data protection practices.

6. **Polished UI/UX** - Deliver a polished user interface with consistent design language, supporting both light and dark themes for operational comfort.

## 1.3 Purpose, Scope, and Stakeholders

### 1.3.1 Purpose

The purpose of StayHaven is to consolidate the disparate elements of hotel management into a single, intuitive platform. It aims to:
- Streamline operations
- Reduce manual overhead
- Improve cross-departmental coordination
- Provide guests with a smooth, transparent booking and service experience
- Increase operational efficiency and potential revenue

### 1.3.2 Scope

#### ✅ In-Scope (MVP)

| Module | Features |
|--------|----------|
| **Customer Module** | User registration/login, hotel browsing with filters, detailed hotel/room views, booking with date/guest selection, booking confirmation |
| **Administration Module** | Dashboard analytics, CRUD operations for room inventory, staff management, menu management, booking status management, billing/invoicing |
| **Restaurant Module** | Real-time table status management (Available/Occupied/Reserved), order creation for dine-in and takeaway, order routing to kitchen |
| **Kitchen Module** | Live order queue dashboard, order status lifecycle management (New → Preparing → Ready → Served), special instructions handling |
| **System-Wide Features** | Multi-role authentication (Customer, Staff, Admin), responsive UI, dark/light theme toggling |

#### ❌ Out of Scope (Future Phases)

- Native mobile applications
- Advanced revenue management/yield pricing
- IoT integrations
- Third-party channel manager integrations

### 1.3.3 Target Users and Stakeholders

| User Role | Description |
|-----------|-------------|
| 👤 **Guests/Customers** | End-users who browse and book hotel stays and services via the public website |
| 👔 **Hotel Administrators/Managers** | Primary internal users who oversee all operations via the admin dashboard |
| 🛎️ **Reception/Front Desk Staff** | Handle guest check-in/out and assist with bookings and inquiries |
| 🍽️ **Restaurant Service Staff** | Manage restaurant tables, take guest orders, and input them into the system |
| 👨‍🍳 **Kitchen Staff** | Chefs and cooks who view, prepare, and update the status of food orders |
| 🔧 **System Administrators** | (Future role) IT personnel responsible for system configuration, user role management, and platform health |

## 1.4 Achievements

The project successfully delivered a fully functional prototype meeting all core objectives:

- ✅ Fully responsive customer-facing website with interactive hotel booking flows
- ✅ Feature-rich admin dashboard with modules for rooms, bookings, staff, restaurant, and analytics
- ✅ Real-time, synchronized restaurant and kitchen order management system
- ✅ Secure, role-based authentication system using JWT tokens
- ✅ Polished, responsive user interface with consistent styling and dark/light mode support across all user roles
- ✅ Mock payment gateway integration simulating the complete booking transaction lifecycle

## 1.5 Organization of Report

This document is structured to provide a comprehensive overview of the StayHaven project:

| Chapter | Description |
|---------|-------------|
| **Chapter 2** | Surveys the technologies and existing solutions |
| **Chapter 3** | Details the problem statement and requirement analysis |
| **Chapter 4** | Elaborates the system and database design |
| **Chapter 5** | Discusses implementation strategies, challenges, and testing methodologies |
| **Chapter 6** | Presents results, outputs, and user documentation |
| **Chapter 7** | Concludes with project significance, limitations, and future potential |
| **References & Appendices** | Provide supplementary material |

---

# CHAPTER 2: SURVEY OF TECHNOLOGIES

## 2.1 Introduction

Selecting the appropriate technology stack is crucial for building a scalable, maintainable, and performant application. This chapter reviews existing market solutions and justifies the technological choices made for the StayHaven platform, focusing on modern web development paradigms.

## 2.2 Review of Similar Projects

| Solution Type | Examples | Strengths | Weaknesses |
|--------------|----------|-----------|------------|
| **Traditional PMS** | Oracle Opera PMS | Industry-standard, comprehensive | Monolithic, expensive, poor integration with modern booking engines |
| **Online Booking Platforms** | Booking.com, Agoda | Excellent customer acquisition | Limited operational control, separate extranet tools |
| **Restaurant POS & KDS** | Toast, Square | Effective restaurant management | Isolated from room bookings and guest profiles |
| **All-in-One Cloud PMS** | Cloudbeds | More integrated approach | Cost-prohibitive for smaller establishments, limited customization |

**StayHaven's Differentiation:**
StayHaven distinguishes itself by being a unified, customizable platform built with modern web technologies, targeting a seamless experience from guest booking to kitchen order fulfillment.

## 2.3 Technologies Used

### Frontend Development

| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | v18+ | Component-based architecture, virtual DOM efficiency, SPA development |
| **React Router** | v6 | Client-side routing for seamless navigation |
| **Context API & useReducer** | - | Lightweight global state management for auth, theme, notifications |
| **CSS Modules + CSS Custom Properties** | - | Scoped styles, maintainable code, dynamic theme switching |
| **Lucide React** | - | Consistent, scalable icon set |
| **Vite** | - | Fast development build tool |

### Backend Development

| Technology | Purpose |
|------------|---------|
| **Node.js** | Fast, non-blocking runtime for scalable network applications |
| **Express.js** | Web framework for building RESTful APIs |
| **MongoDB** | NoSQL database for flexible data storage |
| **Mongoose** | MongoDB object modeling for Node.js |
| **JWT (JSON Web Tokens)** | Securing API endpoints and stateless session management |
| **OAuth 2.0 (Google)** | Social login/signup integration |
| **Socket.io** | Real-time bidirectional communication |
| **Cloudinary** | Cloud-based image management |
| **Nodemailer** | Email notification service |

### Development & Quality Assurance

| Tool | Purpose |
|------|---------|
| **Git & GitHub** | Version control and collaborative development |
| **ESLint & Prettier** | Code style enforcement and error detection |
| **React Toastify** | User-friendly notification system |

---

# CHAPTER 3: REQUIREMENTS AND ANALYSIS

## 3.1 Problem Definition

The core problem identified is the operational inefficiency caused by using multiple, disconnected software systems in a hotel environment. This leads to:

| Problem | Impact |
|---------|--------|
| **Data Redundancy & Errors** | Manual entry of guest details into PMS, POS, and billing systems |
| **Poor Communication** | Kitchen unaware of rush hours from hotel bookings; reception unaware of restaurant delays |
| **Guest Experience Friction** | Guests receive disparate bills for rooms and services; staff lack 360-degree view of guests |
| **Limited Real-Time Visibility** | Managers cannot get unified, real-time view of occupancy, restaurant revenue, or staff performance |
| **High Operational Cost** | Licensing and maintaining multiple software systems |

## 3.2 Requirement Specifications

### 3.2.1 Functional Requirements

#### FR1: User Authentication & Authorization

| ID | Requirement |
|----|-------------|
| FR1.1 | The system shall allow users to register and log in via email/password |
| FR1.2 | The system shall allow users to log in via Google OAuth |
| FR1.3 | The system shall enforce role-based access control (Customer, Staff, Admin) |

#### FR2: Customer Booking Management

| ID | Requirement |
|----|-------------|
| FR2.1 | The system shall allow customers to browse hotels with filters (location, dates, price) |
| FR2.2 | The system shall display detailed hotel pages with images, amenities, and room options |
| FR2.3 | The system shall allow customers to select dates, rooms, and guests to make a booking |
| FR2.4 | The system shall generate a booking confirmation with a unique reference number |

#### FR3: Hotel Administration

| ID | Requirement |
|----|-------------|
| FR3.1 | The system shall provide an admin dashboard showing key metrics (occupancy, revenue, orders) |
| FR3.2 | The system shall allow admins to Create, Read, Update, Delete (CRUD) room inventory |
| FR3.3 | The system shall allow admins to view and manage all guest bookings |
| FR3.4 | The system shall allow admins to manage staff records and roles |

#### FR4: Restaurant & Service Management

| ID | Requirement |
|----|-------------|
| FR4.1 | The system shall allow staff to view and update the status of restaurant tables |
| FR4.2 | The system shall allow staff to create orders for dine-in (linked to a table) and takeaway |
| FR4.3 | The system shall send new orders instantly to the kitchen display |

#### FR5: Kitchen Operations

| ID | Requirement |
|----|-------------|
| FR5.1 | The system shall provide a dashboard showing all active orders categorized by status |
| FR5.2 | The system shall allow kitchen staff to update the status of an order (Accepted, Preparing, Ready) |
| FR5.3 | The system shall notify restaurant staff when an order is marked "Ready" |

### 3.2.2 Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Critical pages (homepage, booking) shall load in under 3 seconds on a standard 3G connection |
| **Usability** | The system shall be intuitive enough for staff to be proficient with less than 2 hours of training. It shall follow WCAG 2.1 Level AA guidelines for accessibility |
| **Reliability** | The booking engine shall have 99% uptime during peak booking seasons |
| **Security** | All sensitive data (passwords, PII) shall be encrypted in transit (HTTPS) and at rest. The system shall be protected against common web vulnerabilities (XSS, CSRF, SQL Injection) |
| **Scalability** | The frontend architecture shall support future addition of new modules without major refactoring |
| **Responsiveness** | The UI shall be fully functional and legible on viewports from 320px (mobile) to 1920px (desktop) and above |

## 3.3 Planning and Scheduling

### 3.3.1 Planning

The project followed an Agile-inspired, iterative approach with four major phases:

| Phase | Weeks | Focus Area |
|-------|-------|------------|
| **Phase 1** | 1-4 | Foundation & Core Booking: Setup, authentication, customer hotel browsing, and booking flow |
| **Phase 2** | 5-7 | Admin Core & Database: Admin dashboard, room management, and backend/database connection |
| **Phase 3** | 8-10 | Operations Modules: Restaurant table management, order creation, and kitchen dashboard |
| **Phase 4** | 11-12 | Polish & Integration: Billing, reporting, theme implementation, testing, and final integration |

### 3.3.2 Scheduling

Development was tracked in 2-week sprints. Weekly team syncs were held to review progress, address blockers, and adjust tasks. The final week was dedicated exclusively to integration testing, bug fixing, and documentation.

```
Week 1-2:   [████████████████████] Project Setup & Authentication
Week 3-4:   [████████████████████] Hotel Browsing & Booking Flow
Week 5-6:   [████████████████████] Admin Dashboard Core
Week 7:     [██████████] Room & Staff Management
Week 8-9:   [████████████████████] Restaurant Module
Week 10:    [██████████] Kitchen Dashboard
Week 11:    [██████████] Billing & Reports
Week 12:    [██████████] Testing & Documentation
```

## 3.4 Software and Hardware Requirements

### 3.4.1 Hardware Requirements

| Environment | Specifications |
|-------------|---------------|
| **Development** | Intel i5 processor or equivalent, 8GB RAM, 256GB SSD |
| **Production (Recommended)** | Cloud-based virtual machines (AWS EC2, DigitalOcean Droplet) with load balancing capabilities for high availability |

### 3.4.2 Software Requirements

| Category | Requirements |
|----------|--------------|
| **Frontend** | Node.js (v16+), modern web browser (Chrome 90+, Firefox 88+, Safari 14+) |
| **Backend** | Node.js runtime, Express.js framework |
| **Database** | MongoDB |
| **Version Control** | Git |
| **Design & Prototyping** | Figma/Adobe XD (for wireframes) |

## 3.5 Preliminary Product Description

**StayHaven** is a unified web-based platform that serves as the digital nexus for a luxury hotel's operations. It presents guests with an elegant booking interface while empowering hotel staff with integrated tools for managing reservations, rooms, food & beverage services, and personnel—all through a single, secure login.

## 3.6 Conceptual Models

### Use Case Diagram

**Primary Actors:**
- Customer
- Hotel Admin
- Restaurant Staff
- Kitchen Staff

**Core Use Cases:**
- Register/Login
- Browse Hotels
- Book Room
- Manage Room Inventory
- Create Restaurant Order
- Update Kitchen Order Status
- Generate Bill
- View Dashboard Reports

```
┌─────────────────────────────────────────────────────────────────┐
│                        StayHaven System                         │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Browse    │    │    Book     │    │   Manage    │         │
│  │   Hotels    │    │    Room     │    │   Profile   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│  ┌─────────────┐    ┌──────┴──────┐    ┌─────────────┐         │
│  │   Manage    │    │   Manage    │    │   Manage    │         │
│  │   Rooms     │    │  Bookings   │    │   Staff     │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│  ┌─────────────┐    ┌──────┴──────┐    ┌─────────────┐         │
│  │   Create    │    │   Update    │    │  Generate   │         │
│  │   Orders    │    │Order Status │    │    Bill     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

     👤              👔              🍽️              👨‍🍳
  Customer      Hotel Admin    Restaurant Staff   Kitchen Staff
```

*Figure 3.1: Use Case Diagram for StayHaven*

---

# CHAPTER 4: SYSTEM DESIGN

## 4.1 Introduction

This chapter translates the requirements into a concrete technical blueprint. The design emphasizes modularity, scalability, and a clear separation of concerns between the frontend presentation layer and backend data/API layer.

## 4.2 System Design

### 4.2.1 System Architecture Diagram

StayHaven follows a **Client-Server Architecture** with a React Single Page Application (SPA) as the client and a Node.js/Express API server.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     React.js SPA (Frontend)                        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │Customer │ │  Admin  │ │  Staff  │ │ Kitchen │ │  Auth   │     │  │
│  │  │ Portal  │ │Dashboard│ │  Panel  │ │Dashboard│ │ Module  │     │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 Node.js + Express.js (Backend)                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │  Auth   │ │ Hotels  │ │Bookings │ │ Orders  │ │  Staff  │     │  │
│  │  │ Routes  │ │ Routes  │ │ Routes  │ │ Routes  │ │ Routes  │     │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │              Middleware (Auth, Validation, Error)            │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Mongoose ODM
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         MongoDB Database                           │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │  Users  │ │ Hotels  │ │Bookings │ │ Orders  │ │  Rooms  │     │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Cloudinary  │  │  Google     │  │ Nodemailer  │  │  Socket.io  │    │
│  │  (Images)   │  │   OAuth     │  │  (Email)    │  │ (Real-time) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

*Figure 4.1: High-Level System Architecture Diagram*

### 4.2.2 Flow Chart

**Hotel Booking Process Flow:**

```
┌─────────────────┐
│      START      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Browse Hotels  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Select Hotel   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Details & │
│Check Availability│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Select Dates &   │
│    Guests       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate Price │
│    & Taxes      │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────┐
│   User Logged In?   │────▶│ Login/Register  │
└──────────┬──────────┘ No  └────────┬────────┘
           │ Yes                     │
           ▼                         │
┌─────────────────┐◀─────────────────┘
│ Enter Guest     │
│    Details      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Choose Add-ons  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Booking  │
│    Summary      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Proceed to    │
│  (Mock) Payment │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────┐
│  Payment Success?   │────▶│Show Error/Retry │
└──────────┬──────────┘ No  └─────────────────┘
           │ Yes
           ▼
┌─────────────────┐
│    Generate     │
│   Confirmation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Email     │
│  (Simulated)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│       END       │
└─────────────────┘
```

*Figure 4.2: Hotel Booking Process Flow Chart*

### 4.2.3 Data Flow Diagram (DFD)

**Context-Level DFD:**

```
                              ┌─────────────┐
                              │   Customer  │
                              └──────┬──────┘
                                     │
              Booking Request        │        Confirmation/Receipt
              Login Credentials      │
                                     ▼
┌─────────────┐             ┌─────────────────────┐             ┌─────────────┐
│Hotel Staff  │◀───────────▶│   StayHaven         │◀───────────▶│  Payment    │
│             │             │   Platform          │             │  Gateway    │
└─────────────┘             └─────────────────────┘             │  (Mock)     │
 Management Commands                 │                          └─────────────┘
 Order Details                       │                           Payment Request
 Dashboard Data                      │                           Payment Status
 Order Alerts                        │
                                     ▼
                              ┌─────────────┐
                              │  Database   │
                              │  (MongoDB)  │
                              └─────────────┘
```

*Figure 4.3: Context-Level Data Flow Diagram (DFD)*

### 4.2.4 Entity-Relationship (ER) Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│     USER     │         │    HOTEL     │         │     ROOM     │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ _id (PK)     │         │ _id (PK)     │         │ _id (PK)     │
│ email        │         │ name         │         │ hotel_id(FK) │
│ password     │    1:M  │ location     │    1:M  │ room_number  │
│ full_name    │◀───────▶│ description  │◀───────▶│ type         │
│ role         │         │ amenities[]  │         │ price        │
│ avatar       │         │ images[]     │         │ status       │
│ created_at   │         │ rating       │         │ capacity     │
└──────┬───────┘         └──────────────┘         └──────┬───────┘
       │                                                  │
       │ 1:M                                              │ 1:1
       ▼                                                  ▼
┌──────────────┐                                 ┌──────────────┐
│   BOOKING    │◀────────────────────────────────│              │
├──────────────┤          reserves               │              │
│ _id (PK)     │                                 │              │
│ user_id (FK) │                                 │              │
│ room_id (FK) │                                 │              │
│ check_in     │                                 │              │
│ check_out    │                                 │              │
│ total_amount │                                 │              │
│ status       │                                 │              │
│ guests       │                                 │              │
└──────────────┘                                 └──────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    ORDER     │         │  MENU_ITEM   │         │ HOTEL_TABLE  │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ _id (PK)     │    M:M  │ _id (PK)     │         │ _id (PK)     │
│ table_id(FK) │◀───────▶│ name         │         │ hotel_id(FK) │
│ type         │         │ category     │         │ table_number │
│ status       │         │ price        │         │ capacity     │
│ items[]      │         │ description  │         │ status       │
│ total_amount │         │ image        │         │ qr_code      │
│ placed_at    │         │ available    │         └──────────────┘
└──────────────┘         └──────────────┘
```

*Figure 4.4: Entity-Relationship Diagram*

### 4.2.5 Gantt Chart

```
Task                          Week 1-2  Week 3-4  Week 5-6  Week 7  Week 8-9  Week 10  Week 11  Week 12
─────────────────────────────────────────────────────────────────────────────────────────────────────────
Project Setup                 ████████
Authentication System         ████████  ████████
Hotel Browsing UI                       ████████
Booking Flow                            ████████  ████████
Admin Dashboard Core                              ████████  ████████
Room Management                                             ████████
Staff Management                                            ████████
Restaurant Module                                                     ████████
Kitchen Dashboard                                                               ████████
Order Management                                                      ████████  ████████
Billing & Reports                                                                         ████████
Theme Implementation                                                                      ████████
Testing                                 ──────────────────────────────────────────────────────────────
Documentation                                                                                       ████████
─────────────────────────────────────────────────────────────────────────────────────────────────────────
```

*Figure 4.5: Project Development Timeline Gantt Chart*

## 4.3 Database Design

### Core Database Schema

The database uses MongoDB with Mongoose ODM, designed for flexibility and handling relationships between users, bookings, and operational data.

#### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed),
  fullName: String,
  role: String (enum: ['customer', 'staff', 'admin', 'superadmin']),
  avatar: String (URL),
  phone: String,
  isEmailVerified: Boolean,
  googleId: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

#### Hotels Collection

```javascript
{
  _id: ObjectId,
  name: String (required),
  location: {
    address: String,
    city: String,
    country: String,
    coordinates: { lat: Number, lng: Number }
  },
  description: String,
  amenities: [String],
  images: [String (URLs)],
  rating: Number (1-5),
  priceRange: { min: Number, max: Number },
  owner: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

#### Rooms Collection

```javascript
{
  _id: ObjectId,
  hotel: ObjectId (ref: 'Hotel'),
  roomNumber: String,
  type: String (enum: ['single', 'double', 'suite', 'deluxe']),
  price: Number,
  capacity: Number,
  amenities: [String],
  images: [String],
  status: String (enum: ['available', 'booked', 'maintenance']),
  createdAt: Date
}
```

#### Bookings Collection

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),
  room: ObjectId (ref: 'Room'),
  hotel: ObjectId (ref: 'Hotel'),
  checkIn: Date,
  checkOut: Date,
  guests: { adults: Number, children: Number },
  totalAmount: Number,
  status: String (enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled']),
  paymentStatus: String,
  specialRequests: String,
  createdAt: Date
}
```

#### Orders Collection

```javascript
{
  _id: ObjectId,
  hotel: ObjectId (ref: 'Hotel'),
  table: ObjectId (ref: 'HotelTable', nullable),
  orderType: String (enum: ['dine-in', 'takeaway', 'room-service']),
  items: [{
    menuItem: ObjectId (ref: 'MenuItem'),
    quantity: Number,
    specialInstructions: String
  }],
  status: String (enum: ['new', 'accepted', 'preparing', 'ready', 'served', 'completed']),
  totalAmount: Number,
  placedAt: Date,
  completedAt: Date
}
```

*Figure 4.6: Core Database Schema*

## 4.4 Interface Design

### UI/UX Considerations

| Principle | Implementation |
|-----------|----------------|
| **Consistency** | Unified color palette (teal/blue primary) and typography (sans-serif) throughout |
| **Feedback** | Interactive elements provide visual feedback (hover states, loading spinners, toast notifications) |
| **Efficiency** | Admin interfaces prioritize information density and quick actions; kitchen interface emphasizes clarity and speed |
| **Accessibility** | Sufficient color contrast, semantic HTML tags, and ARIA labels |
| **Responsiveness** | Mobile-first design approach with breakpoints at 320px, 768px, 1024px, and 1920px |

### Key Screen Wireframes

**Homepage Wireframe:**
- Hero section with search bar
- Featured hotels grid
- Destination highlights
- User testimonials

**Hotel Detail Page:**
- Image gallery carousel
- Amenity icons grid
- Sticky booking widget
- Room options list

**Admin Dashboard:**
- Sidebar navigation
- Summary metric cards
- Data tables with filters
- Action buttons

**Kitchen Dashboard:**
- Card-based order queue
- Large status buttons
- Timer for each order
- Category filters

*Figure 4.7: Key Interface Wireframes*

## 4.5 Summary

The system design establishes a robust foundation for development. The modular frontend, well-defined API layer, and normalized database schema ensure the platform is scalable, maintainable, and capable of supporting the complex workflows of a modern hotel.

---

# CHAPTER 5: IMPLEMENTATION AND TESTING

## 5.1 Implementation Approaches

The project was executed using an **Agile-inspired, component-driven development** methodology. The frontend was built first as a functional prototype with mock data, followed by integration with the backend API.

### Technology Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, React Router v6, Context API, CSS Modules, Vite |
| **Backend** | Node.js, Express.js, JWT, OAuth 2.0 |
| **Database** | MongoDB with Mongoose ODM |
| **Real-time** | Socket.io |
| **External Services** | Cloudinary (images), Nodemailer (email), Google OAuth |

## 5.2 Coding Details and Code Efficiency

### 5.2.1 Code Efficiency Strategies

| Strategy | Implementation |
|----------|----------------|
| **Modular Components** | UI broken into small, reusable components (BookingCard, AmenityIcon, StatusBadge) |
| **Custom Hooks** | Logic abstracted into custom hooks (useFetchHotels, useLocalStorage, useAuth) |
| **Lazy Loading** | React.lazy() and Suspense for route-based code splitting |
| **Optimized Rendering** | React.memo() to prevent unnecessary re-renders |
| **CSS Efficiency** | CSS Modules for scoped styles, CSS Custom Properties for runtime theming |
| **Asset Optimization** | Image compression, WebP format support, lazy loading for images |

### 5.2.2 Project Structure

```
Backend/
├── config/
│   ├── cloudinary.js      # Image upload configuration
│   ├── db.js              # MongoDB connection
│   ├── nodemailer.js      # Email service setup
│   └── socket.js          # Real-time communication
├── controllers/
│   ├── authController.js  # Authentication logic
│   ├── hotelController.js # Hotel CRUD operations
│   ├── orderController.js # Order management
│   └── ...
├── middleware/
│   ├── authMiddleware.js  # JWT verification
│   └── upload.js          # File upload handling
├── models/
│   ├── user.schema.js     # User data model
│   ├── hotel.schema.js    # Hotel data model
│   └── ...
├── routes/
│   ├── authRoutes.js      # Auth endpoints
│   ├── hotelRoutes.js     # Hotel endpoints
│   └── ...
└── server.js              # Application entry point

frontend/
├── src/
│   ├── api/               # API service functions
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── routes/            # Route definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
└── index.html             # Entry HTML
```

## 5.3 Testing Approach

Testing was conducted iteratively throughout development.

### 5.3.1 Unit Testing

| Focus | Tools | Description |
|-------|-------|-------------|
| Components | Jest, React Testing Library | Verify components render correctly with given props |
| Utilities | Jest | Test utility functions for expected outputs |
| Hooks | React Hooks Testing Library | Ensure custom hooks behave correctly |

### 5.3.2 Integration Testing

Key user flows tested:
- ✅ Complete booking journey from hotel selection to confirmation
- ✅ Admin adding a new room and seeing it appear in the list
- ✅ Creating a restaurant order and its appearance in kitchen dashboard
- ✅ User registration and login flow
- ✅ Role-based access control enforcement

### 5.3.3 System Testing

| Test Type | Description |
|-----------|-------------|
| **Functional Testing** | All requirements from Chapter 3 validated |
| **Cross-Browser Testing** | Consistent behavior in Chrome, Firefox, and Safari |
| **Responsive Testing** | UI adaptability across various screen sizes |
| **Performance Testing** | Lighthouse audits for load time, accessibility, best practices |

## 5.4 Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| **Complex Shared State** | Implemented centralized state management using React Context API + useReducer, creating specific contexts for Auth, Theme, and Notifications |
| **Real-time Updates** | Used Socket.io for real-time order status updates between Restaurant and Kitchen dashboards |
| **Responsive Data Tables** | Implemented horizontal scroll container for tables on small screens with touch-friendly action buttons |
| **Dark/Light Theme** | Defined core CSS Custom Properties (--color-bg, --color-text) with Theme Provider context toggling values |
| **File Upload Management** | Integrated Cloudinary for cloud-based image storage with automatic optimization |

## 5.5 Test Cases

### Authentication Test Cases

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC001 | User registration with valid data | Account created successfully | ✅ Pass |
| TC002 | User registration with existing email | Error message displayed | ✅ Pass |
| TC003 | Login with valid credentials | Redirect to dashboard | ✅ Pass |
| TC004 | Login with invalid credentials | Error message displayed | ✅ Pass |
| TC005 | Google OAuth login | Successful authentication | ✅ Pass |

### Booking Test Cases

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC006 | Search hotels by location | Filtered results displayed | ✅ Pass |
| TC007 | View hotel details | All information displayed | ✅ Pass |
| TC008 | Select dates and guests | Price calculated correctly | ✅ Pass |
| TC009 | Complete booking | Confirmation generated | ✅ Pass |
| TC010 | Cancel booking | Status updated correctly | ✅ Pass |

### Admin Test Cases

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC011 | Add new room | Room appears in list | ✅ Pass |
| TC012 | Update room details | Changes reflected | ✅ Pass |
| TC013 | Delete room | Room removed from list | ✅ Pass |
| TC014 | Add staff member | Staff appears in list | ✅ Pass |
| TC015 | View dashboard analytics | Metrics displayed correctly | ✅ Pass |

### Restaurant/Kitchen Test Cases

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC016 | Create dine-in order | Order appears in kitchen | ✅ Pass |
| TC017 | Update order status | Status synced in real-time | ✅ Pass |
| TC018 | Mark order ready | Notification sent to staff | ✅ Pass |
| TC019 | Update table status | Status reflected immediately | ✅ Pass |
| TC020 | View active orders | All orders categorized correctly | ✅ Pass |

---

# CHAPTER 6: RESULTS AND DISCUSSION

The StayHaven project has successfully culminated in a fully functional, interactive prototype that meets its outlined objectives. The platform is stable, responsive, and ready for demonstration.

## 6.1 Key Metrics Achieved

| Metric | Target | Achieved |
|--------|--------|----------|
| **Performance Score** | >80 | 90+ (Lighthouse) |
| **Accessibility Score** | >80 | 90+ (Lighthouse) |
| **Best Practices** | >80 | 90+ (Lighthouse) |
| **Responsive Coverage** | 320px - 1920px | ✅ Verified |
| **Functional Requirements** | 100% MVP | ✅ Complete |
| **Cross-Browser Support** | Chrome, Firefox, Safari | ✅ Verified |

### Demonstration of Objectives Met

| Objective | Feature Implemented | Status |
|-----------|---------------------|--------|
| Customer Portal | Hotel browsing, filtering, booking flow | ✅ Complete |
| Admin Dashboard | Analytics, room/staff management | ✅ Complete |
| Restaurant Management | Table status, order creation | ✅ Complete |
| Kitchen Dashboard | Real-time order queue, status updates | ✅ Complete |
| Security | JWT auth, role-based access, OAuth | ✅ Complete |
| UI/UX | Responsive design, dark/light themes | ✅ Complete |

### Screenshots of Working System

*Figure 6.1: StayHaven About Page Implementation*
> Shows the marketing/landing page with hero section, company values, and team information.

*Figure 6.2: Hotel Detail & Booking Page*
> Displays the hotel image gallery, amenity list, and the interactive booking widget with date picker and price calculation.

*Figure 6.3: Hotel Admin Dashboard Overview*
> Illustrates the main admin view with statistics cards, a chart, and a recent bookings table with status badges.

*Figure 6.4: Kitchen Order Management Dashboard*
> Shows the real-time order queue with cards, filter tabs (All/New/Preparing/Ready), and large action buttons for updating status.

## 6.2 User Documentation

### Quick Start Guide for Key Users

#### 👤 For Guests

1. Visit the StayHaven homepage
2. Use the search bar or browse featured hotels
3. Click on a hotel to see details, photos, and room options
4. Select your check-in/check-out dates and number of guests
5. Click **"Book Now"**, log in or register, and follow the steps to confirm your booking
6. Your confirmation number will be displayed and emailed

#### 👔 For Hotel Administrators

1. Log in with your admin credentials
2. You will land on the dashboard showing key metrics
3. Use the sidebar to navigate:
   - **Rooms** - Manage inventory
   - **Bookings** - View reservations
   - **Staff** - Manage employees
   - **Restaurant** - Oversee service
4. In any management section, use **"Add New"** or **"Edit"** buttons to modify records

#### 👨‍🍳 For Kitchen Staff

1. Log in to the Kitchen Dashboard
2. New orders appear in the **"New"** tab
3. Click **"Accept & Start"** to begin preparation
4. Update status as you progress (Preparing → Ready)
5. Click **"Mark as Ready"** when finished
6. Order moves to **"Ready"** column for pickup by service staff

---

# CHAPTER 7: CONCLUSIONS

## 7.1 Conclusion

The StayHaven project has been a significant undertaking that successfully demonstrates the design, development, and integration of a comprehensive hotel management platform. From conceptualization to a working prototype, the project has applied modern web development principles to solve a real-world industry problem of operational fragmentation.

The resulting application seamlessly blends a customer booking portal with powerful internal management tools, validating the feasibility and utility of a unified system.

## 7.2 Significance of the System

StayHaven holds significance as:

| Significance | Description |
|--------------|-------------|
| **Proof-of-Concept** | Demonstrates integrated hospitality management with improved efficiency over disconnected systems |
| **Learning Artifact** | Embodies full-stack development skills, system design, and agile project execution |
| **Potential Business Solution** | Can be extended into a market-ready product for boutique hotels or chains |
| **Foundation for Research** | Enables further development in real-time analytics, IoT integration, and AI-driven personalization |

## 7.3 Limitations of the System

As a prototype developed within a constrained timeline, StayHaven has certain limitations:

| # | Limitation | Description |
|---|------------|-------------|
| 1 | **Backend Integration** | The current frontend uses mock API calls in some areas. A full production-ready backend needs optimization |
| 2 | **Scalability & Security** | While architecture is designed for scale, actual load balancing and advanced security audits have not been performed |
| 3 | **Feature Completeness** | Advanced features like dynamic pricing, channel management, integrated accounting are not present |
| 4 | **Payment Integration** | Currently uses mock payment gateway; real payment provider integration needed |

## 7.4 Future Scope of the Project

The project lays a strong groundwork for numerous future enhancements:

| # | Enhancement | Description |
|---|-------------|-------------|
| 1 | **Full Backend Optimization** | Building a robust, optimized backend with caching and CDN integration |
| 2 | **Real-Time Communication** | Implementing WebSockets or GraphQL Subscriptions for live updates |
| 3 | **Mobile Applications** | Developing cross-platform mobile apps using React Native |
| 4 | **Advanced Analytics** | Integrating charting libraries (D3.js, Recharts) for business intelligence |
| 5 | **Payment Gateway** | Partnering with providers like Stripe or Razorpay for real transactions |
| 6 | **AI/ML Features** | Recommendation engines, chatbots, and predictive analytics |
| 7 | **IoT Integration** | Connecting with smart locks, thermostats, and in-room tablets |
| 8 | **Multi-language Support** | Internationalization for global market expansion |

---

# REFERENCES

1. React Documentation. (2023). *Main Concepts – React*. https://reactjs.org/docs/getting-started.html

2. MDN Web Docs. (2023). *JavaScript Guide*. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide

3. W3C. (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*. https://www.w3.org/TR/WCAG21/

4. Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* [Doctoral dissertation, University of California, Irvine].

5. MongoDB, Inc. (2023). *MongoDB Documentation*. https://www.mongodb.com/docs/

6. Express.js. (2023). *Express - Node.js web application framework*. https://expressjs.com/

7. Vite. (2023). *Next Generation Frontend Tooling*. https://vitejs.dev/

8. Socket.io. (2023). *Bidirectional and low-latency communication*. https://socket.io/docs/

9. Cloudinary. (2023). *Image and Video API Platform*. https://cloudinary.com/documentation

10. JSON Web Tokens. (2023). *Introduction to JSON Web Tokens*. https://jwt.io/introduction

---

# APPENDICES

## Appendix A: API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Hotel Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hotels` | Get all hotels |
| GET | `/api/hotels/:id` | Get hotel by ID |
| POST | `/api/hotels` | Create new hotel (Admin) |
| PUT | `/api/hotels/:id` | Update hotel (Admin) |
| DELETE | `/api/hotels/:id` | Delete hotel (Admin) |

### Room Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get all rooms |
| GET | `/api/rooms/:id` | Get room by ID |
| POST | `/api/rooms` | Create new room (Admin) |
| PUT | `/api/rooms/:id` | Update room (Admin) |
| DELETE | `/api/rooms/:id` | Delete room (Admin) |

### Booking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Get user bookings |
| POST | `/api/bookings` | Create booking |
| PUT | `/api/bookings/:id` | Update booking status |
| DELETE | `/api/bookings/:id` | Cancel booking |

### Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:id/status` | Update order status |
| GET | `/api/orders/kitchen` | Get kitchen orders |

## Appendix B: Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/stayhaven

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Appendix C: Installation Guide

### Prerequisites

- Node.js v16+ installed
- MongoDB installed and running
- Git installed

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/stayhaven/hotel-booking-system.git

# Navigate to backend directory
cd hotel-booking-order-management-system/Backend

# Install dependencies
npm install

# Create .env file and configure environment variables
cp .env.example .env

# Start the development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Documentation:** http://localhost:5000/api-docs

---

<div align="center">

**© 2026 StayHaven Development Team. All Rights Reserved.**

*This document is confidential and intended for internal use only.*

</div>
