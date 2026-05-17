# ⛪ The Gathering — Church Community Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)

**The Gathering** is a multi-tenant church community platform designed to strengthen church bonds by providing a dedicated space for members to connect, share, and engage. Built as a Progressive Web App (PWA) with native mobile support via Capacitor.

🌐 **Live:** [thegathrd.com](https://www.thegathrd.com)

---

## 🌟 Features

### Social & Community
- **Social Feed** — Posts, comments, likes, reactions, and shares scoped to organizations or groups
- **Groups** — Create and join community groups across organizations
- **Real-time Chat** — WebSocket-powered messaging with STOMP protocol
- **Global Search** — Find people, posts, groups, and resources across the platform

### Spiritual Life
- **Prayer Requests** — Submit, track, and interact with prayer requests (with anonymous option)
- **Worship Rooms** — Collaborative worship spaces with queued media, playlists, and animated avatars
- **Resources Library** — Share sermons, documents, videos, and YouTube content

### Church Administration
- **Multi-Tenant Architecture** — Multiple churches/organizations on one platform with isolated data
- **Admin Dashboard** — Manage members, moderate content, view analytics
- **Announcements** — Organization-wide announcements with rich media
- **Events & Calendar** — Shared calendar with event management and bring-lists
- **Role-Based Access** — Member, Moderator, and Admin roles per organization

### Giving & Finance
- **Stripe Integration** — Secure donations with one-time and recurring options
- **Stripe Connect** — Organizations can onboard their own Stripe accounts
- **Tax Receipts** — Auto-generated PDF donation receipts via email

### User Experience
- **Push Notifications** — Firebase Cloud Messaging for real-time alerts
- **PWA Support** — Installable web app with offline capabilities
- **Native Mobile** — iOS and Android apps via Capacitor
- **Deep Linking** — Universal links and app scheme support
- **Dark Theme** — Modern dark UI optimized for readability
- **Media Uploads** — Image and video uploads with S3 storage and MediaConvert processing

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| React Router 7 | Client-side routing |
| TanStack React Query | Server state management |
| Styled Components | Component-level styling |
| Axios | HTTP client |
| Capacitor 7 | Native iOS/Android builds |
| Firebase SDK | Push notifications |
| Stripe.js | Payment UI components |
| STOMP.js + SockJS | WebSocket real-time messaging |
| Recharts | Analytics charts |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| Java 17 | Language |
| Spring Boot 3.2 | Application framework |
| Spring Security | Authentication & authorization |
| Spring Data JPA | Database ORM |
| Spring WebSocket | Real-time communication |
| Flyway | Database migration management |
| PostgreSQL 15 | Primary database |
| JWT (jjwt) | Token-based authentication |
| Google OAuth 2.0 | Social login |
| AWS S3 | File/media storage |
| AWS MediaConvert | Video transcoding |
| Stripe Java SDK | Payment processing |
| Firebase Admin | Push notification dispatch |
| iText 8 | PDF receipt generation |
| Lombok | Boilerplate reduction |

### Infrastructure
| Technology | Purpose |
|---|---|
| AWS Elastic Beanstalk | Backend hosting |
| AWS RDS | Managed PostgreSQL |
| AWS S3 | Static assets & uploads |
| AWS MediaConvert | Video processing pipeline |
| Docker | Local database development |
| Vercel / Custom hosting | Frontend deployment |

---

## 📁 Project Structure

```
Church-App/
├── backend/                     # Spring Boot API
│   ├── src/main/java/com/churchapp/
│   │   ├── config/              # App configuration (CORS, WebSocket, S3, etc.)
│   │   ├── controller/          # REST API endpoints
│   │   ├── dto/                 # Data Transfer Objects
│   │   ├── entity/              # JPA entities
│   │   ├── exception/           # Custom exceptions & global handler
│   │   ├── repository/          # Spring Data repositories
│   │   ├── security/            # JWT, OAuth, filters
│   │   ├── service/             # Business logic
│   │   └── util/                # Utility classes
│   ├── src/main/resources/
│   │   └── db/migration/        # Flyway SQL migrations (V1–V52)
│   ├── docker-compose.yml       # Local PostgreSQL container
│   └── pom.xml                  # Maven dependencies
├── frontend/                    # React PWA + Capacitor
│   ├── src/
│   │   ├── components/          # UI components (80+ feature components)
│   │   ├── config/              # App configuration
│   │   ├── contexts/            # React context providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API service layer
│   │   ├── styles/              # Global stylesheets
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Utility functions
│   │   └── App.tsx              # Root application component
│   ├── public/                  # Static assets & PWA manifest
│   └── capacitor.config.json    # Native mobile configuration
├── project-vision.md            # Project philosophy & goals
├── A_LOCAL_TESTING_GUIDE.md     # Complete dev workflow guide
└── .env.example                 # Environment variables template
```

---

## 🚀 Getting Started

### Prerequisites

- **Java 17+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **Docker Desktop** (recommended for local database)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Church-App.git
cd Church-App
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit both `.env` files with your actual credentials. See [Environment Variables](#-environment-variables) below.

### 3. Start the Database

```bash
cd backend
docker compose up -d
```

This starts PostgreSQL 15 on port `5433` with pre-configured credentials.

### 4. Run the Backend

```bash
cd backend
./mvnw spring-boot:run
```

The API starts at **http://localhost:8083/api**. Flyway automatically runs database migrations on startup.

### 5. Run the Frontend

```bash
cd frontend
npm install
npm start
```

The app starts at **http://localhost:3000**.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DB_URL` | JDBC PostgreSQL connection string |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port (default: `5432`) |
| `DB_NAME` | Database name (default: `church_app`) |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for JWT token signing (min 256 bits) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3/MediaConvert |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (default: `us-west-2`) |
| `AWS_S3_BUCKET` | S3 bucket name for uploads |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) |
| `FRONTEND_URL` | Frontend URL for redirects |

### Frontend

| Variable | Description |
|---|---|
| `REACT_APP_API_BASE_URL` | Backend API URL (default: `http://localhost:8083/api`) |
| `REACT_APP_STRIPE_PUBLIC_KEY` | Stripe publishable key |

---

## 📱 Mobile Development

The app uses **Capacitor** for native iOS and Android builds.

```bash
cd frontend

# Build web assets and sync to native projects
npm run cap:build

# Open in Android Studio
npm run cap:android

# Open in Xcode
npm run cap:ios
```

**App ID:** `com.thegathering.app`

---

## 🧪 Testing

### Backend
```bash
cd backend
./mvnw test
```

### Frontend
```bash
cd frontend
npm test

# CI mode (no watch)
npm run test:ci
```

---

## 🗄️ Database Migrations

The project uses **Flyway** for versioned database migrations. Migrations are located in `backend/src/main/resources/db/migration/` and run automatically on application startup.

To run migrations manually:
```bash
cd backend
./mvnw flyway:migrate
```

---

## 🚢 Deployment

### Backend
The backend deploys to **AWS Elastic Beanstalk** as a fat JAR:

```bash
cd backend
./mvnw clean package -DskipTests
# Upload target/*.jar to Elastic Beanstalk
```

### Frontend
Build the production bundle:

```bash
cd frontend
npm run build:production
```

See `A_LOCAL_TESTING_GUIDE.md` for the full deployment workflow.

---

## 🏛️ Architecture Highlights

### Multi-Tenant Design
- All content is organization-scoped via `organization_id`
- Users can belong to multiple organizations with different roles
- Dual-primary system: users have both a church primary and an optional family primary
- Groups are cross-organization social spaces

### Security
- JWT token-based authentication with refresh support
- Google OAuth 2.0 and Apple Sign-In
- BCrypt password encryption
- Role-based access control (MEMBER → MODERATOR → ADMIN)
- Content moderation with reporting and user warnings
- User blocking capabilities

### Real-Time Features
- WebSocket connections via STOMP over SockJS
- Live notifications and chat updates
- Comment read tracking

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

**Copyright © 2025 Steven Sills II**

---

## 📬 Contact

- **Website:** [thegathrd.com](https://www.thegathrd.com)
- **App:** [app.thegathrd.com](https://app.thegathrd.com)
