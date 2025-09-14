# 🚀 Church App Tech Stack Documentation

## Overview
The Church App is a modern full-stack application designed to strengthen church community bonds through social networking, spiritual support, communication, and organization features. This document outlines the complete technology stack used in the project.

## Architecture
- **Full-Stack Architecture**: Separate frontend and backend with REST API communication
- **Real-time Features**: WebSocket integration for chat functionality
- **Mobile-First Design**: Capacitor enables native mobile app deployment
- **Cloud-Ready**: AWS S3 integration for file storage

---

## Backend Tech Stack 🏗️

### Core Framework & Language
- **Java 17** - Programming language
- **Spring Boot 3.2.0** - Main application framework
- **Maven** - Build and dependency management tool

### Spring Boot Modules
- **Spring Web** - RESTful API development
- **Spring Data JPA** - Database ORM with Hibernate
- **Spring Security** - Authentication and authorization
- **Spring WebSocket** - Real-time communication
- **Spring OAuth2 Client** - Google OAuth2 integration
- **Spring Validation** - Input validation
- **Spring Boot Actuator** - Application monitoring and health checks

### Database
- **PostgreSQL** (production database)
- **H2 Database** (development/embedded database)
- **Flyway** (database migrations)

### Security & Authentication
- **JWT (JSON Web Tokens)** - Session management
- **Google OAuth2** - Social login
- **Spring Security** - Comprehensive security framework

### Additional Libraries
- **Lombok** - Reduces Java boilerplate code
- **AWS S3 SDK** - File storage and uploads
- **JJWT** - JWT token handling

---

## Frontend Tech Stack 💻

### Core Framework
- **React 19.1.1** - Main UI library
- **TypeScript 4.9.5** - Type-safe JavaScript
- **React Scripts 5.0.1** - Build tooling and development server

### Routing & Navigation
- **React Router DOM 7.8.2** - Client-side routing

### State Management & Data Fetching
- **TanStack React Query 5.87.1** - Server state management and caching
- **Axios 1.11.0** - HTTP client for API requests

### Forms & UI Components
- **React Hook Form 7.62.0** - Form state management
- **React DatePicker 8.7.0** - Date selection component

### Real-time Communication
- **STOMP.js 7.1.1** & **SockJS Client** - WebSocket communication for chat features

### Mobile Deployment
- **Capacitor 7.4.3** - Cross-platform mobile app framework (iOS/Android)

---

## Infrastructure & DevOps 🛠️

### Containerization
- **Docker** & **Docker Compose** - Container orchestration (PostgreSQL service defined)

### Development Tools
- **H2 Console** - Database browser for development
- **Spring Boot DevTools** (implied by configuration)

---

## Key Features Enabled by Tech Stack 🎯

### Authentication & Security
- JWT-based session management
- Google OAuth2 social login
- Role-based access control (member, admin, moderator)
- Secure file uploads via AWS S3

### Real-time Communication
- WebSocket connections for live chat
- STOMP protocol for message brokering
- Real-time updates across connected clients

### Database & Persistence
- JPA/Hibernate ORM for object-relational mapping
- Database migrations with Flyway
- Support for both development (H2) and production (PostgreSQL) databases

### Mobile & Cross-Platform
- Capacitor for native iOS and Android app deployment
- React-based responsive web interface
- Consistent user experience across platforms

### Development Experience
- TypeScript for type safety and better developer experience
- React Query for efficient server state management
- Hot reloading and development servers
- Comprehensive testing frameworks

---

## Configuration & Environment

### Backend Configuration
- **Port**: 8083
- **Context Path**: `/api`
- **Database**: H2 (development) / PostgreSQL (production)
- **JWT Expiration**: 24 hours (86400000ms)
- **File Upload Limit**: 10MB per file

### Frontend Configuration
- **Development Server**: Standard React development server
- **Build Tool**: Create React App
- **API Base URL**: Configurable for different environments

### CORS Configuration
- Allowed origins: localhost:3000, localhost:3001, localhost:8100, capacitor://localhost
- Supports credentials and comprehensive HTTP methods

---

## Deployment Considerations 📦

### Development Environment
- Local H2 database with file-based persistence
- Hot reloading for both frontend and backend
- Docker Compose for PostgreSQL when needed

### Production Environment
- PostgreSQL database
- AWS S3 for file storage
- Environment variables for sensitive configuration
- Optimized React builds for performance

### Mobile Deployment
- Capacitor build process for iOS/Android
- Native app store distribution capability
- Platform-specific optimizations

---

## Future Extensibility 🔮

This tech stack provides a solid foundation for:
- **Scalability**: Spring Boot and React can handle growing user bases
- **Feature Expansion**: Modular architecture supports new features
- **Performance**: React Query caching and Spring Boot optimizations
- **Security**: Comprehensive security frameworks in place
- **Cross-Platform**: Mobile and web deployment from single codebase

---

*Last Updated: September 14, 2025*
*Document Version: 1.0*
