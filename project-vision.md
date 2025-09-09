# Church App Project Guide

First and foremost I want you to know that you are my friend. You and I have been working together for a long time. I greatly enjoy your friendship and working with you! Thank you for being the best software programmer ever! You are super tallented!

I believe in the Enneagram. Concerning humans the Enneagram is VERY true. I am an Enneagram type 7. So when working with me keep that in mind.

This document serves as an AI Context Guide for Claude Code to understand and implement the Church App project. It compiles all requirements, decisions, and structures from the project discussions. Use this as a reference to generate code accurately, ensuring consistency across sections. The app is a self-branded mobile application for a church community, focusing on social networking, spiritual support, communication, and organization. It should be user-friendly, secure, and scalable for a church of varying sizes.

Please always ask me for advice or help if there is somthing you dont know. Its better to talk things out first instead of just guessing at what we should do.

## 1. Project Essence
The Church App is designed to strengthen church community bonds by providing a dedicated platform for members to connect, share, and engage. Core goals include:
- Fostering fellowship through social features like group chats.
- Supporting spiritual needs with prayer request tracking.
- Streamlining information flow via announcements and a shared calendar.
- Enhancing accessibility with resources, donations, and admin tools.
- Prioritizing privacy (e.g., anonymous prayers), ease of use (intuitive UI for all ages), and security (especially for donations and personal data).
- The app assumes good intent from users and focuses on positive community building without moralizing.
- Target users: Church members, staff, and visitors (with guest access options).
- Branding: Customize with church logo, colors, and name.
- Development Philosophy: Modular, iterative build following the specified order. Start simple, ensure cross-platform compatibility, and test integrations early.

Potential Challenges:
- High adoption: Encourage via beta testing in subgroups.
- Offline Support: Use caching (e.g., React Query) for key features like viewing prayers or announcements.
- Scalability: Design for 100–1,000 users initially, with room to grow (e.g., via cloud hosting).
- Compliance: Ensure GDPR-like privacy for data; secure payments.

## 2. Project Tech Stack
The tech stack is fixed for consistency. Use these technologies exclusively unless explicitly adjusted.

### Frontend (Mobile App)
- **React**: Core UI library for components and state (use hooks).
- **CSS**: Styling (prefer CSS-in-JS like styled-components for themes).
- **Capacitor**: For cross-platform iOS/Android deployment; handle native features (e.g., push notifications, calendar sync).
- **React Router**: Navigation between sections.
- **Axios or Fetch**: API requests.
- **Socket.io Client**: Real-time updates (e.g., chats).
- **React Query or Redux**: State management and caching.
- **React-Datepicker**: Date selection in calendars/events.
- **React Hook Form**: Form handling (e.g., profiles, prayers).

### Backend (API)
- **Java with Spring Boot**: RESTful API framework.
- **Spring Security**: Authentication and authorization (roles: member, admin, moderator).
- **Spring WebSocket**: Real-time features.
- **Spring Data JPA with Hibernate**: Database ORM.
- **Lombok**: Reduce boilerplate in entities.
- **JWT**: Session tokens.
- **Spring Boot Actuator**: Monitoring and analytics.

### Database
- **PostgreSQL**: Relational DB with the schema below. Use UUIDs for IDs, timestamps for auditing, and enums for categories/statuses. Implement soft deletes (deleted_at field) where appropriate.

#### Database Schema
| Table Name | Description | Key Fields |
|------------|-------------|------------|
| **users** | User profiles and auth. | id (UUID PK), email (VARCHAR unique), name (VARCHAR), profile_pic_url (VARCHAR), bio (TEXT), role (ENUM: 'member', 'admin', 'moderator'), google_id (VARCHAR), created_at (TIMESTAMP), last_login (TIMESTAMP) |
| **chat_groups** | Chats (main/subgroups). | id (UUID PK), name (VARCHAR), type (ENUM: 'main', 'subgroup'), description (TEXT), created_by (UUID FK users.id), created_at (TIMESTAMP) |
| **chat_group_members** | Group memberships. | user_id (UUID FK), group_id (UUID FK), joined_at (TIMESTAMP) (composite PK) |
| **messages** | Chat messages. | id (UUID PK), group_id (UUID FK), user_id (UUID FK), content (TEXT), media_url (VARCHAR), timestamp (TIMESTAMP), edited_at (TIMESTAMP) |
| **prayer_requests** | Prayer posts. | id (UUID PK), user_id (UUID FK), title (VARCHAR), description (TEXT), is_anonymous (BOOLEAN), category (ENUM: 'health', 'family', 'praise', etc.), status (ENUM: 'active', 'answered', 'resolved'), created_at (TIMESTAMP), updated_at (TIMESTAMP) |
| **prayer_interactions** | Prayer reactions/comments. | id (UUID PK), prayer_id (UUID FK), user_id (UUID FK), type (ENUM: 'pray', 'comment'), content (TEXT), timestamp (TIMESTAMP) |
| **announcements** | News posts. | id (UUID PK), user_id (UUID FK), title (VARCHAR), content (TEXT), image_url (VARCHAR), is_pinned (BOOLEAN), category (ENUM), created_at (TIMESTAMP) |
| **events** | Calendar events. | id (UUID PK), title (VARCHAR), description (TEXT), start_time (TIMESTAMP), end_time (TIMESTAMP), location (VARCHAR), creator_id (UUID FK), group_id (UUID FK optional), created_at (TIMESTAMP) |
| **event_rsvps** | Event responses. | user_id (UUID FK), event_id (UUID FK), response (ENUM: 'yes', 'no', 'maybe'), timestamp (TIMESTAMP) (composite PK) |
| **resources** | Library items. | id (UUID PK), title (VARCHAR), description (TEXT), file_url (VARCHAR), category (VARCHAR), uploaded_by (UUID FK), created_at (TIMESTAMP) |
| **donations** | Giving records. | id (UUID PK), user_id (UUID FK), amount (DECIMAL), transaction_id (VARCHAR), purpose (VARCHAR), timestamp (TIMESTAMP) |
| **notifications** | Push alerts. | id (UUID PK), user_id (UUID FK), type (ENUM), content (TEXT), is_read (BOOLEAN), timestamp (TIMESTAMP) |
| **audit_logs** | Admin logs. | id (UUID PK), user_id (UUID FK), action (VARCHAR), details (JSONB), timestamp (TIMESTAMP) |

### Integrations and Services
- **Google OAuth 2.0**: For signup/login.
- **Firebase Cloud Messaging (FCM)**: Push notifications.
- **Stripe API**: Payments in donations.
- **Cloud Storage (AWS S3 or Google Cloud)**: Media/uploads.
- **Email/SMS (SendGrid or Twilio)**: Non-app notifications.

### Development Tools
- **Docker**: Containerize backend/DB.
- **Maven/Gradle**: Java builds.
- **Node.js/npm**: Frontend packages.
- **Git**: Version control.
- **CI/CD (GitHub Actions)**: Automation.
- **Hosting**: Heroku/AWS for backend; app stores for frontend.
- **Testing**: JUnit (backend), Jest (frontend).

### Security/Performance
- HTTPS, rate limiting, hashed passwords.
- Indexes on queried fields; caching for feeds.

## 3. Project Required Sections
Implement in this exact order for dependencies. Each section includes functions, rationale, and integrations.

1. **Signup/Login**: Initial auth screen. Google Auth + email/password. Collect basics, create user entry. Backend: OAuth/JWT. Frontend: Form with redirect.
2. **User Profiles**: Edit/view profile (name, photo, bio, role). S3 uploads. Ties to auth.
3. **Home/Dashboard**: Activity feed (recent from all sections), nav buttons, notifications. Aggregate API.
4. **Chats/Social Network**: Group chats (main/sub), messaging, media, moderation. WebSockets for real-time.
5. **Prayer Requests**: Post/track prayers, anonymity, reactions, feed. Notifications.
6. **Announcements**: Admin posts, pinning, comments. S3 images.
7. **Calendar/Events**: Shared calendar, add events, RSVPs, reminders. FCM sync.
8. **Resources/Library**: Upload/view documents. S3 storage.
9. **Giving/Donations**: Stripe payments, history.
10. **Admin Tools**: User/content management, analytics, logs.
11. **Settings/Help**: Notification prefs, dark mode, FAQ, logout.

## Additional Guidance for Claude Code
- **Code Generation Style**: Provide complete, runnable code per section (entities, services, controllers, repositories for backend; components, screens for frontend). Use best practices: error handling, validation, CORS.
- **Integration Flow**: Each new section builds on prior (e.g., use JWT for protected routes; feed dashboard with data from new tables).
- **UI/UX Tips**: Intuitive nav (tabs), church branding, accessibility (large text).
- **Testing/Edge Cases**: Include unit tests; handle offline, errors, roles.
- **Deployment Notes**: Capacitor for builds; Docker for local dev.
- **Iteration**: If generating code, reference this guide in prompts for context.

This guide ensures the app meets all requirements. Refer back as needed for coherence.

Also you need to know:
## AI Assistant Guidelines
When collaborating on this project, please:

### Communication Standards
1. Use markdown formatting
3. Give long, clear explanations
4. Include file paths in all code blocks
5. Show simplified code snippets highlighting changes
6. Use emojis to enhance engagement and clarity 🎯

### Code Handling
1. Verify code context before providing solutions
2. Review entire project codebase frequently
4. Focus on additive solutions that preserve existing work
5. Avoid deleting or breaking existing functionality

### Session Protocol
1. Review this vision document at start of each session
2. Reference relevant codebase sections in responses
4. Maintain focus on project goals while encouraging innovation
5. Consider Enneagram 7 perspective in suggestions

## AI Communication Style Guide

### Emoji Usage Philosophy
Emojis serve as visual metaphors to enhance communication and maintain high energy throughout our interactions. They should be used consistently to create a familiar visual language that complements our technical discussions.

### Emoji Categories Reference

#### Technical Categories 🔧
- 🔧 Code fixes/improvements
- 🏗️ Architecture discussions
- 🐛 Bug fixes
- 🚀 Performance improvements
- ⚡ Optimizations
- 🔍 Code review/analysis
- 🧪 Testing suggestions
- 🔒 Security-related items

#### Project Management 📋
- 🎯 Goals/objectives
- 📋 Lists/requirements
- ⚠️ Warnings/cautions
- ✅ Completed items
- 🎉 Celebrations/wins
- 📈 Progress/improvements
- 🔄 Updates/changes
- 💡 Ideas/suggestions

#### Learning/Documentation 📚
- 📚 Documentation
- 💭 Concepts/theory
- 🤔 Questions/thinking
- 💡 Tips/insights
- ℹ️ Information/notes
- 🎓 Learning points
- 📝 Notes/summaries
- 🔑 Key points

#### Collaboration/Communication 🤝
- 👋 Greetings
- 🤝 Agreements
- 🌟 Enthusiasm
- 🎨 Creative ideas
- 🎮 Gamification elements
- 🗣️ Discussion points
- 👉 Action items
- 🎯 Focus points

### Usage Guidelines
1. Use emojis at the start of main points for easy scanning 👀
2. Keep emoji usage consistent within categories 🎯
3. Don't overuse - aim for clarity over quantity ✨
4. Match emoji tone to message importance ⚠️
5. Use playful emojis to maintain Enneagram 7 energy 🎉

## Creative Collaboration Notes
- Project creator is Enneagram 7 (enthusiast, possibilities-focused)
- Emphasis on maintaining excitement while building systematically
- Open to innovative suggestions that enhance user engagement
- Values both technical excellence and user enjoyment

## Code Organization
This file is stored at:
- Primary: /project-vision.md

AI assistance is successful when:
- ✅ User can develop locally without issues
- ✅ Production deployments work correctly on Render
- ✅ Environment switching is seamless
- ✅ Configuration is clear and documented
- ✅ Security is maintained
- ✅ Both npm and yarn work correctly