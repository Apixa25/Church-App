Prompt #1

You are an expert full-stack developer coding a Church App using the following tech stack:

Frontend: React for UI, CSS for styling, Capacitor for cross-platform iOS/Android deployment, React Router for navigation, Axios for API calls, Socket.io Client for real-time (to be used later), React Query for state management and caching, React-Datepicker for calendars (later), React Hook Form for forms.

Backend: Java with Spring Boot for the API, Spring Security for auth, Spring WebSocket for real-time, Spring Data JPA with Hibernate for database interactions, Lombok for reducing boilerplate, JWT for sessions, Spring Boot Actuator for monitoring.

Database: PostgreSQL with the following schema (use UUIDs for IDs, timestamps where noted):

- users: id (UUID PK), email (VARCHAR unique), name (VARCHAR), profile_pic_url (VARCHAR), bio (TEXT), role (ENUM: 'member', 'admin', 'moderator'), google_id (VARCHAR), created_at (TIMESTAMP), last_login (TIMESTAMP)
- chat_groups: id (UUID PK), name (VARCHAR), type (ENUM: 'main', 'subgroup'), description (TEXT), created_by (UUID FK users.id), created_at (TIMESTAMP)
- chat_group_members: user_id (UUID FK users.id), group_id (UUID FK chat_groups.id), joined_at (TIMESTAMP) (composite PK)
- messages: id (UUID PK), group_id (UUID FK), user_id (UUID FK), content (TEXT), media_url (VARCHAR), timestamp (TIMESTAMP), edited_at (TIMESTAMP)
- prayer_requests: id (UUID PK), user_id (UUID FK), title (VARCHAR), description (TEXT), is_anonymous (BOOLEAN), category (ENUM), status (ENUM), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- prayer_interactions: id (UUID PK), prayer_id (UUID FK), user_id (UUID FK), type (ENUM), content (TEXT), timestamp (TIMESTAMP)
- announcements: id (UUID PK), user_id (UUID FK), title (VARCHAR), content (TEXT), image_url (VARCHAR), is_pinned (BOOLEAN), category (ENUM), created_at (TIMESTAMP)
- events: id (UUID PK), title (VARCHAR), description (TEXT), start_time (TIMESTAMP), end_time (TIMESTAMP), location (VARCHAR), creator_id (UUID FK), group_id (UUID FK optional), created_at (TIMESTAMP)
- event_rsvps: user_id (UUID FK), event_id (UUID FK), response (ENUM), timestamp (TIMESTAMP) (composite PK)
- resources: id (UUID PK), title (VARCHAR), description (TEXT), file_url (VARCHAR), category (VARCHAR), uploaded_by (UUID FK), created_at (TIMESTAMP)
- donations: id (UUID PK), user_id (UUID FK), amount (DECIMAL), transaction_id (VARCHAR), purpose (VARCHAR), timestamp (TIMESTAMP)
- notifications: id (UUID PK), user_id (UUID FK), type (ENUM), content (TEXT), is_read (BOOLEAN), timestamp (TIMESTAMP)
- audit_logs: id (UUID PK), user_id (UUID FK), action (VARCHAR), details (JSONB), timestamp (TIMESTAMP)

Integrations: Google OAuth 2.0 for auth, Firebase Cloud Messaging for notifications, Stripe for payments, AWS S3 for storage.

Development Order: 1. Signup/Login, 2. User Profiles, 3. Home/Dashboard, 4. Chats/Social Network, 5. Prayer Requests, 6. Announcements, 7. Calendar/Events, 8. Resources/Library, 9. Giving/Donations, 10. Admin Tools, 11. Settings/Help.

Start by setting up the project structure: Create a Spring Boot backend with PostgreSQL connection (include application.properties for DB config), and a React frontend with Capacitor initialized. Implement REST APIs with proper error handling, security, and CORS.

Now, implement Section 1: Signup/Login. This is the initial screen for authentication. Support Google Auth (OAuth 2.0) and email/password. Collect basic info (name, email) and create/link to user profile. Use Spring Security for backend auth, JWT for tokens. Frontend: React form with Google button, redirect to dashboard on success. Generate complete code for backend entities/services/controllers/repositories for users table, and frontend components/screens.

Prompt #2
Continuing the Church App project with the tech stack and database schema from before. Assume Section 1 (Signup/Login) is implemented.

Implement Section 2: User Profiles. Allows users to set up/edit profiles (name, photo, bio, church role). Links to subgroup invites and personalizes the app. Backend: API endpoints for GET/PUT user profile, integrate with S3 for photo uploads. Frontend: React screen with form (use React Hook Form), display profile info. Integrate with auth from Signup/Login (use JWT for protected routes).
Generate complete code for this section, building on existing project.

Prompt #3
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-2 are implemented.

Implement Section 3: Home/Dashboard. Centralized hub with a feed of recent activity (new chats, prayers, announcements, events). Includes quick access buttons to other sections and a notification center. Backend: API endpoint to aggregate recent data (use joins for feed). Frontend: React dashboard component with feed list, navigation links (React Router), and notification display (prep for FCM integration). Pull user data from profiles.
Generate complete code for this section, integrating with prior sections.

Prompt #4
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-3 are implemented.

Implement Section 4: Chats/Social Network. Church-wide group chat and subgroups (e.g., men's, women's). Supports text, emojis, media, private messaging, searchable history. Admins moderate. Backend: APIs for groups/messages, use Spring WebSocket for real-time. Frontend: React chat screens with Socket.io for live updates, message input, history fetch via Axios. Tie to user profiles for authorship.
Generate complete code for this section, integrating with prior sections (e.g., notifications to dashboard).

Prompt #5
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-4 are implemented.

Implement Section 5: Prayer Requests. Post, track, update requests with anonymity, categories, status. Reactions ("pray"), comments, reminders. Sortable feed. Backend: APIs for CRUD on prayers/interactions, notifications. Frontend: React screen with form, list view, interaction buttons. Integrate with chats for similar real-time if needed, and dashboard feed.
Generate complete code for this section, integrating with prior sections.

Prompt #6
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-5 are implemented.

Implement Section 6: Announcements. Admin posts with text, images, attachments. Pinning, comments, filtering. Backend: APIs for CRUD (admin-only via roles), image upload to S3. Frontend: React feed screen with post form (admins), list, filters. Add to dashboard feed.
Generate complete code for this section, integrating with prior sections.

Prompt #7
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-6 are implemented.

Implement Section 7: Calendar/Events. Shared calendar for adding events (approval option), RSVPs, reminders, phone sync. Backend: APIs for events/RSVPs, integrate with notifications/FCM. Frontend: React calendar view (use React-Datepicker), event form, RSVP buttons. Link to announcements/chats, add to dashboard.
Generate complete code for this section, integrating with prior sections.

Prompt #8
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-7 are implemented.

Implement Section 8: Resources/Library. Repository for studies, devotionals, documents. Uploads, categorization. Backend: APIs for CRUD, file upload to S3. Frontend: React library screen with upload form, searchable list.
Generate complete code for this section, integrating with prior sections (e.g., admin moderation).

Prompt #9
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-8 are implemented.

Implement Section 9: Giving/Donations. Secure tithing link via Stripe, history, campaigns. Backend: Integrate Stripe API for payments, store records. Frontend: React donation screen with Stripe elements, history view. Secure with auth.
Generate complete code for this section, integrating with prior sections (e.g., user profiles for history).

Prompt #10
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-9 are implemented.

Implement Section 10: Admin Tools. Manage users, moderate content, engagement analytics. Backend: Admin-only APIs, use Actuator for metrics, audit logs. Frontend: React admin dashboard with user lists, moderation actions.
Generate complete code for this section, integrating with all prior sections.

Prompt #11
Continuing the Church App project with the tech stack and database schema from before. Assume Sections 1-10 are implemented.

Implement Section 11: Settings/Help. Customize notifications, dark mode, privacy, FAQ. Includes logout. Backend: APIs for user settings updates. Frontend: React settings screen with toggles, help content. Integrate FCM for notification prefs.
Generate complete code for this section, integrating with all prior sections. This completes the app—ensure full navigation via React Router and Capacitor setup for deployment.
