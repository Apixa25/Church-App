# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Church App project - a cross-platform mobile application for church community building, designed to strengthen bonds through social networking, spiritual support, communication, and organization features.

## Tech Stack
**Frontend (Mobile):**
- React with hooks for UI components
- CSS-in-JS (styled-components preferred) for theming
- Capacitor for cross-platform iOS/Android deployment
- React Router for navigation
- Axios/Fetch for API requests
- Socket.io Client for real-time updates
- React Query for state management and caching
- React-Datepicker for date selection
- React Hook Form for form handling

**Backend:**
- Java with Spring Boot for REST API
- Spring Security for authentication/authorization (roles: member, admin, moderator)
- Spring WebSocket for real-time features
- Spring Data JPA with Hibernate for database ORM
- Lombok for reducing boilerplate code
- JWT for session tokens
- Spring Boot Actuator for monitoring

**Database:**
- PostgreSQL with UUID primary keys
- Soft deletes (deleted_at field) where appropriate
- Timestamps for auditing

**Key Integrations:**
- Google OAuth 2.0 for authentication
- Firebase Cloud Messaging (FCM) for push notifications
- Stripe API for payment processing
- AWS S3/Google Cloud for file storage
- SendGrid/Twilio for email/SMS notifications

## Development Order & Architecture
The project is organized into 11 sections that must be implemented in this specific order due to dependencies:

1. **Signup/Login** - Google OAuth + email/password authentication
2. **User Profiles** - Profile management with S3 photo uploads
3. **Home/Dashboard** - Activity feed and navigation hub
4. **Chats/Social Network** - Group messaging with WebSocket real-time updates
5. **Prayer Requests** - Anonymous prayer tracking with reactions
6. **Announcements** - Admin posts with pinning and comments
7. **Calendar/Events** - Shared calendar with RSVP functionality
8. **Resources/Library** - Document repository with S3 storage
9. **Giving/Donations** - Stripe payment integration
10. **Admin Tools** - User/content management and analytics
11. **Settings/Help** - Notification preferences and app settings

## Database Schema
Key tables include:
- `users` - User profiles and authentication data
- `chat_groups` & `chat_group_members` - Group chat functionality
- `messages` - Chat messages with media support
- `prayer_requests` & `prayer_interactions` - Prayer tracking system
- `announcements` - Admin announcements with categorization
- `events` & `event_rsvps` - Calendar and event management
- `resources` - File/document library
- `donations` - Payment records
- `notifications` - Push notification system
- `audit_logs` - Admin activity tracking

All tables use UUID primary keys and include proper timestamps for auditing.

## Development Commands
**Note:** No build configuration files exist yet. The project structure needs to be initialized with:
- Spring Boot backend with Maven/Gradle build system
- React frontend with Node.js/npm
- Docker configuration for local development
- PostgreSQL database setup

When implementing, set up proper build commands for:
- Backend: `mvn spring-boot:run` or `gradle bootRun`
- Frontend: `npm start` or `yarn start`
- Database: Docker Compose for PostgreSQL
- Testing: JUnit (backend), Jest (frontend)

## Code Generation Guidelines
- Provide complete, runnable code per section
- Use proper error handling and validation
- Implement CORS configuration
- Follow Spring Boot and React best practices
- Include proper JWT authentication for protected routes
- Implement role-based access control
- Use proper database relationships and constraints

## User Communication Style
The project creator is an Enneagram Type 7 (enthusiast) who values:
- Long, clear explanations with markdown formatting
- Emoji usage for enhanced engagement 🎯
- High-energy, possibility-focused collaboration
- Technical excellence balanced with user enjoyment
- Innovation while maintaining systematic development

## Security & Performance
- HTTPS enforcement
- Rate limiting
- Password hashing
- Database indexing on queried fields
- Caching for feeds and frequently accessed data
- Proper input validation and sanitization

## Deployment
- Backend: Heroku/AWS hosting
- Frontend: App store deployment via Capacitor
- Database: PostgreSQL in production
- CI/CD: GitHub Actions for automation