# Multi-Tenant System Administrator Guide

**The Gathering Church App - Comprehensive System Documentation**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Visual Architecture Overview](#visual-architecture-overview)
3. [Understanding User Journeys](#understanding-user-journeys)
4. [Database Schema Explained](#database-schema-explained)
5. [Backend Services Breakdown](#backend-services-breakdown)
6. [Frontend Components Guide](#frontend-components-guide)
7. [Key Concepts Glossary](#key-concepts-glossary)
8. [Common Administrator Tasks](#common-administrator-tasks)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## Executive Summary

### What is "Multi-Tenant"?

Think of "multi-tenant" like an apartment building:
- **The Building** = The Gathering App (the entire platform)
- **Each Apartment** = An Individual Church Organization
- **Residents** = Users who can live in multiple apartments (join multiple churches)
- **Shared Spaces** = The social feed where everyone can interact

### The Big Picture

The Gathering operates in **two modes simultaneously**:

#### Mode 1: Standalone Social Network
- Users can join without being part of any church
- They can post, comment, and interact socially
- They DON'T have access to prayers, events, or giving
- Think of it like Twitter/Facebook

#### Mode 2: White-Labeled Church Apps
- Each church gets their own "organization" in the system
- One church can be a user's **Primary Organization**
- Users can join unlimited **Secondary Organizations** (other churches)
- Primary org unlocks prayers, events, announcements, and giving
- Secondary orgs only appear in the social feed

### Real-World Example

**Sarah's Journey:**
1. Sarah downloads "The Gathering" app
2. She starts posting and making friends (Social Mode)
3. She finds "First Baptist Church" and joins as her **Primary Org**
4. Now she can:
   - Submit prayer requests to First Baptist
   - RSVP to First Baptist events
   - Give donations to First Baptist
   - See First Baptist announcements
5. She discovers "Community Youth Group" and joins as **Secondary Org**
6. Community Youth Group posts now appear in her social feed
7. But she can only pray/give/attend events at First Baptist (her primary)

### Why This Architecture?

**Business Model:**
- The Gathering can operate as a standalone social platform
- Individual churches can adopt it as their church management system
- Each church processes their own donations via Stripe Connect
- Users can participate in multiple church communities
- Churches remain financially and administratively independent

---

## Visual Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE GATHERING APP                         │
│                     (Single Codebase Platform)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ ORGANIZATION  │      │ ORGANIZATION  │      │ ORGANIZATION  │
│  "The Global  │      │ "First Baptist│      │  "Community   │
│   Community"  │      │    Church"    │      │ Youth Group"  │
│               │      │               │      │               │
│ Type: GLOBAL  │      │ Type: CHURCH  │      │ Type: MINISTRY│
│ Tier: PREMIUM │      │ Tier: PREMIUM │      │ Tier: BASIC   │
│               │      │               │      │               │
│ Stripe: N/A   │      │ Stripe: acc_1 │      │ Stripe: acc_2 │
└───────────────┘      └───────────────┘      └───────────────┘
        │                        │                        │
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   USERS TABLE   │
                        │                 │
                        │ • John (social) │
                        │ • Sarah (member)│
                        │ • Mike (member) │
                        └─────────────────┘
```

### User Membership Model

```
┌──────────────────────────────────────────────────────────────┐
│                    USER: Sarah Johnson                        │
└──────────────────────────────────────────────────────────────┘
                         │
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   PRIMARY    │  │  SECONDARY   │  │  SECONDARY   │
│ MEMBERSHIP   │  │  MEMBERSHIP  │  │  MEMBERSHIP  │
│              │  │              │  │              │
│ First Baptist│  │ Youth Group  │  │ Global Comm. │
│ Role: MEMBER │  │ Role: MEMBER │  │ Role: MEMBER │
│              │  │              │  │              │
│ ✓ Prayers    │  │ ✗ Prayers    │  │ ✗ Prayers    │
│ ✓ Events     │  │ ✗ Events     │  │ ✗ Events     │
│ ✓ Giving     │  │ ✗ Giving     │  │ ✗ Giving     │
│ ✓ Feed Posts │  │ ✓ Feed Posts │  │ ✓ Feed Posts │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Content Visibility Rules

```
┌────────────────────────────────────────────────────────────────┐
│                     CONTENT TYPE MATRIX                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POSTS                                                          │
│  ├─ Multi-tenant ✓                                             │
│  ├─ Visible from: Primary + Secondary + Groups                 │
│  └─ Filterable: Yes (ALL/PRIMARY/GROUPS)                       │
│                                                                 │
│  PRAYER REQUESTS                                                │
│  ├─ Single-tenant ✓                                            │
│  ├─ Visible from: Primary Org ONLY                             │
│  └─ Filterable: No                                             │
│                                                                 │
│  EVENTS                                                         │
│  ├─ Single-tenant ✓                                            │
│  ├─ Visible from: Primary Org ONLY                             │
│  └─ Filterable: No                                             │
│                                                                 │
│  ANNOUNCEMENTS                                                  │
│  ├─ Single-tenant ✓                                            │
│  ├─ Visible from: Primary Org ONLY                             │
│  └─ Filterable: No                                             │
│                                                                 │
│  DONATIONS                                                      │
│  ├─ Single-tenant ✓                                            │
│  ├─ Routed to: Primary Org Stripe Account                      │
│  └─ Filterable: No                                             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Feed Filtering System

```
┌───────────────────────────────────────────────────────────────┐
│              FEED FILTER: How Content Appears                  │
└───────────────────────────────────────────────────────────────┘

USER SELECTS: "ALL"
├─ Shows posts from: Primary Org
├─ Shows posts from: All Secondary Orgs (PUBLIC visibility only)
├─ Shows posts from: All Joined Groups (unmuted)
└─ Result: Maximum content visibility

USER SELECTS: "PRIMARY_ONLY"
├─ Shows posts from: Primary Org ONLY
├─ Hides: All secondary org posts
├─ Hides: All group posts
└─ Result: Focused church-only feed

USER SELECTS: "SELECTED_GROUPS"
├─ Shows posts from: Primary Org
├─ Shows posts from: User-selected groups ONLY
├─ Hides: Secondary org posts
└─ Result: Customized group focus

┌─────────────────────────────────────────────────────────────┐
│  FILTER PERSISTENCE: User preference saved to database      │
│  TABLE: feed_preferences                                    │
│  FIELDS: user_id, active_filter, selected_group_ids         │
└─────────────────────────────────────────────────────────────┘
```

### Organization Switching Flow

```
┌─────────────────────────────────────────────────────────────┐
│         PRIMARY ORGANIZATION SWITCHING (30-Day Rule)        │
└─────────────────────────────────────────────────────────────┘

DAY 0: User joins "First Baptist" as PRIMARY
       │
       ├─ Unlocks: Prayers, Events, Giving
       ├─ Database: user_organization_memberships (is_primary=true)
       └─ History: organization_switching_history (switched_at=NOW)

DAY 15: User tries to switch to "Youth Group" as PRIMARY
       │
       ├─ System checks: organization_switching_history
       ├─ Calculates: Days since last switch = 15
       ├─ Compares: 15 < 30
       └─ ❌ REJECTED: "You must wait 15 more days"

DAY 31: User switches to "Youth Group" as PRIMARY
       │
       ├─ System checks: organization_switching_history
       ├─ Calculates: Days since last switch = 31
       ├─ Compares: 31 >= 30
       ├─ ✓ APPROVED: Switch allowed
       │
       ├─ Updates: First Baptist (is_primary=false)
       ├─ Updates: Youth Group (is_primary=true)
       └─ Creates: New switching_history record (switched_at=NOW)

COOLDOWN RESET: New 30-day period begins
```

---

## Understanding User Journeys

### Journey 1: Social-Only User (John)

**John's Story:**
John downloads The Gathering to connect with Christian friends but isn't ready to join a church.

```
STEP 1: Download & Sign Up
├─ Email/Google OAuth registration
├─ Complete profile (name, photo, bio)
└─ Primary Organization: NULL ✓ (allowed!)

STEP 2: Explore Social Features
├─ Post to Global Community feed
├─ Comment on other users' posts
├─ Like and share content
└─ Add friends and follow users

STEP 3: Discover Churches
├─ Browse Organizations (search/filter)
├─ View church profiles (public info)
├─ See "Join as Primary" buttons
└─ Undecided - continues social-only for now

LIMITATIONS:
├─ ❌ Cannot view prayer requests
├─ ❌ Cannot see church events
├─ ❌ Cannot give donations
└─ ✓ Full social network access
```

**What Happens Behind the Scenes:**
- John's user record has `primary_organization_id = NULL`
- His posts have `organization_id = '00000000-0000-0000-0000-000000000001'` (Global)
- FeedService uses the "social-only" query path
- Prayer/Event/Announcement endpoints return 403 Forbidden

### Journey 2: Primary Member (Sarah)

**Sarah's Story:**
Sarah joins First Baptist Church as her spiritual home.

```
STEP 1: Join as Primary Organization
├─ Searches for "First Baptist Church"
├─ Clicks "Join as Primary Organization"
├─ Confirms modal: "This unlocks prayers, events, and giving"
└─ Backend creates: UserOrganizationMembership (is_primary=true)

STEP 2: Unlocked Features Appear
├─ ✓ Prayer Requests tab becomes visible
├─ ✓ Events calendar becomes visible
├─ ✓ Announcements from First Baptist appear
├─ ✓ Giving button routes to First Baptist's Stripe
└─ ✓ Social feed continues working

STEP 3: Submit First Prayer
├─ Goes to Prayer Requests tab
├─ Clicks "New Prayer Request"
├─ Fills out: Title, Description, Category, Privacy (CHURCH_ONLY)
├─ Submits → Backend saves with organization_id = First Baptist
└─ Only First Baptist members can see/pray for this request

STEP 4: Join Secondary Organizations
├─ Finds "Community Youth Group"
├─ Clicks "Join as Secondary" (no cooldown!)
├─ Youth Group posts now appear in her social feed
└─ But prayers/events stay with First Baptist only

STEP 5: Customize Feed
├─ Opens Feed Filter dropdown
├─ Selects "PRIMARY_ONLY"
├─ Feed now shows only First Baptist posts
└─ Preference saved to feed_preferences table
```

**What Happens Behind the Scenes:**
- Sarah's `primary_organization_id = {First Baptist UUID}`
- UserOrganizationMembership records:
  - First Baptist: `is_primary=true`, `role=MEMBER`
  - Youth Group: `is_primary=false`, `role=MEMBER`
- PrayerRequestService.getMyPrayers() filters by `organization_id = primary_organization_id`
- FeedFilterService calculates: `[First Baptist, Youth Group]` for org visibility
- Donations route to First Baptist's Stripe Connect account

### Journey 3: Multi-Church Active User (Mike)

**Mike's Story:**
Mike is deeply involved in multiple ministries and churches.

```
STEP 1: Primary at First Baptist
├─ Joined 6 months ago
├─ Active in prayers, events, giving
└─ Wants to also support "Downtown Mission"

STEP 2: Try to Switch Primary
├─ Finds Downtown Mission
├─ Clicks "Join as Primary"
├─ ⚠️ Warning: "You joined First Baptist 180 days ago"
├─ ✓ Cooldown expired (180 > 30)
└─ Confirms switch to Downtown Mission

BACKEND PROCESSING:
├─ OrganizationService.switchPrimaryOrganization()
│   ├─ Validates: Last switch was 180 days ago ✓
│   ├─ Updates: First Baptist membership (is_primary=false)
│   ├─ Updates: Downtown Mission membership (is_primary=true)
│   ├─ Updates: users.primary_organization_id
│   └─ Creates: organization_switching_history record
│
└─ Result: Primary switched, new 30-day cooldown starts

STEP 3: Content Reorganization
├─ NEW: Downtown Mission prayers visible
├─ NEW: Downtown Mission events visible
├─ NEW: Giving routes to Downtown Mission
├─ STILL VISIBLE: First Baptist posts (now secondary org)
└─ HIDDEN: First Baptist prayers/events (no longer primary)

STEP 4: Join Groups for Granular Control
├─ Joins "Youth Ministry" group at First Baptist
├─ Joins "Outreach Team" group at Downtown Mission
├─ Creates custom feed filter: "SELECTED_GROUPS"
├─ Selects only: Youth Ministry + Outreach Team
└─ Feed now shows only these two groups + primary org
```

**What Happens Behind the Scenes:**
- `organization_switching_history` table logs all switches
- Cooldown validation: `SELECT * FROM organization_switching_history WHERE user_id = Mike AND switched_at > NOW() - INTERVAL '30 days'`
- If record exists → Block switch with days remaining
- Content visibility recalculated immediately after switch
- Old primary org prayers/events/announcements hidden
- New primary org prayers/events/announcements appear

### Journey 4: Church Administrator (Pastor Linda)

**Pastor Linda's Story:**
Linda manages First Baptist Church on The Gathering platform.

```
STEP 1: Promoted to Admin
├─ Senior Pastor upgrades Linda's role
├─ Backend: membership.role = ADMIN (enum change)
└─ New "Admin Tools" menu appears in app

STEP 2: Set Up Stripe Connect (First Time)
├─ Goes to Admin Tools → Giving Settings
├─ Sees: "⚠️ Stripe not connected - Donations disabled"
├─ Clicks "Set Up Giving"
└─ Redirected to StripeConnectOnboarding component

STRIPE ONBOARDING FLOW:
├─ Frontend calls: POST /api/stripe-connect/create-account/{orgId}
├─ Backend creates: Stripe Express Account
│   ├─ Type: EXPRESS (simplified onboarding)
│   ├─ Business Type: NON_PROFIT
│   ├─ Country: US
│   └─ Capabilities: card_payments, transfers
│
├─ Backend saves: organization.stripe_connect_account_id
├─ Backend creates: Stripe Account Link (onboarding URL)
└─ Frontend redirects: User to Stripe onboarding page

STEP 3: Complete Stripe Onboarding
├─ Stripe collects: Church legal name, EIN, bank account
├─ User verifies: Identity documents
├─ Stripe validates: Information
└─ Redirects back: To The Gathering app

STEP 4: Verify Connection
├─ App calls: GET /api/stripe-connect/account-status/{orgId}
├─ Backend checks: account.charges_enabled && account.details_submitted
├─ ✓ Status: CONNECTED
└─ Giving button enabled for all First Baptist members

STEP 5: Monitor Donations
├─ Admin Dashboard shows: Total donations, recent transactions
├─ Click "View Stripe Dashboard"
├─ Backend calls: POST /api/stripe-connect/dashboard-link/{orgId}
├─ Stripe creates: Login link (single-use, 5-min expiry)
└─ Linda redirected to: Stripe Express Dashboard
```

**What Happens Behind the Scenes:**
- StripeConnectController validates: `user.role == ADMIN` for organization
- Stripe Express account created with Connect platform settings
- Account link generated with return/refresh URLs
- Organization record updated with `stripe_connect_account_id`
- DonationService routes payments using "destination charges":
  ```java
  PaymentIntentCreateParams.builder()
      .setAmount(amountInCents)
      .setCurrency("usd")
      .setTransferData(
          TransferDataParams.builder()
              .setDestination(organization.getStripeConnectAccountId())
              .build()
      )
  ```

### Journey 5: Group Management (Ministry Leader Tom)

**Tom's Story:**
Tom leads the Youth Ministry at First Baptist and wants a private group.

```
STEP 1: Create Group
├─ Goes to Groups → Create New Group
├─ Fills out:
│   ├─ Name: "Youth Ministry Leadership"
│   ├─ Description: "Planning and coordination for youth programs"
│   ├─ Visibility: PRIVATE
│   ├─ Organization: First Baptist Church
│   └─ Max Members: 20
│
└─ Backend creates: Group record with Tom as ADMIN

STEP 2: Invite Members
├─ Tom searches for youth leaders
├─ Sends invitations (future feature: deep links)
├─ Invited users get notifications
└─ They click "Accept" → Added to group

STEP 3: Group Posting
├─ Tom creates post in Group
├─ Backend: post.group_id = Youth Ministry Leadership
├─ Post visibility:
│   ├─ ✓ Group members only (visibility=PRIVATE)
│   ├─ ❌ Not visible to First Baptist general members
│   └─ ❌ Not visible to other organizations
│
└─ Comments/reactions limited to group members

STEP 4: Mute/Unmute Feature
├─ Member Sarah finds group too noisy
├─ She opens Group Settings → Mute Group
├─ Backend: user_group_memberships.is_muted = true
├─ Posts from this group disappear from her feed
└─ She can still visit group page manually
```

**What Happens Behind the Scenes:**
- Group visibility types control content access:
  - `PUBLIC`: Anyone in the organization can see posts
  - `PRIVATE`: Only members can see posts
  - `SECRET`: Group doesn't appear in search, invite-only
  - `OPEN`: Anyone can join automatically
- Muting doesn't remove membership, just filters from feed
- FeedFilterService excludes muted groups from `selected_group_ids`

---

## Database Schema Explained

### Core Tables Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE STRUCTURE                        │
│                   (11 Primary Tables)                        │
└─────────────────────────────────────────────────────────────┘

IDENTITY & ACCESS
├─ users (user accounts, authentication)
├─ organizations (churches, ministries, global)
├─ user_organization_memberships (many-to-many with roles)
└─ organization_switching_history (30-day cooldown tracking)

SOCIAL & GROUPS
├─ groups (sub-communities within organizations)
├─ user_group_memberships (group membership with muting)
└─ feed_preferences (user's feed filter settings)

CONTENT (Multi-Tenant)
└─ posts (social posts with org_id and group_id)

CONTENT (Single-Tenant)
├─ prayer_requests (primary org only)
├─ events (primary org only)
├─ announcements (primary org only)
└─ donations (routed to primary org's Stripe)
```

### Table Relationships Diagram

```
                    ┌──────────────┐
                    │    USERS     │
                    │              │
                    │ PK: id (UUID)│
                    │ primary_org  │
                    └──────┬───────┘
                           │
                           │ 1:N
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────┐ ┌───────────────┐ ┌──────────────┐
│USER_ORG_MEMBER │ │USER_GROUP_MEMB│ │FEED_PREFS    │
│                │ │               │ │              │
│user_id (FK)    │ │user_id (FK)   │ │user_id (FK)  │
│org_id (FK)     │ │group_id (FK)  │ │active_filter │
│is_primary ✓    │ │is_muted ✓     │ │group_ids []  │
│role (ENUM)     │ │role (ENUM)    │ └──────────────┘
└────────┬───────┘ └───────┬───────┘
         │                 │
         │ N:1             │ N:1
         │                 │
         ▼                 ▼
┌────────────────┐ ┌──────────────┐
│ ORGANIZATIONS  │ │   GROUPS     │
│                │ │              │
│PK: id (UUID)   │ │PK: id (UUID) │
│name            │ │name          │
│slug            │ │org_id (FK)   │
│type (ENUM)     │ │visibility    │
│tier (ENUM)     │ │max_members   │
│stripe_acct_id  │ └──────┬───────┘
└────────┬───────┘        │
         │                │
         │ 1:N            │ 1:N
         │                │
         └────────┬───────┴────────────┐
                  │                    │
                  ▼                    ▼
         ┌────────────────┐   ┌────────────────┐
         │ CONTENT TABLES │   │     POSTS      │
         │                │   │                │
         │• prayer_req    │   │ org_id (FK)    │
         │• events        │   │ group_id (FK)  │
         │• announcements │   │ (Multi-tenant) │
         │• donations     │   └────────────────┘
         │                │
         │All have:       │
         │org_id (FK)     │
         │(Single-tenant) │
         └────────────────┘
```

### Key Tables Deep Dive

#### Table: `users`

**Purpose:** Stores user accounts and authentication data

**Key Columns:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL if OAuth only
    display_name VARCHAR(100) NOT NULL,
    profile_picture_url TEXT,
    bio TEXT,
    role VARCHAR(50),  -- ADMIN, MODERATOR, MEMBER (global role)
    primary_organization_id UUID,  -- FK to organizations (NULL allowed!)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP  -- Soft delete
);
```

**Important Notes:**
- `primary_organization_id` can be NULL (social-only users)
- Global `role` is separate from organization-specific roles
- Soft deletes preserve historical data

#### Table: `organizations`

**Purpose:** Represents churches, ministries, and the global community

**Key Columns:**
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    type VARCHAR(50) NOT NULL,  -- CHURCH, MINISTRY, NONPROFIT, GLOBAL
    tier VARCHAR(50) NOT NULL,  -- FREE, BASIC, PREMIUM, ENTERPRISE
    status VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE, SUSPENDED, ARCHIVED

    -- Stripe Connect integration
    stripe_connect_account_id VARCHAR(255),  -- Stripe account ID

    -- Organization details
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    location VARCHAR(255),
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),

    -- Settings and metadata
    settings JSONB DEFAULT '{}'::jsonb,  -- Flexible key-value storage
    metadata JSONB DEFAULT '{}'::jsonb,  -- Additional data

    -- Statistics
    member_count INTEGER DEFAULT 0,
    primary_member_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Special Organization:**
- `id = '00000000-0000-0000-0000-000000000001'` = The Global Community
- All social-only users' content belongs to Global

#### Table: `user_organization_memberships`

**Purpose:** Links users to organizations with roles and primary flag

**Key Columns:**
```sql
CREATE TABLE user_organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    role VARCHAR(50) NOT NULL,  -- ADMIN, MODERATOR, MEMBER (org-specific!)
    is_primary BOOLEAN DEFAULT false,  -- Only ONE can be true per user

    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (user_id, organization_id),  -- User can only join org once
    CONSTRAINT check_one_primary_per_user
        CHECK (is_primary = false OR
               (SELECT COUNT(*) FROM user_organization_memberships
                WHERE user_id = user_organization_memberships.user_id
                AND is_primary = true) = 1)
);
```

**Important Notes:**
- Each user can have MANY memberships
- But only ONE can have `is_primary = true`
- Constraint ensures primary uniqueness per user

#### Table: `organization_switching_history`

**Purpose:** Enforces 30-day cooldown on primary organization switches

**Key Columns:**
```sql
CREATE TABLE organization_switching_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_organization_id UUID REFERENCES organizations(id),  -- NULL if first join
    to_organization_id UUID NOT NULL REFERENCES organizations(id),
    switched_at TIMESTAMP DEFAULT NOW(),
    reason VARCHAR(50)  -- USER_INITIATED, ADMIN_ACTION, etc.
);
```

**How It Works:**
1. User attempts to switch primary org
2. Backend queries: `SELECT * FROM organization_switching_history WHERE user_id = ? AND switched_at > NOW() - INTERVAL '30 days'`
3. If record exists: Calculate days remaining, reject request
4. If no record: Allow switch, insert new history record

#### Table: `groups`

**Purpose:** Sub-communities within organizations

**Key Columns:**
```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES users(id),

    visibility VARCHAR(50) DEFAULT 'PUBLIC',  -- PUBLIC, PRIVATE, SECRET, OPEN
    max_members INTEGER,  -- NULL = unlimited

    tags JSONB DEFAULT '[]'::jsonb,  -- ['youth', 'worship', 'outreach']
    settings JSONB DEFAULT '{}'::jsonb,

    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Visibility Types:**
- `PUBLIC`: Anyone in org can see, must request to join
- `PRIVATE`: Members only see content, must be invited
- `SECRET`: Doesn't appear in search, invite-only
- `OPEN`: Anyone in org can join without approval

#### Table: `user_group_memberships`

**Purpose:** Links users to groups with muting capability

**Key Columns:**
```sql
CREATE TABLE user_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

    role VARCHAR(50) DEFAULT 'MEMBER',  -- ADMIN, MODERATOR, MEMBER
    is_muted BOOLEAN DEFAULT false,  -- Hide from feed but stay member

    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (user_id, group_id)
);
```

**Muting vs Leaving:**
- **Mute**: User stays in group, posts hidden from feed, can visit group page
- **Leave**: User removed from group, cannot see content unless rejoins

#### Table: `feed_preferences`

**Purpose:** Stores user's feed filtering preferences

**Key Columns:**
```sql
CREATE TABLE feed_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    active_filter VARCHAR(50) DEFAULT 'ALL',  -- ALL, PRIMARY_ONLY, SELECTED_GROUPS
    selected_group_ids JSONB DEFAULT '[]'::jsonb,  -- Array of group UUIDs

    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Filter Modes:**
1. **ALL**: Show primary org + secondary orgs + all unmuted groups
2. **PRIMARY_ONLY**: Show only primary organization posts
3. **SELECTED_GROUPS**: Show primary org + specific selected groups only

#### Table: `posts`

**Purpose:** Social posts (multi-tenant capable)

**Key Columns:**
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Multi-tenant fields
    organization_id UUID REFERENCES organizations(id),  -- Which org posted to
    user_primary_org_id_snapshot UUID,  -- User's primary org at time of post
    group_id UUID REFERENCES groups(id),  -- Optional group assignment

    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]'::jsonb,
    media_types JSONB DEFAULT '[]'::jsonb,

    post_type VARCHAR(50) DEFAULT 'TEXT',  -- TEXT, PHOTO, VIDEO, LINK
    category VARCHAR(100),
    location VARCHAR(255),

    anonymous BOOLEAN DEFAULT false,

    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Visibility Logic:**
- If `group_id` is set: Only group members see it (based on group visibility)
- If `organization_id` is set: Org members see it (primary + secondary)
- Feed filtering further refines based on user preferences

#### Table: `prayer_requests`

**Purpose:** Prayer requests (single-tenant, primary org only)

**Key Columns:**
```sql
CREATE TABLE prayer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),  -- REQUIRED!

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),  -- HEALING, GUIDANCE, THANKSGIVING, etc.

    privacy_level VARCHAR(50) DEFAULT 'CHURCH_ONLY',  -- CHURCH_ONLY, LEADERS_ONLY, PRIVATE
    is_answered BOOLEAN DEFAULT false,
    answered_testimony TEXT,

    prayer_count INTEGER DEFAULT 0,  -- How many people prayed

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Key Difference from Posts:**
- `organization_id` is NOT NULL (required)
- Only visible to members of that specific organization
- Privacy levels restrict further within the organization

---

## Backend Services Breakdown

### Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  SPRING BOOT BACKEND                          │
│                    (Layered Architecture)                     │
└──────────────────────────────────────────────────────────────┘

LAYER 1: Controllers (REST API Endpoints)
├─ OrganizationController
├─ GroupController
├─ UserController
├─ PostController
├─ PrayerRequestController
└─ StripeConnectController

LAYER 2: Services (Business Logic)
├─ OrganizationService
│   ├─ createOrganization()
│   ├─ joinOrganization()
│   ├─ switchPrimaryOrganization()  ⭐ 30-day cooldown logic
│   ├─ leaveOrganization()
│   └─ searchOrganizations()
│
├─ GroupService
│   ├─ createGroup()
│   ├─ joinGroup()
│   ├─ muteGroup()
│   ├─ unmuteGroup()
│   └─ getGroupMembers()
│
├─ FeedFilterService
│   ├─ getFeedParameters()  ⭐ Calculates visible orgs/groups
│   ├─ updateFeedPreferences()
│   └─ applyUserFilter()
│
└─ StripeConnectService
    ├─ createConnectAccount()  ⭐ Sets up Stripe for org
    ├─ processDestinationCharge()  ⭐ Routes payment to org
    └─ getAccountStatus()

LAYER 3: Repositories (Database Access)
├─ OrganizationRepository (JPA)
├─ UserOrganizationMembershipRepository (JPA)
├─ GroupRepository (JPA)
├─ FeedPreferencesRepository (JPA)
└─ OrganizationSwitchingHistoryRepository (JPA)

LAYER 4: Entities (Database Models)
├─ Organization.java
├─ User.java
├─ UserOrganizationMembership.java
├─ Group.java
└─ FeedPreferences.java
```

### Key Service Methods Explained

#### OrganizationService

**Method:** `switchPrimaryOrganization()`

**Purpose:** Switches user's primary organization with 30-day cooldown enforcement

**Flow:**
```java
@Transactional
public void switchPrimaryOrganization(UUID userId, UUID newOrgId) throws Exception {
    // STEP 1: Get user and validate
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new Exception("User not found"));

    // STEP 2: Check 30-day cooldown
    List<OrganizationSwitchingHistory> recentSwitches =
        switchingHistoryRepository.findByUserIdAndSwitchedAtAfter(
            userId,
            LocalDateTime.now().minusDays(30)
        );

    if (!recentSwitches.isEmpty()) {
        OrganizationSwitchingHistory lastSwitch = recentSwitches.get(0);
        long daysSince = ChronoUnit.DAYS.between(lastSwitch.getSwitchedAt(), LocalDateTime.now());
        long daysRemaining = 30 - daysSince;
        throw new CooldownException("You must wait " + daysRemaining + " more days");
    }

    // STEP 3: Verify user is member of target org
    UserOrganizationMembership targetMembership =
        membershipRepository.findByUserIdAndOrganizationId(userId, newOrgId)
            .orElseThrow(() -> new Exception("You are not a member of this organization"));

    // STEP 4: Unset current primary (if exists)
    if (user.getPrimaryOrganizationId() != null) {
        UserOrganizationMembership currentPrimary =
            membershipRepository.findByUserIdAndOrganizationId(userId, user.getPrimaryOrganizationId())
                .orElse(null);
        if (currentPrimary != null) {
            currentPrimary.setIsPrimary(false);
            membershipRepository.save(currentPrimary);
        }
    }

    // STEP 5: Set new primary
    targetMembership.setIsPrimary(true);
    membershipRepository.save(targetMembership);

    user.setPrimaryOrganizationId(newOrgId);
    userRepository.save(user);

    // STEP 6: Log the switch in history
    OrganizationSwitchingHistory history = new OrganizationSwitchingHistory();
    history.setUserId(userId);
    history.setFromOrganizationId(user.getPrimaryOrganizationId());
    history.setToOrganizationId(newOrgId);
    history.setSwitchedAt(LocalDateTime.now());
    history.setReason("USER_INITIATED");
    switchingHistoryRepository.save(history);

    // STEP 7: Trigger recalculation of user's feed
    feedFilterService.recalculateFeedParameters(userId);
}
```

**What This Does:**
1. Validates user exists
2. Checks switching history for cooldown violation
3. Ensures user is already a member of target org
4. Unsets old primary (if any)
5. Sets new primary
6. Logs the switch with timestamp
7. Recalculates feed visibility

#### FeedFilterService

**Method:** `getFeedParameters()`

**Purpose:** Calculates which organizations and groups should appear in user's feed

**Flow:**
```java
public FeedParameters getFeedParameters(UUID userId) {
    // STEP 1: Get user and their feed preferences
    User user = userRepository.findById(userId).orElse(null);
    FeedPreferences prefs = feedPreferencesRepository.findByUserId(userId)
            .orElse(getDefaultPreferences(userId));

    // STEP 2: Get user's organization memberships
    List<UserOrganizationMembership> memberships =
        membershipRepository.findByUserId(userId);

    // STEP 3: Get user's group memberships (excluding muted)
    List<UserGroupMembership> groupMemberships =
        groupMembershipRepository.findByUserIdAndIsMutedFalse(userId);

    // STEP 4: Calculate based on active filter
    FeedParameters params = new FeedParameters();

    switch (prefs.getActiveFilter()) {
        case "ALL":
            // Show everything
            params.organizationIds = memberships.stream()
                    .map(m -> m.getOrganizationId())
                    .collect(Collectors.toList());
            params.groupIds = groupMemberships.stream()
                    .map(m -> m.getGroupId())
                    .collect(Collectors.toList());
            break;

        case "PRIMARY_ONLY":
            // Show only primary org
            if (user.getPrimaryOrganizationId() != null) {
                params.organizationIds = List.of(user.getPrimaryOrganizationId());
            } else {
                // Social-only user: show Global org
                params.organizationIds = List.of(GLOBAL_ORG_ID);
            }
            params.groupIds = List.empty();  // No groups
            break;

        case "SELECTED_GROUPS":
            // Show primary org + selected groups only
            if (user.getPrimaryOrganizationId() != null) {
                params.organizationIds = List.of(user.getPrimaryOrganizationId());
            } else {
                params.organizationIds = List.of(GLOBAL_ORG_ID);
            }

            // Filter selected groups from preferences
            List<UUID> selectedGroupIds = prefs.getSelectedGroupIds();
            params.groupIds = groupMemberships.stream()
                    .filter(m -> selectedGroupIds.contains(m.getGroupId()))
                    .map(m -> m.getGroupId())
                    .collect(Collectors.toList());
            break;
    }

    return params;
}
```

**What This Does:**
1. Gets user's saved feed preferences
2. Retrieves all organization memberships
3. Retrieves unmuted group memberships
4. Applies filter logic based on user's selection:
   - **ALL**: Everything visible
   - **PRIMARY_ONLY**: Just primary org
   - **SELECTED_GROUPS**: Primary + specific groups
5. Returns parameter object used by PostRepository queries

#### StripeConnectService

**Method:** `processDestinationCharge()`

**Purpose:** Routes donation to correct organization's Stripe account

**Flow:**
```java
public PaymentIntent processDestinationCharge(UUID userId, UUID organizationId, Long amountCents) {
    // STEP 1: Get organization and verify Stripe account exists
    Organization org = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new Exception("Organization not found"));

    if (org.getStripeConnectAccountId() == null) {
        throw new Exception("Organization has not set up Stripe giving");
    }

    // STEP 2: Verify user is a member of this organization
    boolean isMember = membershipRepository.existsByUserIdAndOrganizationId(userId, organizationId);
    if (!isMember) {
        throw new Exception("You must be a member to give to this organization");
    }

    // STEP 3: Create Payment Intent with destination charge
    PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(amountCents)  // Amount in cents (e.g., 5000 = $50.00)
            .setCurrency("usd")
            .setTransferData(
                PaymentIntentCreateParams.TransferData.builder()
                    .setDestination(org.getStripeConnectAccountId())  // Route to org's Stripe
                    .build()
            )
            .setApplicationFeeAmount((long) (amountCents * 0.03))  // 3% platform fee
            .putMetadata("user_id", userId.toString())
            .putMetadata("organization_id", organizationId.toString())
            .build();

    // STEP 4: Create the payment intent
    PaymentIntent paymentIntent = PaymentIntent.create(params);

    // STEP 5: Save donation record
    Donation donation = new Donation();
    donation.setUserId(userId);
    donation.setOrganizationId(organizationId);
    donation.setAmount(amountCents / 100.0);  // Convert to dollars
    donation.setStripePaymentIntentId(paymentIntent.getId());
    donation.setStatus("PENDING");
    donationRepository.save(donation);

    return paymentIntent;
}
```

**What This Does:**
1. Verifies organization has Stripe Connect set up
2. Validates user is a member (can only give to primary org)
3. Creates Payment Intent using "destination charges" pattern
4. Automatically routes 97% to church's Stripe, 3% to platform
5. Saves donation record for reporting

**Stripe Flow Diagram:**
```
USER DONATES $100 TO FIRST BAPTIST CHURCH

┌─────────────────────────────────────────────────────────┐
│  User's Credit Card                                     │
│  (Charged by The Gathering Platform)                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ $100.00 charged
                  ▼
┌─────────────────────────────────────────────────────────┐
│  The Gathering's Stripe Account (Platform)              │
│  - Receives $100                                        │
│  - Takes $3 platform fee                                │
│  - Transfers $97 to destination                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ $97.00 transferred
                  ▼
┌─────────────────────────────────────────────────────────┐
│  First Baptist Church's Stripe Express Account          │
│  - Receives $97                                         │
│  - Directly deposited to church's bank account          │
│  - Church manages refunds/disputes via Stripe dashboard │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Components Guide

### Component Hierarchy

```
App.tsx (Root)
├─ Routes
│   ├─ /dashboard → Dashboard.tsx ⭐
│   ├─ /organizations → OrganizationBrowser.tsx ⭐
│   ├─ /groups → GroupBrowser.tsx ⭐
│   ├─ /admin/stripe → StripeConnectOnboarding.tsx ⭐
│   └─ [other routes...]
│
├─ Context Providers
│   ├─ <OrganizationContext> ⭐ (wraps entire app)
│   ├─ <GroupContext> ⭐ (wraps entire app)
│   └─ <FeedFilterContext> ⭐ (wraps entire app)
│
└─ Global Components
    ├─ OrganizationSelector.tsx ⭐ (in header)
    ├─ FeedFilterSelector.tsx ⭐ (in feed)
    └─ [navigation, etc...]
```

### Context Providers (Global State)

#### OrganizationContext

**Purpose:** Manages organization data and membership across the app

**Provides:**
```typescript
interface OrganizationContextType {
  // User's current memberships
  primaryMembership: UserOrganizationMembership | null;
  allMemberships: UserOrganizationMembership[];

  // All available organizations
  availableOrganizations: Organization[];

  // Actions
  joinOrganization: (orgId: string, asPrimary: boolean) => Promise<void>;
  leaveOrganization: (orgId: string) => Promise<void>;
  switchPrimaryOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;

  // Loading states
  loading: boolean;

  // Cooldown check
  canSwitchPrimary: boolean;
  daysUntilSwitch: number;
}
```

**How Components Use It:**
```typescript
// In any component
import { useOrganization } from '../contexts/OrganizationContext';

function MyComponent() {
  const { primaryMembership, joinOrganization, canSwitchPrimary } = useOrganization();

  // Check if user has primary org
  if (primaryMembership) {
    console.log('User belongs to:', primaryMembership.organizationName);
  }

  // Join organization as primary
  const handleJoin = async (orgId: string) => {
    if (!canSwitchPrimary) {
      alert('You must wait before switching primary organization');
      return;
    }
    await joinOrganization(orgId, true);
  };

  return <div>...</div>;
}
```

**When Data Updates:**
- On app load (fetches memberships)
- After joining/leaving organization
- After switching primary
- Manual refresh via `refreshOrganizations()`

#### GroupContext

**Purpose:** Manages group memberships and muting

**Provides:**
```typescript
interface GroupContextType {
  // User's group memberships
  myGroups: UserGroupMembership[];
  unmutedGroups: UserGroupMembership[];
  mutedGroups: UserGroupMembership[];

  // All available groups
  availableGroups: Group[];

  // Actions
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  muteGroup: (groupId: string) => Promise<void>;
  unmuteGroup: (groupId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;

  // Loading states
  loading: boolean;
}
```

**How Components Use It:**
```typescript
import { useGroup } from '../contexts/GroupContext';

function GroupList() {
  const { unmutedGroups, muteGroup } = useGroup();

  return (
    <div>
      {unmutedGroups.map(group => (
        <div key={group.groupId}>
          <h3>{group.groupName}</h3>
          <button onClick={() => muteGroup(group.groupId)}>
            Mute this group
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### FeedFilterContext

**Purpose:** Manages user's feed filtering preferences

**Provides:**
```typescript
interface FeedFilterContextType {
  // Current filter state
  activeFilter: 'ALL' | 'PRIMARY_ONLY' | 'SELECTED_GROUPS';
  selectedGroupIds: string[];

  // Calculated feed parameters (for API queries)
  feedParameters: {
    organizationIds: string[];
    groupIds: string[];
  };

  // Actions
  setActiveFilter: (filter: string) => Promise<void>;
  toggleGroupSelection: (groupId: string) => Promise<void>;
  setSelectedGroupIds: (groupIds: string[]) => Promise<void>;
  refreshFeedParameters: () => Promise<void>;

  // Loading states
  loading: boolean;
}
```

**How Components Use It:**
```typescript
import { useFeedFilter } from '../contexts/FeedFilterContext';

function FeedComponent() {
  const { feedParameters, activeFilter } = useFeedFilter();

  // Use feedParameters in API call
  const fetchPosts = async () => {
    const response = await axios.get('/api/posts/feed', {
      params: {
        organizationIds: feedParameters.organizationIds.join(','),
        groupIds: feedParameters.groupIds.join(',')
      }
    });
    return response.data;
  };

  return <div>Current filter: {activeFilter}</div>;
}
```

### Key UI Components

#### OrganizationBrowser

**Purpose:** Main UI for discovering and joining organizations

**Features:**
1. Search organizations by name
2. Filter by type (CHURCH, MINISTRY, NONPROFIT, GLOBAL)
3. View organization details
4. Join as primary or secondary
5. Leave organizations
6. See current memberships

**User Interface:**
```
┌────────────────────────────────────────────────────────┐
│  DISCOVER ORGANIZATIONS                     [X]        │
├────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 Search: [_______________________________] 🔎       │
│                                                         │
│  Filter: [All ▼] [Church] [Ministry] [Nonprofit]      │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ 📍 First Baptist Church          ⭐ Primary│          │
│  │ Tyler, TX | 245 members                 │           │
│  │ [View Details]  [Switch Primary]        │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ 📍 Community Youth Group                │           │
│  │ Tyler, TX | 89 members                  │           │
│  │ [Join as Primary]  [Join as Secondary]  │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ 📍 Downtown Mission                     │           │
│  │ Tyler, TX | 156 members                 │           │
│  │ [Join as Primary]  [Join as Secondary]  │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  [Load More]                                           │
└────────────────────────────────────────────────────────┘
```

**Code Highlights:**
```typescript
const handleJoinAsPrimary = async (orgId: string) => {
  try {
    // Check cooldown
    if (primaryMembership && !canSwitch) {
      setError(`You must wait ${daysUntilSwitch} more days`);
      return;
    }

    // Confirm with user
    const confirmed = window.confirm(
      'Joining as primary will unlock prayers, events, and giving for this church. Continue?'
    );
    if (!confirmed) return;

    // Execute join
    await joinOrganization(orgId, true);
    setSuccess('Successfully joined as your primary organization!');

  } catch (err: any) {
    setError(err.message || 'Failed to join organization');
  }
};
```

#### GroupBrowser

**Purpose:** Discover and manage group memberships

**Features:**
1. Search groups by name
2. Filter by visibility (PUBLIC, PRIVATE, OPEN)
3. Join/leave groups
4. Mute/unmute groups
5. Tabbed view (Active Groups vs Muted Groups)

**User Interface:**
```
┌────────────────────────────────────────────────────────┐
│  DISCOVER GROUPS                            [X]        │
├────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 Search: [_______________________________] 🔎       │
│                                                         │
│  [Active Groups] [Muted Groups]                        │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ 👥 Youth Ministry Leadership     PRIVATE│           │
│  │ First Baptist Church | 12 members       │           │
│  │ Tags: leadership, youth, planning       │           │
│  │ [Leave Group]  [Mute]                   │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ 👥 Worship Team                   PUBLIC│           │
│  │ First Baptist Church | 45 members       │           │
│  │ Tags: worship, music, arts              │           │
│  │ [Join Group]                            │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
└────────────────────────────────────────────────────────┘
```

#### OrganizationSelector (Compact Dropdown)

**Purpose:** Quick switcher in app header/navigation

**User Interface:**
```
┌──────────────────────────────────────┐
│ 📍 First Baptist Church ▼             │
└──────────────────────────────────────┘
         │
         │ (Dropdown opens)
         ▼
┌──────────────────────────────────────┐
│ YOUR ORGANIZATIONS                    │
├──────────────────────────────────────┤
│ ⭐ First Baptist Church (Primary)    │
│ 👥 Community Youth Group             │
│ 🌍 The Global Community              │
├──────────────────────────────────────┤
│ [Browse All Organizations]           │
└──────────────────────────────────────┘
```

**Code Highlights:**
```typescript
<select
  value={primaryMembership?.organizationId || 'none'}
  onChange={(e) => {
    if (e.target.value === 'browse') {
      onBrowseClick();
    } else if (e.target.value !== 'none') {
      handleSwitchPrimary(e.target.value);
    }
  }}
>
  <option value="none">No Primary Organization</option>
  {allMemberships.map(membership => (
    <option key={membership.organizationId} value={membership.organizationId}>
      {membership.isPrimary ? '⭐ ' : ''}
      {membership.organizationName}
    </option>
  ))}
  <option value="browse">➕ Browse Organizations</option>
</select>
```

#### FeedFilterSelector

**Purpose:** Control what appears in social feed

**User Interface:**
```
┌──────────────────────────────────────┐
│ Feed Filter: [All Posts ▼]           │
└──────────────────────────────────────┘
         │
         │ (Dropdown opens)
         ▼
┌──────────────────────────────────────┐
│ FEED FILTER OPTIONS                   │
├──────────────────────────────────────┤
│ ○ All Posts                          │
│   (Primary + Secondary + Groups)     │
│                                       │
│ ○ Primary Organization Only          │
│   (First Baptist Church)             │
│                                       │
│ ● Selected Groups                    │
│   ┌────────────────────────────────┐ │
│   │ ☑ Youth Ministry               │ │
│   │ ☐ Worship Team                 │ │
│   │ ☑ Outreach Committee           │ │
│   └────────────────────────────────┘ │
│                                       │
│ [Apply Filter]                        │
└──────────────────────────────────────┘
```

**Code Highlights:**
```typescript
const handleFilterChange = async (newFilter: string) => {
  await setActiveFilter(newFilter);

  // Show feedback to user
  switch (newFilter) {
    case 'ALL':
      toast.success('Now showing all posts');
      break;
    case 'PRIMARY_ONLY':
      toast.success('Now showing only primary organization');
      break;
    case 'SELECTED_GROUPS':
      toast.success('Now showing selected groups');
      break;
  }
};
```

#### StripeConnectOnboarding

**Purpose:** Guide church admins through Stripe setup

**Flow:**
```
STEP 1: NOT CONNECTED
┌────────────────────────────────────────┐
│  ENABLE GIVING FOR YOUR CHURCH         │
├────────────────────────────────────────┤
│                                         │
│  ⚠️ Stripe not connected               │
│                                         │
│  To receive donations, you need to     │
│  connect your church's bank account    │
│  via Stripe.                           │
│                                         │
│  [Set Up Giving] ────────────────────►│
└────────────────────────────────────────┘

STEP 2: ONBOARDING STARTED
┌────────────────────────────────────────┐
│  STRIPE ONBOARDING                     │
├────────────────────────────────────────┤
│                                         │
│  Please complete your Stripe setup:    │
│                                         │
│  ✓ Create Stripe account               │
│  ⏳ Provide church information         │
│  ⏳ Add bank account                   │
│  ⏳ Verify identity                    │
│                                         │
│  [Continue Onboarding] ──────────────►│
└────────────────────────────────────────┘

STEP 3: CONNECTED
┌────────────────────────────────────────┐
│  GIVING ENABLED ✓                      │
├────────────────────────────────────────┤
│                                         │
│  Your church is ready to receive       │
│  donations!                            │
│                                         │
│  Total Received: $2,450.00             │
│  This Month: $650.00                   │
│                                         │
│  [View Stripe Dashboard]               │
│  [Update Bank Info]                    │
│                                         │
└────────────────────────────────────────┘
```

**Code Highlights:**
```typescript
const initiateOnboarding = async () => {
  try {
    // Create Stripe Connect account
    const response = await axios.post(
      `/api/stripe-connect/create-account/${organizationId}`,
      {
        returnUrl: `${window.location.origin}/admin/stripe/return`,
        refreshUrl: `${window.location.origin}/admin/stripe/refresh`
      }
    );

    // Redirect to Stripe onboarding
    window.location.href = response.data.accountLinkUrl;

  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to start Stripe onboarding');
  }
};
```

---

## Key Concepts Glossary

### Multi-Tenant
**Definition:** Architecture where a single application serves multiple independent organizations (tenants) while keeping their data isolated.

**Analogy:** Like an apartment building where each apartment is separate, but they share the same physical structure (plumbing, electricity, etc.).

**In The Gathering:** Each church is a "tenant" with their own prayers, events, and Stripe account, but they all use the same app infrastructure.

---

### Primary Organization
**Definition:** The one church/ministry that a user considers their spiritual home, which unlocks full features.

**Analogy:** Like having a home church vs. visiting other churches.

**Rules:**
- User can have 0 or 1 primary organization
- Unlocks prayers, events, announcements, giving
- Can only switch with 30-day cooldown

---

### Secondary Organization
**Definition:** Additional churches/ministries a user joins for social feed visibility only.

**Analogy:** Like following a Facebook page vs. being an admin.

**Rules:**
- User can have unlimited secondary organizations
- Only see social posts, no prayers/events/giving
- Can join/leave anytime with no cooldown

---

### Organization Switching Cooldown
**Definition:** 30-day waiting period between primary organization changes.

**Why It Exists:** Prevents abuse (users switching to donate to multiple churches for tax reasons, or switching to access sensitive prayer requests).

**Analogy:** Like moving your church membership - it's a significant commitment, not something done lightly.

---

### Feed Filter
**Definition:** User preference that controls which organizations and groups appear in their social feed.

**Options:**
1. **ALL**: Everything you're connected to
2. **PRIMARY_ONLY**: Just your home church
3. **SELECTED_GROUPS**: Custom group selection

**Analogy:** Like customizing a Twitter feed to show only certain topics.

---

### Group Muting
**Definition:** Hiding a group's posts from your feed without leaving the group.

**Analogy:** Like muting a WhatsApp group - you're still a member, but notifications are silenced.

**Difference from Leaving:**
- **Mute**: Posts hidden, still a member, can unmute anytime
- **Leave**: Fully removed, must rejoin to see content

---

### Stripe Connect
**Definition:** Payment processing system that allows platform apps to route payments to individual merchant accounts.

**In The Gathering:** Each church has their own Stripe Express account, donations route directly to their bank account.

**Platform Fee:** The Gathering takes 3%, church receives 97% of each donation.

---

### Destination Charge
**Definition:** Stripe payment pattern where platform charges the card, then automatically transfers funds to connected account.

**Flow:**
1. User donates $100
2. The Gathering's Stripe charges user's card
3. Platform keeps $3 fee
4. $97 automatically transferred to church's Stripe account
5. Church's bank receives $97 (minus Stripe's processing fee)

---

### Deep Linking
**Definition:** URLs that open specific pages in mobile apps.

**Examples:**
- `thegathering://join/org/abc-123` → Opens app to join organization page
- `https://app.thegathering.com/join/org/abc-123` → Web fallback

**Use Cases:**
- Invitation links shared via text/email
- QR codes on church bulletins
- Social media sharing

---

### Soft Delete
**Definition:** Marking database records as deleted without actually removing them.

**Implementation:** `deleted_at` timestamp column (NULL = active, non-NULL = deleted)

**Why?**
- Preserve historical data
- Allow "undo" functionality
- Maintain foreign key relationships
- Audit trails

---

### JSONB
**Definition:** PostgreSQL data type for storing flexible JSON data efficiently.

**Used For:**
- Organization settings (website, description, etc.)
- Post media arrays (URLs, types)
- Group tags
- Feed preferences (selected group IDs)

**Advantages:**
- No need to create new columns for every setting
- Query JSON fields with SQL
- Efficient storage and indexing

---

### UUID (Universally Unique Identifier)
**Definition:** 128-bit number used as primary keys in database.

**Example:** `550e8400-e29b-41d4-a716-446655440000`

**Why Not Auto-Increment IDs?**
- Globally unique (no collisions when merging databases)
- Non-sequential (harder to guess/enumerate)
- Generated anywhere (client-side, server-side, database)

---

### Flyway Migration
**Definition:** Database version control system that applies SQL migrations in order.

**Files:** `V1__initial_schema.sql`, `V2__add_groups.sql`, etc.

**How It Works:**
1. Flyway checks `flyway_schema_history` table
2. Sees which migrations already applied
3. Runs new migrations in numerical order
4. Records completion timestamp

**Why?**
- Consistent database schema across environments
- Easy rollback (create new migration to undo)
- Team collaboration without conflicts

---

### JPA (Java Persistence API)
**Definition:** Java specification for object-relational mapping (ORM).

**What It Does:** Converts Java objects to database tables automatically.

**Example:**
```java
@Entity
public class Organization {
    @Id
    private UUID id;

    private String name;

    @OneToMany(mappedBy = "organization")
    private List<UserOrganizationMembership> memberships;
}
```

**Benefits:**
- Write Java code, not SQL
- Automatic table creation
- Relationship management
- Type safety

---

### @Transactional
**Definition:** Spring annotation that wraps a method in a database transaction.

**What It Does:**
- Begins transaction when method starts
- Commits if method succeeds
- Rolls back if exception thrown

**Example:**
```java
@Transactional
public void switchPrimaryOrganization() {
    // All these DB operations happen atomically
    updateOldMembership();
    updateNewMembership();
    updateUser();
    logHistory();

    // If any fail, ALL changes are rolled back
}
```

**Why It Matters:** Prevents partial updates (e.g., user's primary org changed but membership record not updated).

---

### Context API (React)
**Definition:** React pattern for sharing state across components without prop drilling.

**Problem It Solves:**
- Passing props through 5+ levels of components is messy
- Multiple components need access to same data

**Solution:**
1. Create context: `OrganizationContext`
2. Wrap app with provider: `<OrganizationContext.Provider>`
3. Use anywhere: `const { primaryOrg } = useOrganization();`

---

### Repository Pattern
**Definition:** Abstraction layer between business logic and database.

**Structure:**
```
Controller → Service → Repository → Database
```

**Why?**
- Service doesn't need to know about SQL
- Easy to swap databases
- Consistent query interface
- Testable (mock repository in tests)

---

## Common Administrator Tasks

### Task 1: Create a New Church Organization

**Goal:** Add a new church to The Gathering platform

**Steps:**

1. **Access Admin Panel**
   - Log in as a user with ADMIN role
   - Navigate to Admin Tools → Organizations → Create New

2. **Fill Out Organization Details**
   ```
   Name: First Baptist Church
   Slug: first-baptist (URL-friendly identifier)
   Type: CHURCH
   Tier: PREMIUM
   Location: Tyler, TX
   Website: https://firstbaptist.org
   Phone: (555) 123-4567
   Email: info@firstbaptist.org
   Description: A welcoming community church in Tyler, TX
   ```

3. **Upload Media**
   - Logo: Square image (512x512px recommended)
   - Banner: Wide image (1200x400px recommended)

4. **Configure Settings**
   ```json
   {
     "allowPublicPrayers": true,
     "requireAdminApprovalForGroups": false,
     "enableGiving": true
   }
   ```

5. **Save Organization**
   - Backend creates organization record
   - Assigns you as first ADMIN
   - Organization now searchable by users

6. **Set Up Stripe Connect**
   - Go to Organization Settings → Giving
   - Click "Set Up Stripe"
   - Complete onboarding flow
   - Verify connection successful

**Verification:**
- Organization appears in search
- Logo/banner display correctly
- Stripe account shows "Connected"

---

### Task 2: Promote a User to Admin

**Goal:** Give another user administrative access to your organization

**Steps:**

1. **Find User's Membership**
   - Admin Tools → Members
   - Search for user by name/email

2. **Update Role**
   ```
   Current Role: MEMBER
   New Role: ADMIN
   ```

3. **Save Changes**
   - Backend updates: `user_organization_memberships.role = 'ADMIN'`
   - User immediately gains admin access

4. **Verify Permissions**
   - User can now:
     - Access Admin Tools
     - Set up Stripe Connect
     - Manage members
     - View analytics

**Database Change:**
```sql
UPDATE user_organization_memberships
SET role = 'ADMIN', updated_at = NOW()
WHERE user_id = 'user-uuid'
AND organization_id = 'org-uuid';
```

---

### Task 3: Investigate Why User Can't See Prayers

**Goal:** Troubleshoot missing prayer requests

**Diagnosis Steps:**

1. **Check Primary Organization**
   ```sql
   SELECT primary_organization_id FROM users WHERE id = 'user-uuid';
   ```
   - If NULL → User is social-only, prayers require primary org

2. **Check Membership**
   ```sql
   SELECT * FROM user_organization_memberships
   WHERE user_id = 'user-uuid'
   AND is_primary = true;
   ```
   - If no results → Primary org not properly set

3. **Check Prayer Organization Scope**
   ```sql
   SELECT organization_id FROM prayer_requests
   WHERE id = 'prayer-uuid';
   ```
   - Compare to user's primary org
   - If different → User can't see this prayer

**Common Causes:**
1. **User is social-only** → Tell them to join a church as primary
2. **User switched primary org** → Prayers are org-specific
3. **Prayer has restrictive privacy** → Check `privacy_level` field
4. **User left organization** → Check `user_organization_memberships` record exists

**Resolution:**
```
User must join organization as PRIMARY to see prayers:
1. Go to Discover Organizations
2. Find desired church
3. Click "Join as Primary"
4. Prayers will appear immediately
```

---

### Task 4: Manually Reset Organization Switching Cooldown

**Goal:** Allow user to switch primary org before 30 days (emergency override)

**When to Use:**
- User moved to new city
- Church closed/merged
- Technical error

**Steps:**

1. **Verify User Identity**
   - Confirm user's identity via email/phone
   - Document reason for override

2. **Delete Cooldown Record**
   ```sql
   DELETE FROM organization_switching_history
   WHERE user_id = 'user-uuid'
   AND switched_at > NOW() - INTERVAL '30 days';
   ```

3. **Notify User**
   - Send email: "Your organization switching cooldown has been reset"
   - User can now switch immediately

4. **Log Admin Action**
   ```sql
   INSERT INTO admin_audit_log (admin_id, action, user_id, reason, timestamp)
   VALUES ('admin-uuid', 'RESET_COOLDOWN', 'user-uuid', 'User relocated', NOW());
   ```

**Alternative (Less Intrusive):**
Update the history timestamp to make it appear older:
```sql
UPDATE organization_switching_history
SET switched_at = NOW() - INTERVAL '31 days'
WHERE user_id = 'user-uuid'
AND switched_at > NOW() - INTERVAL '30 days';
```

---

### Task 5: Troubleshoot Stripe Connection Issues

**Goal:** Fix organization's giving functionality

**Diagnosis Steps:**

1. **Check Stripe Account ID**
   ```sql
   SELECT stripe_connect_account_id FROM organizations
   WHERE id = 'org-uuid';
   ```
   - If NULL → Stripe not connected yet
   - If exists → Verify account status

2. **Verify Account Status**
   - Admin Tools → Giving Settings
   - Click "Check Stripe Status"
   - Backend calls: `GET /api/stripe-connect/account-status/{orgId}`

3. **Common Issues:**

   **Issue A: "Stripe account not connected"**
   - Solution: Complete onboarding flow
   - Admin → Set Up Giving → Complete Stripe forms

   **Issue B: "Charges not enabled"**
   - Stripe onboarding incomplete
   - Missing bank account information
   - Identity verification pending
   - Solution: Click "Update Account" → Complete missing steps

   **Issue C: "Details not submitted"**
   - Organization info incomplete
   - EIN/Tax ID missing
   - Solution: Re-open Stripe onboarding

4. **Test Donation Flow**
   ```
   - User with primary membership goes to Giving
   - Enters amount: $5.00
   - Submits payment
   - Check Stripe dashboard for transaction
   ```

5. **View Stripe Dashboard**
   - Admin Tools → View Stripe Dashboard
   - Backend generates login link
   - Check:
     - Recent transactions
     - Payout schedule
     - Bank account connected

**Emergency Fix:**
If account is corrupted, create new Stripe account:
```sql
UPDATE organizations
SET stripe_connect_account_id = NULL
WHERE id = 'org-uuid';
```
Then redo onboarding flow.

---

### Task 6: Export Organization Data

**Goal:** Generate CSV report of members, donations, prayers for external analysis

**Method 1: Via Admin Dashboard**
1. Admin Tools → Reports
2. Select report type: Members / Donations / Prayers
3. Date range: Last 30 days
4. Click "Export CSV"
5. Download file

**Method 2: Direct Database Query**

**Members Export:**
```sql
COPY (
  SELECT
    u.display_name,
    u.email,
    uom.role,
    uom.is_primary,
    uom.joined_at
  FROM user_organization_memberships uom
  JOIN users u ON uom.user_id = u.id
  WHERE uom.organization_id = 'org-uuid'
  ORDER BY uom.joined_at DESC
) TO '/tmp/members.csv' WITH CSV HEADER;
```

**Donations Export:**
```sql
COPY (
  SELECT
    u.display_name,
    d.amount,
    d.payment_method,
    d.status,
    d.created_at
  FROM donations d
  JOIN users u ON d.user_id = u.id
  WHERE d.organization_id = 'org-uuid'
  AND d.created_at >= NOW() - INTERVAL '30 days'
  ORDER BY d.created_at DESC
) TO '/tmp/donations.csv' WITH CSV HEADER;
```

**Prayers Export:**
```sql
COPY (
  SELECT
    pr.title,
    pr.category,
    pr.privacy_level,
    pr.prayer_count,
    pr.is_answered,
    pr.created_at
  FROM prayer_requests pr
  WHERE pr.organization_id = 'org-uuid'
  AND pr.deleted_at IS NULL
  ORDER BY pr.created_at DESC
) TO '/tmp/prayers.csv' WITH CSV HEADER;
```

**Privacy Note:** Do NOT export:
- Prayer descriptions (may contain sensitive personal information)
- Private prayers (privacy_level = 'PRIVATE')
- User passwords or auth tokens

---

### Task 7: Merge Duplicate Organizations

**Goal:** Combine two organizations that were created by mistake

**Example:** "First Baptist Church" and "First Baptist Church Tyler" are the same church

**CAUTION:** This is a destructive operation. Take backups first.

**Steps:**

1. **Identify Organizations**
   ```
   PRIMARY (keep): First Baptist Church (org-uuid-1)
   DUPLICATE (merge): First Baptist Church Tyler (org-uuid-2)
   ```

2. **Backup Data**
   ```sql
   -- Export duplicate org's data
   SELECT * FROM organizations WHERE id = 'org-uuid-2';
   SELECT * FROM user_organization_memberships WHERE organization_id = 'org-uuid-2';
   SELECT * FROM posts WHERE organization_id = 'org-uuid-2';
   SELECT * FROM prayer_requests WHERE organization_id = 'org-uuid-2';
   ```

3. **Migrate Memberships**
   ```sql
   -- Move members from duplicate to primary
   UPDATE user_organization_memberships
   SET organization_id = 'org-uuid-1'
   WHERE organization_id = 'org-uuid-2'
   -- Avoid duplicate memberships
   AND user_id NOT IN (
     SELECT user_id FROM user_organization_memberships
     WHERE organization_id = 'org-uuid-1'
   );

   -- Delete duplicate memberships
   DELETE FROM user_organization_memberships
   WHERE organization_id = 'org-uuid-2';
   ```

4. **Migrate Content**
   ```sql
   -- Move posts
   UPDATE posts
   SET organization_id = 'org-uuid-1'
   WHERE organization_id = 'org-uuid-2';

   -- Move prayers
   UPDATE prayer_requests
   SET organization_id = 'org-uuid-1'
   WHERE organization_id = 'org-uuid-2';

   -- Move events
   UPDATE events
   SET organization_id = 'org-uuid-1'
   WHERE organization_id = 'org-uuid-2';

   -- Move announcements
   UPDATE announcements
   SET organization_id = 'org-uuid-1'
   WHERE organization_id = 'org-uuid-2';
   ```

5. **Update User Primary Orgs**
   ```sql
   UPDATE users
   SET primary_organization_id = 'org-uuid-1'
   WHERE primary_organization_id = 'org-uuid-2';
   ```

6. **Update Member Counts**
   ```sql
   UPDATE organizations
   SET member_count = (
     SELECT COUNT(*) FROM user_organization_memberships
     WHERE organization_id = 'org-uuid-1'
   ),
   primary_member_count = (
     SELECT COUNT(*) FROM user_organization_memberships
     WHERE organization_id = 'org-uuid-1' AND is_primary = true
   )
   WHERE id = 'org-uuid-1';
   ```

7. **Delete Duplicate Organization**
   ```sql
   DELETE FROM organizations WHERE id = 'org-uuid-2';
   ```

8. **Notify Users**
   - Send email to all affected users
   - Explain the merge
   - Confirm their membership transferred

---

### Task 8: Create a Deep Link for Organization Invitation

**Goal:** Generate shareable link for users to join organization

**Steps:**

1. **Get Organization ID**
   ```sql
   SELECT id, slug FROM organizations
   WHERE name = 'First Baptist Church';
   -- Result: id = '550e8400-e29b-41d4-a716-446655440000'
   ```

2. **Generate Deep Links**

   **App Deep Link (opens app if installed):**
   ```
   thegathering://join/org/550e8400-e29b-41d4-a716-446655440000
   ```

   **Web Fallback (works in browsers):**
   ```
   https://app.thegathering.com/join/org/550e8400-e29b-41d4-a716-446655440000
   ```

3. **Add Tracking Parameters (optional)**
   ```
   https://app.thegathering.com/join/org/550e8400-e29b-41d4-a716-446655440000?source=email&campaign=easter
   ```

4. **Generate QR Code**
   - Use online QR generator (qr-code-generator.com)
   - Input: Web fallback URL
   - Download PNG
   - Print on church bulletin

5. **Share Links**
   - **Email**: Include in newsletter
   - **Social Media**: Post on church Facebook page
   - **SMS**: Text to congregation members
   - **Print**: QR code on bulletin, flyers

**How It Works:**
1. User clicks link (or scans QR code)
2. If app installed: Opens directly to join page
3. If app not installed: Web page with "Download App" button
4. User joins organization with one tap

**Backend Handling:**
```typescript
// deepLinkingService.ts
deepLinkingService.addListener((route) => {
  if (route.type === 'organization' && route.action === 'join') {
    // Navigate to org join page
    navigate(`/organizations/${route.id}/join`);
  }
});
```

---

## Troubleshooting Guide

### Issue 1: "You are not a member of any organization"

**Symptom:** User sees message on prayers/events page

**Cause:** User is social-only (no primary organization)

**Solution:**
1. User goes to Discover Organizations
2. Finds desired church
3. Clicks "Join as Primary"
4. Features unlock immediately

**How to Verify:**
```sql
SELECT primary_organization_id FROM users WHERE id = 'user-uuid';
-- If NULL, user has no primary org
```

---

### Issue 2: "You must wait X days before switching"

**Symptom:** User cannot change primary organization

**Cause:** 30-day cooldown active

**Check Cooldown Status:**
```sql
SELECT
  switched_at,
  EXTRACT(DAY FROM NOW() - switched_at) AS days_since,
  30 - EXTRACT(DAY FROM NOW() - switched_at) AS days_remaining
FROM organization_switching_history
WHERE user_id = 'user-uuid'
AND switched_at > NOW() - INTERVAL '30 days'
ORDER BY switched_at DESC
LIMIT 1;
```

**Solution:**
- Normal: Wait for cooldown to expire
- Emergency: Admin can manually reset (see Task 4)

---

### Issue 3: Posts Not Appearing in Feed

**Symptom:** User can't see posts from organization they joined

**Diagnosis:**

**Step 1: Check Membership**
```sql
SELECT * FROM user_organization_memberships
WHERE user_id = 'user-uuid'
AND organization_id = 'org-uuid';
-- Should return record
```

**Step 2: Check Feed Filter**
```sql
SELECT active_filter, selected_group_ids FROM feed_preferences
WHERE user_id = 'user-uuid';
```

**Cause A: Filter = PRIMARY_ONLY**
- User joined as secondary org
- PRIMARY_ONLY filter hides secondary org posts
- **Solution:** Change filter to "ALL"

**Cause B: Post in Muted Group**
```sql
SELECT is_muted FROM user_group_memberships
WHERE user_id = 'user-uuid'
AND group_id = (SELECT group_id FROM posts WHERE id = 'post-uuid');
-- If true, post is hidden
```
- **Solution:** Unmute group

**Cause C: Post Visibility Restricted**
- Post in PRIVATE group user isn't member of
- **Solution:** Join the group

---

### Issue 4: Stripe Payment Fails

**Symptom:** User gets error during donation

**Diagnosis:**

**Step 1: Check Organization Stripe Status**
```sql
SELECT stripe_connect_account_id FROM organizations
WHERE id = 'org-uuid';
```

**If NULL:**
- Stripe not connected
- **Solution:** Admin must complete onboarding

**If Exists:**
```bash
# Check Stripe account status (via API)
curl https://api.stripe.com/v1/accounts/acct_xyz \
  -u sk_live_your_secret_key:
```

**Common Issues:**

**A: "Charges Not Enabled"**
- Onboarding incomplete
- **Solution:** Admin clicks "Update Account" in dashboard

**B: "Payouts Not Enabled"**
- Bank account not verified
- **Solution:** Admin adds/verifies bank account in Stripe

**C: "Account Under Review"**
- Stripe is verifying identity documents
- **Solution:** Wait 1-3 business days

**Step 2: Check User's Payment Method**
- Expired credit card
- Insufficient funds
- Card declined by bank
- **Solution:** User tries different payment method

---

### Issue 5: Deep Link Doesn't Open App

**Symptom:** Clicking invitation link opens browser, not app

**Diagnosis:**

**Android:**
1. Check AndroidManifest.xml has intent filters
2. Verify assetlinks.json file accessible at:
   ```
   https://app.thegathering.com/.well-known/assetlinks.json
   ```
3. Check app is installed
4. Clear app data and reinstall

**iOS:**
1. Check Info.plist has URL schemes
2. Verify apple-app-site-association file at:
   ```
   https://app.thegathering.com/.well-known/apple-app-site-association
   ```
3. Check Associated Domains capability enabled
4. Delete app and reinstall

**Test Commands:**

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "thegathering://join/org/ABC123" \
  com.thegathering.app
```

**iOS:**
```bash
xcrun simctl openurl booted "thegathering://join/org/ABC123"
```

---

### Issue 6: Group Posts Visible to Non-Members

**Symptom:** Users outside group can see private posts

**Cause:** Group visibility misconfigured

**Check Group Settings:**
```sql
SELECT visibility FROM groups WHERE id = 'group-uuid';
```

**Visibility Levels:**
- `PUBLIC`: Organization members can see posts
- `PRIVATE`: Only group members see posts ✓
- `SECRET`: Group hidden from search + members only
- `OPEN`: Anyone can join and see

**Solution:**
```sql
UPDATE groups
SET visibility = 'PRIVATE'
WHERE id = 'group-uuid';
```

**Verify in Backend:**
```java
// GroupService.java should filter by membership
if (group.getVisibility() == GroupVisibility.PRIVATE) {
    // Check user is member
    boolean isMember = groupMembershipRepository
        .existsByUserIdAndGroupId(userId, groupId);
    if (!isMember) {
        throw new AccessDeniedException("Not a group member");
    }
}
```

---

### Issue 7: Migration Fails on Startup

**Symptom:** App won't start, error: "Flyway migration failed"

**Diagnosis:**

**Step 1: Check Migration Table**
```sql
SELECT * FROM flyway_schema_history
ORDER BY installed_rank DESC;
```

**If Last Migration Shows "Failed":**
```sql
-- View error details
SELECT version, description, success, installed_on
FROM flyway_schema_history
WHERE success = false;
```

**Step 2: Fix Failed Migration**

**Option A: Repair (if no data corruption)**
```sql
-- Mark migration as successful
UPDATE flyway_schema_history
SET success = true
WHERE version = 'X';
```

**Option B: Rollback (if data corrupted)**
```sql
-- Delete failed migration record
DELETE FROM flyway_schema_history
WHERE version = 'X';

-- Manually undo migration changes (if partially applied)
-- Then re-run app to retry migration
```

**Option C: Skip Version (emergency only)**
```sql
-- Manually insert record to skip version
INSERT INTO flyway_schema_history (
  installed_rank, version, description, type, script, checksum,
  installed_by, installed_on, execution_time, success
) VALUES (
  (SELECT MAX(installed_rank) + 1 FROM flyway_schema_history),
  'X', 'Manually skipped', 'SQL', 'VX__skip.sql', NULL,
  'admin', NOW(), 0, true
);
```

---

### Issue 8: High Database Load

**Symptom:** App slow, database CPU at 100%

**Diagnosis:**

**Step 1: Find Slow Queries**
```sql
-- PostgreSQL slow query log
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Common Culprits:**

**A: Missing Index on organization_id**
```sql
-- Check if index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'posts'
AND indexname LIKE '%organization_id%';

-- If not, create it
CREATE INDEX idx_posts_organization_id ON posts(organization_id);
```

**B: Feed Query Scanning Too Many Rows**
```sql
-- Add composite index for feed queries
CREATE INDEX idx_posts_org_group_created
ON posts(organization_id, group_id, created_at DESC);
```

**C: Count Queries on Large Tables**
```sql
-- Instead of COUNT(*), use estimated count
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'posts';
```

**Step 2: Enable Query Caching**
```java
// PostService.java
@Cacheable(value = "feed", key = "#userId")
public List<Post> getUserFeed(UUID userId) {
    // Expensive feed calculation cached for 5 minutes
}
```

**Step 3: Add Database Connection Pooling**
```properties
# application.properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
```

---

## Frequently Asked Questions

### Q1: Can a user have multiple primary organizations?

**Answer:** No, a user can only have ONE primary organization at a time.

**Why?**
- Prayers/events/donations are org-specific
- Allowing multiple would create confusion about which org receives donations
- 30-day cooldown encourages commitment to one church

**Workaround:**
- User can join unlimited *secondary* organizations for social feed visibility
- User can switch primary org (with cooldown)

---

### Q2: What happens to user's content when they leave an organization?

**Answer:** Content remains visible to organization members, but author loses access.

**Detailed Behavior:**

**Posts:**
- Post remains visible in organization's feed
- Author's name still shows
- Author can still edit/delete (owns the post)

**Prayer Requests:**
- Prayer remains visible to organization members
- Author can no longer see it (no longer has primary membership)
- Prayer count/praying users preserved

**Comments:**
- All comments remain visible
- Author's comments stay attributed to them

**Donations:**
- Historical donation records preserved
- Author can't make new donations (no primary membership)

**Database:**
```sql
-- Leaving org doesn't delete content
DELETE FROM user_organization_memberships
WHERE user_id = 'user-uuid' AND organization_id = 'org-uuid';
-- Posts, prayers, etc. remain in database with organization_id intact
```

---

### Q3: How do platform fees work with Stripe Connect?

**Answer:** The Gathering takes a 3% platform fee, Stripe takes ~2.9% + $0.30 processing fee.

**Example Donation: $100**

```
User donates: $100.00
├─ Stripe processing fee: -$3.20 (2.9% + $0.30)
├─ The Gathering platform fee: -$3.00 (3%)
└─ Church receives: $93.80 (93.8%)
```

**Breakdown:**
1. User's card charged: $100.00
2. Stripe immediately deducts: $3.20 (processing)
3. The Gathering deducts: $3.00 (platform fee)
4. Church's Stripe account receives: $93.80
5. Church's bank receives: $93.80 (next payout cycle)

**Code Implementation:**
```java
PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
    .setAmount(10000L)  // $100.00 in cents
    .setCurrency("usd")
    .setTransferData(
        TransferDataParams.builder()
            .setDestination(organization.getStripeConnectAccountId())
            .build()
    )
    .setApplicationFeeAmount(300L)  // $3.00 platform fee in cents
    .build();
```

**Who Manages Refunds?**
- Church handles refunds via their Stripe dashboard
- Refund returns full $100 to donor
- Platform fee not refunded

---

### Q4: Can organizations have sub-organizations?

**Answer:** Not directly, but groups serve a similar purpose.

**Current Architecture:**
- Organizations are flat (no hierarchy)
- Groups provide sub-communities within organizations

**Example:**
```
First Baptist Church (Organization)
├─ Youth Ministry (Group)
├─ Worship Team (Group)
├─ Outreach Committee (Group)
└─ Women's Bible Study (Group)
```

**If You Need True Hierarchies:**
- Create separate organizations for each campus/branch
- Use parent_organization_id foreign key (requires schema change)

**Future Enhancement:**
```sql
ALTER TABLE organizations
ADD COLUMN parent_organization_id UUID REFERENCES organizations(id);

-- Example:
-- First Baptist Church (parent_id = NULL)
--   ├─ First Baptist Downtown (parent_id = First Baptist)
--   └─ First Baptist Westside (parent_id = First Baptist)
```

---

### Q5: Why is there a 30-day cooldown on switching primary organizations?

**Answer:** To prevent abuse and encourage commitment.

**Abuse Scenarios Prevented:**

**1. Tax Fraud:**
- User donates $1000 to Church A in January
- Switches to Church B in February, donates $1000
- Switches to Church C in March, donates $1000
- Claims $3000 in tax deductions for different churches
- 30-day limit restricts to ~12 orgs per year

**2. Prayer Request Access:**
- Private prayers contain sensitive information
- User switches orgs to read all private prayers
- Cooldown prevents rapid org-hopping

**3. Event RSVP Manipulation:**
- User RSVPs to Church A's retreat (limited spots)
- Switches to Church B before retreat date
- Church A can't contact user (no longer member)

**Exceptions:**
- No cooldown on *secondary* organization joins
- Admins can manually reset cooldown for legitimate reasons

---

### Q6: How does content visibility work for groups?

**Answer:** Depends on group visibility setting.

**Visibility Matrix:**

| Visibility | Who Can See Group | Who Can See Posts | Who Can Join |
|------------|------------------|------------------|--------------|
| PUBLIC     | All org members  | All org members  | Request to join |
| PRIVATE    | Members only     | Members only     | Invitation only |
| SECRET     | Members only     | Members only     | Invitation only |
| OPEN       | All org members  | All org members  | Auto-join |

**Example:**

**Youth Ministry (PRIVATE):**
- Only members see group in browse list
- Only members see posts
- Non-members can't even search for it
- Leader must invite users

**General Discussion (OPEN):**
- Everyone in org sees group
- Everyone sees posts
- Anyone can join with one click

**Code Check:**
```java
// GroupService.java
public List<Post> getGroupPosts(UUID groupId, UUID userId) {
    Group group = groupRepository.findById(groupId).orElseThrow();

    if (group.getVisibility() == GroupVisibility.PRIVATE
        || group.getVisibility() == GroupVisibility.SECRET) {
        // Verify membership
        boolean isMember = groupMembershipRepository
            .existsByUserIdAndGroupId(userId, groupId);
        if (!isMember) {
            throw new AccessDeniedException("Not a group member");
        }
    }

    return postRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
}
```

---

### Q7: What happens during the V13 migration?

**Answer:** All existing users/content migrated to "Global" organization.

**Migration Steps:**

1. **Create Global Organization**
   - ID: `00000000-0000-0000-0000-000000000001`
   - Name: "The Gathering Community"
   - Type: GLOBAL
   - Tier: PREMIUM

2. **Migrate All Users**
   - Create membership record for each user
   - Set Global as primary organization
   - Preserve original user roles

3. **Migrate All Content**
   - Posts: `organization_id = Global`
   - Prayers: `organization_id = Global`
   - Events: `organization_id = Global`
   - Announcements: `organization_id = Global`

4. **Create General Discussion Group**
   - Public group for community discussions
   - All users auto-joined

5. **Update Statistics**
   - Organization member counts
   - Group member counts

**Result:**
- Existing users see no change in functionality
- All content preserved
- App now supports multi-tenancy
- Churches can create new organizations

**Rollback Plan:**
```sql
-- If migration fails, rollback:
DELETE FROM user_organization_memberships
WHERE organization_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM organizations
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE posts SET organization_id = NULL;
UPDATE prayer_requests SET organization_id = NULL;
-- etc.
```

---

### Q8: Can I customize the 30-day cooldown period?

**Answer:** Yes, via backend configuration.

**Method 1: Application Properties**
```properties
# application.properties
gathering.organization.switching-cooldown-days=30
```

**Method 2: Database-Driven**
```sql
-- Add to organizations table
ALTER TABLE organizations
ADD COLUMN switching_cooldown_days INTEGER DEFAULT 30;

-- Different cooldowns per org
UPDATE organizations
SET switching_cooldown_days = 7  -- 1 week for testing
WHERE slug = 'test-church';
```

**Code Update:**
```java
// OrganizationService.java
@Value("${gathering.organization.switching-cooldown-days:30}")
private int cooldownDays;

public void switchPrimaryOrganization(UUID userId, UUID newOrgId) {
    List<OrganizationSwitchingHistory> recent =
        historyRepository.findByUserIdAndSwitchedAtAfter(
            userId,
            LocalDateTime.now().minusDays(cooldownDays)  // Use config value
        );
    // ... rest of logic
}
```

**Testing Override:**
```properties
# application-dev.properties
gathering.organization.switching-cooldown-days=0  # Disable for testing
```

---

### Q9: How do I backup the database before major changes?

**Answer:** Use PostgreSQL's pg_dump utility.

**Full Database Backup:**
```bash
pg_dump -U postgres -h localhost -d gathering_db > backup_$(date +%Y%m%d).sql
```

**Specific Tables Only:**
```bash
pg_dump -U postgres -h localhost -d gathering_db \
  -t users \
  -t organizations \
  -t user_organization_memberships \
  > backup_users_orgs.sql
```

**Automated Daily Backups (Cron):**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U postgres gathering_db > /backups/gathering_$(date +\%Y\%m\%d).sql

# Keep only last 7 days
0 3 * * * find /backups -name "gathering_*.sql" -mtime +7 -delete
```

**Restore from Backup:**
```bash
# Stop app first
psql -U postgres -d gathering_db < backup_20250114.sql
```

**Test Restore:**
```bash
# Create test database
createdb -U postgres gathering_db_test

# Restore to test DB
psql -U postgres -d gathering_db_test < backup_20250114.sql

# Verify data
psql -U postgres -d gathering_db_test -c "SELECT COUNT(*) FROM users;"
```

---

### Q10: How do I monitor app performance in production?

**Answer:** Use Spring Boot Actuator + monitoring tools.

**Enable Actuator:**
```properties
# application.properties
management.endpoints.web.exposure.include=health,metrics,info
management.endpoint.health.show-details=always
```

**Key Metrics Endpoints:**

**Health Check:**
```bash
curl http://localhost:8080/actuator/health
# Returns: {"status":"UP","components":{"db":{"status":"UP"}}}
```

**Database Metrics:**
```bash
curl http://localhost:8080/actuator/metrics/hikari.connections.active
# Shows current DB connection pool usage
```

**JVM Memory:**
```bash
curl http://localhost:8080/actuator/metrics/jvm.memory.used
```

**HTTP Request Metrics:**
```bash
curl http://localhost:8080/actuator/metrics/http.server.requests
```

**Custom Metrics:**
```java
// Add to services
@Autowired
private MeterRegistry meterRegistry;

public void createPost(Post post) {
    meterRegistry.counter("posts.created",
        "organization", post.getOrganizationId().toString()
    ).increment();
    // ... rest of method
}
```

**Monitoring Tools:**

**Option 1: Prometheus + Grafana**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-boot'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['localhost:8080']
```

**Option 2: New Relic**
```properties
# newrelic.yml
app_name: The Gathering
license_key: YOUR_LICENSE_KEY
```

**Option 3: Datadog**
```bash
# Install Datadog agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=YOUR_KEY bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

**Alerting Rules:**
```yaml
# alerts.yml
groups:
  - name: gathering_alerts
    rules:
      - alert: HighDatabaseConnections
        expr: hikari_connections_active > 15
        for: 5m
        annotations:
          summary: "High database connection usage"

      - alert: SlowAPIResponse
        expr: http_server_requests_seconds_sum > 2
        for: 1m
        annotations:
          summary: "API response time > 2 seconds"
```

---

## Conclusion

This multi-tenant system enables The Gathering to serve both as:
1. **Standalone social network** for Christian community
2. **White-labeled church management platform** for individual churches

**Key Architectural Decisions:**
- Primary vs. Secondary organization distinction
- 30-day switching cooldown
- Stripe Connect destination charges
- Feed filtering system
- Group muting functionality
- Deep linking for invitations

**For Future Administrators:**
- Always take database backups before major changes
- Monitor Stripe Connect account statuses regularly
- Use organization switching cooldown sparingly (only for emergencies)
- Keep feed filtering logic simple (complexity harms user experience)
- Document any customizations in this guide

**Getting Help:**
- Backend code: `backend/src/main/java/com/gathering/`
- Frontend code: `frontend/src/`
- Database migrations: `backend/src/main/resources/db/migration/`
- Documentation: `DEEP_LINKING_SETUP.md`, `TESTING_GUIDE.md`

**Contact:**
- For questions about this architecture, refer to conversation history
- For Stripe Connect issues, see [Stripe Connect Documentation](https://stripe.com/docs/connect)
- For PostgreSQL optimization, see [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-14
**Maintained By:** The Gathering Development Team
