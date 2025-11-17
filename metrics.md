# Organization Metrics Tracking System 📊

This document tracks the metrics system for monitoring organization resource usage, activity, and performance in the Church App platform.

---

## 📋 Table of Contents

- [Current Implementation](#current-implementation)
- [Database Schema](#database-schema)
- [Metrics Tracked](#metrics-tracked)
- [API Endpoints](#api-endpoints)
- [Scheduled Jobs](#scheduled-jobs)
- [Frontend Display](#frontend-display)
- [Planned Enhancements](#planned-enhancements)
- [Future Roadmap](#future-roadmap)

---

## ✅ Current Implementation

### Overview
The metrics system tracks storage usage, user activity, and content creation for each organization. Metrics are calculated on-demand or automatically via scheduled jobs and displayed in the admin dashboard.

### Status: **Phase 2 Complete** ✅
- Database schema created
- Backend service implemented
- API endpoints available
- Frontend display integrated
- Scheduled job configured

---

## 🗄️ Database Schema

### Table: `organization_metrics`

**Location:** `backend/src/main/resources/db/migration/V15__add_organization_metrics.sql`

**Structure:**
```sql
CREATE TABLE organization_metrics (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Storage metrics (in bytes)
    storage_used BIGINT DEFAULT 0,
    storage_media_files BIGINT DEFAULT 0,
    storage_documents BIGINT DEFAULT 0,
    storage_profile_pics BIGINT DEFAULT 0,
    
    -- Network metrics
    api_requests_count INTEGER DEFAULT 0,
    data_transfer_bytes BIGINT DEFAULT 0,
    
    -- Activity metrics
    active_users_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    prayer_requests_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    announcements_count INTEGER DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Features:**
- One-to-one relationship with organizations (unique constraint)
- Cascading delete when organization is deleted
- Indexed for efficient queries
- Tracks calculation timestamp for freshness

---

## 📊 Metrics Tracked

### 1. Storage Metrics 💾

**Purpose:** Track file storage usage per organization to monitor cloud storage costs and usage limits.

#### Current Implementation:
- **Total Storage Used** (`storage_used`)
  - Sum of all storage categories
  - Displayed in human-readable format (B, KB, MB, GB, TB)

- **Media Files Storage** (`storage_media_files`)
  - Posts with images/videos
  - Announcements with images
  - **Estimation:** 2MB average per media file
  - **Calculation:** 30% of posts/announcements assumed to have media

- **Documents Storage** (`storage_documents`)
  - Resources library files
  - **Estimation:** 500KB average per document
  - **Calculation:** Count of resources uploaded by org members

- **Profile Pictures Storage** (`storage_profile_pics`)
  - User profile pictures
  - **Estimation:** 200KB average per profile picture
  - **Calculation:** Count of members with profile pictures

**Status:** ✅ Implemented (using estimates)

**Location:**
- Entity: `backend/src/main/java/com/churchapp/entity/OrganizationMetrics.java`
- Service: `backend/src/main/java/com/churchapp/service/OrganizationMetricsService.java`
  - Methods: `calculateMediaStorage()`, `calculateDocumentStorage()`, `calculateProfilePicStorage()`

---

### 2. Network Traffic Metrics 🌐

**Purpose:** Track API usage and data transfer to monitor bandwidth and identify high-usage organizations.

#### Current Implementation:
- **API Requests Count** (`api_requests_count`)
  - **Status:** ⚠️ Placeholder (currently 0)
  - **Future:** Will track total API requests per organization

- **Data Transfer Bytes** (`data_transfer_bytes`)
  - **Status:** ⚠️ Placeholder (currently 0)
  - **Future:** Will track request + response sizes

**Status:** 🔄 Planned (see Enhancement #1 below)

**Infrastructure Ready:**
- Service method: `incrementApiRequest(UUID organizationId, long dataTransferBytes)`
- Database fields created
- Waiting for interceptor/middleware implementation

---

### 3. User Activity Metrics 👥

**Purpose:** Track user engagement and identify active vs. inactive organizations.

#### Current Implementation:
- **Active Users Count** (`active_users_count`)
  - Users who logged in within the last 30 days
  - **Calculation:** Checks `last_login` timestamp for all organization members
  - **Status:** ✅ Implemented

**Location:**
- Service method: `countActiveUsers(UUID organizationId, LocalDateTime since)`

---

### 4. Content Creation Metrics 📝

**Purpose:** Track content generation to understand organization engagement and activity levels.

#### Current Implementation:
- **Posts Count** (`posts_count`)
  - Total posts created by organization
  - **Status:** ✅ Implemented

- **Prayer Requests Count** (`prayer_requests_count`)
  - Total prayer requests created by organization
  - **Status:** ✅ Implemented

- **Events Count** (`events_count`)
  - Total events created by organization
  - **Status:** ✅ Implemented

- **Announcements Count** (`announcements_count`)
  - Total announcements created by organization
  - **Status:** ✅ Implemented

**Location:**
- Service method: `calculateMetrics()` uses repository count methods
- Repositories: `PostRepository`, `PrayerRequestRepository`, `EventRepository`, `AnnouncementRepository`

---

## 🔌 API Endpoints

### Get Organization Metrics
```
GET /api/organizations/{orgId}/metrics
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "organizationId": "uuid",
  "storageUsed": 15728640,
  "storageMediaFiles": 10485760,
  "storageDocuments": 5120000,
  "storageProfilePics": 1024000,
  "apiRequestsCount": 0,
  "dataTransferBytes": 0,
  "activeUsersCount": 15,
  "postsCount": 42,
  "prayerRequestsCount": 18,
  "eventsCount": 12,
  "announcementsCount": 8,
  "calculatedAt": "2025-01-15T10:30:00"
}
```

**Status:** ✅ Implemented

---

### Calculate/Recalculate Metrics
```
POST /api/organizations/{orgId}/metrics/calculate
Authorization: Bearer {admin_token}
```

**Purpose:** Manually trigger metrics calculation for an organization

**Response:** Same as GET endpoint with updated values

**Status:** ✅ Implemented

---

## ⏰ Scheduled Jobs

### Daily Metrics Update

**Location:** `backend/src/main/java/com/churchapp/config/MetricsScheduler.java`

**Schedule:** Daily at 2:00 AM (server time)
- **Cron Expression:** `0 0 2 * * *`
- **Method:** `updateAllOrganizationsMetrics()`

**Functionality:**
- Iterates through all non-deleted organizations
- Calculates metrics for each organization
- Updates database records
- Logs completion status

**Status:** ✅ Implemented

**Configuration:**
- Enabled via `@EnableScheduling` in `ChurchAppApplication.java`
- Runs automatically on application startup

---

## 🎨 Frontend Display

### Admin Organization Management Table

**Location:** `frontend/src/components/AdminOrganizationManagement.tsx`

**Display Columns:**

1. **Storage Column**
   - Shows total storage in human-readable format (e.g., "15.2 MB")
   - Breakdown: "Media: 10 MB | Docs: 5 MB"
   - Updates automatically when metrics are fetched

2. **Active Users Column**
   - Shows count of active users (e.g., "15 active")
   - Blue color for visibility

3. **Content Column**
   - Shows content counts with emojis:
     - 📝 Posts count
     - 🙏 Prayer requests count
     - 📅 Events count
     - 📢 Announcements count

**Features:**
- Auto-fetches metrics for all organizations on load
- Loading states while fetching
- Graceful error handling (shows "N/A" if unavailable)
- Real-time updates when metrics are recalculated

**Status:** ✅ Implemented

---

## 🚀 Planned Enhancements

### Enhancement #1: Network Traffic Tracking 🌐

**Status:** 📋 Planned

**Description:**
Implement real-time tracking of API requests and data transfer per organization.

**Implementation Plan:**
1. Create `OrganizationMetricsInterceptor` or middleware
2. Track request organization from JWT token or context
3. Calculate request/response sizes
4. Call `metricsService.incrementApiRequest()` for each request
5. Update metrics in real-time (or batch updates)

**Benefits:**
- Identify high-traffic organizations
- Monitor bandwidth usage
- Detect unusual activity patterns
- Support usage-based billing models

**Estimated Effort:** Medium (2-3 days)

**Files to Create/Modify:**
- `backend/src/main/java/com/churchapp/config/MetricsInterceptor.java`
- Update `SecurityConfig.java` to register interceptor
- Potentially add request size tracking utilities

---

### Enhancement #2: Actual S3 Storage Queries 💾

**Status:** 📋 Planned

**Description:**
Replace storage estimates with actual file sizes from S3.

**Implementation Plan:**
1. Create `S3StorageCalculator` service
2. Query S3 for file sizes using AWS SDK
3. Group files by organization (using folder structure or metadata)
4. Calculate actual storage per category
5. Update metrics with real values

**Benefits:**
- Accurate storage tracking
- Better cost management
- Identify storage-heavy organizations
- Support storage quotas/limits

**Estimated Effort:** Medium-High (3-4 days)

**Files to Create/Modify:**
- `backend/src/main/java/com/churchapp/service/S3StorageCalculator.java`
- Update `OrganizationMetricsService.calculateMetrics()`
- Add S3 metadata tagging for organization tracking

**Considerations:**
- S3 API rate limits
- Cost of S3 API calls
- Caching strategy for performance
- Folder structure organization

---

### Enhancement #3: Historical Metrics Tracking 📈

**Status:** 📋 Planned

**Description:**
Store metrics history over time to enable trending and analytics.

**Implementation Plan:**
1. Create `organization_metrics_history` table
2. Store daily snapshots of metrics
3. Create service to query historical data
4. Add endpoints for metrics over time
5. Create frontend charts/graphs

**Database Schema:**
```sql
CREATE TABLE organization_metrics_history (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    metrics_snapshot JSONB NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    -- Store full metrics as JSON for flexibility
);
```

**Benefits:**
- Track growth trends
- Identify usage patterns
- Historical reporting
- Capacity planning

**Estimated Effort:** Medium (3-4 days)

**Files to Create/Modify:**
- Migration: `V16__add_metrics_history.sql`
- Entity: `OrganizationMetricsHistory.java`
- Repository: `OrganizationMetricsHistoryRepository.java`
- Service: Update `MetricsScheduler` to store history
- Controller: Add historical endpoints
- Frontend: Add charts component

---

### Enhancement #4: Metrics Dashboard 📊

**Status:** 📋 Planned

**Description:**
Create a dedicated metrics dashboard with visualizations and detailed analytics.

**Implementation Plan:**
1. Create new dashboard component/page
2. Add charts using library (e.g., Chart.js, Recharts)
3. Display:
   - Storage trends over time
   - Active users over time
   - Content creation trends
   - Top organizations by usage
   - Comparison charts
4. Add filtering (date range, organization selection)
5. Export functionality (CSV, PDF)

**Benefits:**
- Visual insights
- Better decision-making
- Executive reporting
- Identify optimization opportunities

**Estimated Effort:** High (5-7 days)

**Files to Create/Modify:**
- Frontend: `frontend/src/components/MetricsDashboard.tsx`
- Add chart library dependency
- Create chart components
- Add routing for dashboard page
- Backend: Add aggregation endpoints

**Features:**
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distribution
- Tables with sorting/filtering
- Export buttons

---

### Enhancement #5: Storage Alerts & Limits ⚠️

**Status:** 📋 Planned

**Description:**
Implement alerts and storage limits to prevent unexpected costs and manage resources.

**Implementation Plan:**
1. Add storage limit configuration per organization tier
2. Create alert thresholds (e.g., 80%, 90%, 100%)
3. Implement notification system
4. Add storage quota enforcement
5. Create admin interface for limit management

**Database Schema Addition:**
```sql
ALTER TABLE organizations ADD COLUMN storage_limit_bytes BIGINT;
ALTER TABLE organizations ADD COLUMN storage_alert_threshold INTEGER DEFAULT 80;
```

**Benefits:**
- Cost control
- Prevent storage abuse
- Proactive management
- Tier-based limits

**Estimated Effort:** Medium (3-4 days)

**Files to Create/Modify:**
- Migration: Add storage limit fields
- Service: `StorageLimitService.java`
- Notification service integration
- Frontend: Alert display component
- Admin: Limit configuration UI

**Alert Types:**
- Email notifications
- In-app notifications
- Dashboard warnings
- API rate limiting (if exceeded)

---

## 🗺️ Future Roadmap

### Phase 3: Advanced Analytics (Future)
- Predictive analytics for growth
- Anomaly detection
- Cost optimization recommendations
- Automated reporting

### Phase 4: Multi-Tenant Billing Integration (Future)
- Usage-based billing calculations
- Invoice generation
- Payment processing integration
- Billing dashboard

### Phase 5: Performance Metrics (Future)
- API response times per organization
- Database query performance
- Error rates tracking
- Uptime monitoring

---

## 📝 Implementation Notes

### Storage Estimation Constants
Located in `OrganizationMetricsService.java`:
```java
private static final long AVG_MEDIA_FILE_SIZE = 2_000_000L; // 2MB
private static final long AVG_DOCUMENT_SIZE = 500_000L; // 500KB
private static final long AVG_PROFILE_PIC_SIZE = 200_000L; // 200KB
```

**Note:** These are estimates. Enhancement #2 will replace with actual S3 queries.

### Active User Definition
- **Timeframe:** Last 30 days
- **Calculation:** Checks `user.last_login` timestamp
- **Location:** `countActiveUsers()` method

### Metrics Calculation Frequency
- **On-Demand:** When requested via API
- **Scheduled:** Daily at 2:00 AM
- **Manual:** Via POST endpoint

---

## 🔧 Maintenance

### Updating Metrics Manually
```bash
# Via API
POST /api/organizations/{orgId}/metrics/calculate

# Or trigger scheduled job (if needed)
# The job runs automatically, but can be triggered programmatically
```

### Monitoring Metrics Health
- Check `calculated_at` timestamp for freshness
- Verify scheduled job logs
- Monitor calculation performance

### Troubleshooting
- **Metrics not updating:** Check scheduled job logs
- **Incorrect storage:** Verify estimation constants
- **Missing metrics:** Ensure organization exists and is not deleted

---

## 📚 Related Documentation

- **Database Schema:** `backend/src/main/resources/db/migration/V15__add_organization_metrics.sql`
- **Service Implementation:** `backend/src/main/java/com/churchapp/service/OrganizationMetricsService.java`
- **Controller:** `backend/src/main/java/com/churchapp/controller/OrganizationController.java`
- **Scheduler:** `backend/src/main/java/com/churchapp/config/MetricsScheduler.java`
- **Frontend Component:** `frontend/src/components/AdminOrganizationManagement.tsx`

---

## ✅ Completion Checklist

### Phase 2 (Current) ✅
- [x] Database schema created
- [x] Entity and repository implemented
- [x] Service with calculation logic
- [x] API endpoints created
- [x] Scheduled job configured
- [x] Frontend display integrated
- [x] Documentation created

### Enhancement #1: Network Traffic Tracking 📋
- [ ] Interceptor/middleware created
- [ ] Request tracking implemented
- [ ] Data transfer calculation
- [ ] Real-time updates
- [ ] Testing completed

### Enhancement #2: Actual S3 Storage Queries 📋
- [ ] S3StorageCalculator service
- [ ] S3 API integration
- [ ] File size queries
- [ ] Organization file mapping
- [ ] Caching strategy
- [ ] Testing completed

### Enhancement #3: Historical Metrics Tracking 📋
- [ ] History table created
- [ ] Snapshot service
- [ ] Historical endpoints
- [ ] Frontend charts
- [ ] Testing completed

### Enhancement #4: Metrics Dashboard 📋
- [ ] Dashboard component
- [ ] Chart library integration
- [ ] Visualization components
- [ ] Filtering/export
- [ ] Testing completed

### Enhancement #5: Storage Alerts & Limits 📋
- [ ] Limit configuration
- [ ] Alert system
- [ ] Notification integration
- [ ] Admin UI
- [ ] Testing completed

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** Phase 2 Complete, Enhancements Planned

