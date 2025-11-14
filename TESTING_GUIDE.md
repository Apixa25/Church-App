# Multi-Tenant Testing Guide

This guide provides comprehensive testing scenarios for The Gathering's multi-tenant system.

## Prerequisites

1. Backend server running on http://localhost:8080
2. Frontend server running on http://localhost:3000
3. PostgreSQL database with migrations V1-V13 applied
4. Test Stripe API keys configured
5. At least 3 test user accounts created

## Test Data Setup

### Create Test Organizations

```sql
-- Church 1: First Baptist Church
INSERT INTO organizations (id, name, slug, type, tier, status, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'First Baptist Church',
    'first-baptist',
    'CHURCH',
    'PREMIUM',
    'ACTIVE',
    NOW(),
    NOW()
);

-- Church 2: Grace Community Church
INSERT INTO organizations (id, name, slug, type, tier, status, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Grace Community Church',
    'grace-community',
    'CHURCH',
    'BASIC',
    'ACTIVE',
    NOW(),
    NOW()
);

-- Ministry: Youth Ministry Network
INSERT INTO organizations (id, name, slug, type, tier, status, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Youth Ministry Network',
    'youth-ministry-network',
    'MINISTRY',
    'PREMIUM',
    'ACTIVE',
    NOW(),
    NOW()
);
```

### Create Test Groups

```sql
-- Group 1: First Baptist - Young Adults
INSERT INTO groups (id, name, description, visibility, organization_id, creator_id, created_at, updated_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Young Adults',
    'A group for young adults ages 18-30',
    'ORG_PRIVATE',
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM users WHERE email = 'admin@test.com'),
    NOW(),
    NOW()
);

-- Group 2: Cross-organization Prayer Warriors
INSERT INTO groups (id, name, description, visibility, organization_id, creator_id, created_at, updated_at)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    'Prayer Warriors',
    'Intercession and prayer support across churches',
    'CROSS_ORG',
    NULL,
    (SELECT id FROM users WHERE email = 'admin@test.com'),
    NOW(),
    NOW()
);
```

## User Journey Testing

### Journey 1: New User (No Primary Organization)

**Objective**: Verify social-only user experience

1. **Registration**
   - [ ] Create new account
   - [ ] Verify no primary organization assigned
   - [ ] Verify user can access dashboard

2. **Limited Access**
   - [ ] Try to create prayer request → Should show "join organization first" message
   - [ ] Try to view events → Should show "join organization first" message
   - [ ] Try to make donation → Should show "join organization first" message
   - [ ] Verify announcements are not accessible

3. **Social Features**
   - [ ] Can view global feed posts
   - [ ] Can create post to global feed
   - [ ] Can comment on posts
   - [ ] Can like posts
   - [ ] Can join public groups

4. **Organization Discovery**
   - [ ] Navigate to OrganizationBrowser
   - [ ] Search for "Baptist"
   - [ ] View organization details
   - [ ] See "Join as Primary" and "Join as Secondary" buttons

**Expected Results**:
- User can use social features
- User cannot access prayers/events/donations without primary org
- User can browse and join organizations

---

### Journey 2: Church Member (Single Primary Organization)

**Objective**: Verify full church member experience

1. **Join Church as Primary**
   - [ ] Click "Join as Primary" on First Baptist Church
   - [ ] Verify membership created with isPrimary=true
   - [ ] Verify redirected to organization page
   - [ ] Verify OrganizationSelector shows "First Baptist Church"

2. **Full Access Unlocked**
   - [ ] Navigate to prayers → Can view org-specific prayers
   - [ ] Create new prayer request → Should save with organizationId
   - [ ] Navigate to events → Can view org-specific events
   - [ ] Navigate to donations → Can access donation form
   - [ ] View announcements → Can see org announcements

3. **Scoped Content**
   - [ ] Create post → Should show organization selector
   - [ ] Select "First Baptist Church" and post
   - [ ] Verify post appears in feed
   - [ ] Verify post has organizationId set correctly

4. **Feed Filtering**
   - [ ] Click FeedFilterSelector
   - [ ] Try "Primary Organization Only" filter
   - [ ] Verify only First Baptist posts shown
   - [ ] Try "All Posts" filter
   - [ ] Verify global + org posts shown

5. **Group Participation**
   - [ ] Navigate to GroupBrowser
   - [ ] Join "Young Adults" group (org-private)
   - [ ] Post to Young Adults group
   - [ ] Mute Young Adults group
   - [ ] Verify posts no longer in feed
   - [ ] Unmute group
   - [ ] Verify posts appear again

**Expected Results**:
- User has full access to all features
- Content is properly scoped to organization
- Feed filtering works correctly
- Group muting works correctly

---

### Journey 3: Multi-Church Member (Primary + Secondary)

**Objective**: Verify secondary organization visibility and switching

1. **Join Secondary Organization**
   - [ ] Navigate to OrganizationBrowser
   - [ ] Find "Grace Community Church"
   - [ ] Click "Join as Secondary"
   - [ ] Verify membership created with isPrimary=false
   - [ ] Verify OrganizationSelector shows both orgs

2. **Secondary Org Feed Visibility**
   - [ ] View feed with "All Posts" filter
   - [ ] Verify seeing posts from both churches
   - [ ] Verify only PUBLIC posts from Grace Community visible
   - [ ] Verify all posts from First Baptist visible

3. **Organization Switching Restrictions**
   - [ ] Try to switch primary org immediately
   - [ ] Verify 30-day cooldown message shown
   - [ ] Check "Can switch in X days" display

4. **Post Targeting**
   - [ ] Create new post
   - [ ] Open advanced options
   - [ ] See organization dropdown
   - [ ] Select "Grace Community Church (Secondary)"
   - [ ] Verify cannot post (or post goes to their feed only)

5. **Prayer/Event Access**
   - [ ] Navigate to prayers
   - [ ] Verify only seeing First Baptist prayers (primary org)
   - [ ] Navigate to events
   - [ ] Verify only seeing First Baptist events

**Expected Results**:
- Secondary org public posts visible in feed
- Cannot switch primary org due to cooldown
- Prayers/events still scoped to primary org only
- Clear distinction between primary and secondary access

---

### Journey 4: Group Creator/Moderator

**Objective**: Verify group management capabilities

1. **Create Group**
   - [ ] Navigate to GroupBrowser
   - [ ] Click "Create Group"
   - [ ] Fill in group details:
     - Name: "Bible Study Leaders"
     - Description: "For small group leaders"
     - Visibility: ORG_PRIVATE
     - Tags: ["bible-study", "leadership"]
   - [ ] Submit and verify group created
   - [ ] Verify creator role is ADMIN

2. **Group Settings**
   - [ ] Set max members to 50
   - [ ] Update group description
   - [ ] Add/remove tags
   - [ ] Change visibility to CROSS_ORG

3. **Member Management**
   - [ ] Invite members to group
   - [ ] Approve/deny join requests
   - [ ] Promote member to MODERATOR
   - [ ] Remove member from group

4. **Group Content**
   - [ ] Post to group
   - [ ] Verify only group members see post
   - [ ] Delete inappropriate post (as admin)
   - [ ] Pin important announcement

5. **Group Visibility Testing**
   - [ ] Change to PUBLIC → Verify non-members can see
   - [ ] Change to INVITE_ONLY → Verify hidden from browser
   - [ ] Change to CROSS_ORG → Verify visible across orgs

**Expected Results**:
- Group creation works correctly
- Admin/moderator permissions enforced
- Visibility settings work as expected
- Content properly scoped to group

---

### Journey 5: Organization Admin (Donations & Stripe)

**Objective**: Verify Stripe Connect onboarding and donation processing

1. **Become Org Admin**
   - [ ] Promote test user to ADMIN role
   - [ ] Verify admin permissions granted

2. **Stripe Connect Onboarding**
   - [ ] Navigate to /organization/{orgId}/stripe-connect
   - [ ] Click "Get Started with Stripe"
   - [ ] Verify redirected to Stripe onboarding
   - [ ] Complete onboarding in test mode
   - [ ] Return to app
   - [ ] Verify account status shows "Active"

3. **Account Management**
   - [ ] Click "Open Stripe Dashboard"
   - [ ] Verify dashboard opens in new tab
   - [ ] Check transaction history
   - [ ] Click "Update Account Details"
   - [ ] Complete update flow

4. **Donation Testing (as donor)**
   - [ ] Switch to regular user account
   - [ ] Navigate to donations page
   - [ ] Select organization (should be primary org)
   - [ ] Enter donation amount: $25.00
   - [ ] Select category: "General Fund"
   - [ ] Complete payment with test card: 4242 4242 4242 4242
   - [ ] Verify donation successful
   - [ ] Check donation appears in history

5. **Donation Verification (as admin)**
   - [ ] Switch back to admin account
   - [ ] Check Stripe dashboard
   - [ ] Verify payment received
   - [ ] Verify correct amount after fees
   - [ ] Check app donation records

**Expected Results**:
- Only admins can set up Stripe
- Onboarding flow works smoothly
- Donations route to correct organization
- Destination charges working correctly
- Donation records accurate

---

### Journey 6: Feed Filtering Advanced

**Objective**: Comprehensive feed filtering testing

1. **Setup**
   - [ ] User is member of:
     - Primary: First Baptist
     - Secondary: Grace Community
     - Groups: Young Adults, Prayer Warriors, Bible Study

2. **Filter: ALL Posts**
   - [ ] Select "All Posts" filter
   - [ ] Verify seeing:
     - All First Baptist posts (primary)
     - Only PUBLIC Grace Community posts
     - All posts from joined groups (unmuted)
   - [ ] Count total posts visible

3. **Filter: PRIMARY_ONLY**
   - [ ] Select "Primary Organization Only"
   - [ ] Verify seeing:
     - Only First Baptist posts
     - No Grace Community posts
     - No group posts
   - [ ] Verify count is reduced

4. **Filter: SELECTED_GROUPS**
   - [ ] Select "Selected Groups Only"
   - [ ] Choose groups: ["Young Adults", "Prayer Warriors"]
   - [ ] Apply filter
   - [ ] Verify seeing:
     - Only posts from selected groups
     - No organizational posts
     - No Bible Study group posts

5. **Muting Impact**
   - [ ] Mute "Prayer Warriors" group
   - [ ] Refresh feed
   - [ ] Verify Prayer Warriors posts gone from "All Posts"
   - [ ] Verify can still see in "Selected Groups" if explicitly chosen

**Expected Results**:
- All filter modes work correctly
- Visibility rules properly enforced
- Muting works across all filters
- Feed updates reflect current settings

---

### Journey 7: Deep Linking

**Objective**: Verify invitation links work correctly

1. **Generate Organization Invite**
   - [ ] Navigate to organization page
   - [ ] Click "Invite Members"
   - [ ] Copy invitation link
   - [ ] Verify format: `thegathering://join/org/{orgId}`

2. **Test Deep Link (Mobile)**
   - [ ] Send link to test device
   - [ ] Click link
   - [ ] Verify app opens (if installed)
   - [ ] Verify taken to join page
   - [ ] Complete join flow
   - [ ] Verify membership created

3. **Test Web Fallback**
   - [ ] Open link in browser (app not installed)
   - [ ] Verify redirects to web join page
   - [ ] Complete join on web
   - [ ] Verify works correctly

4. **Group Invite Link**
   - [ ] Generate group invite
   - [ ] Test on mobile
   - [ ] Verify join flow
   - [ ] Verify membership created

5. **Share Post Link**
   - [ ] Share post via link
   - [ ] Open link
   - [ ] Verify post displays
   - [ ] Verify can comment/interact

**Expected Results**:
- Links open app when installed
- Web fallback works when app not installed
- Join flows complete successfully
- Proper attribution for referrals

---

## API Testing

### Authentication Tests

```bash
# Get token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Use token in subsequent requests
export TOKEN="your-jwt-token"
```

### Organization API Tests

```bash
# List all organizations
curl http://localhost:8080/api/organizations \
  -H "Authorization: Bearer $TOKEN"

# Join organization as primary
curl -X POST http://localhost:8080/api/organizations/{orgId}/join?isPrimary=true \
  -H "Authorization: Bearer $TOKEN"

# Switch primary organization (should fail if < 30 days)
curl -X POST http://localhost:8080/api/organizations/{newOrgId}/switch-primary \
  -H "Authorization: Bearer $TOKEN"

# Check switch eligibility
curl http://localhost:8080/api/organizations/switch-primary/can-switch \
  -H "Authorization: Bearer $TOKEN"
```

### Group API Tests

```bash
# Create group
curl -X POST http://localhost:8080/api/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "description": "A test group",
    "visibility": "PUBLIC",
    "organizationId": "11111111-1111-1111-1111-111111111111"
  }'

# Join group
curl -X POST http://localhost:8080/api/groups/{groupId}/join \
  -H "Authorization: Bearer $TOKEN"

# Mute group
curl -X POST http://localhost:8080/api/groups/{groupId}/mute \
  -H "Authorization: Bearer $TOKEN"

# Get my groups
curl http://localhost:8080/api/groups/my-groups \
  -H "Authorization: Bearer $TOKEN"
```

### Feed API Tests

```bash
# Get multi-tenant feed
curl "http://localhost:8080/api/posts/feed?feedType=community&page=0&size=20" \
  -H "Authorization: Bearer $TOKEN"

# Get organization feed
curl "http://localhost:8080/api/posts/feed/organization/{orgId}?page=0&size=20" \
  -H "Authorization: Bearer $TOKEN"

# Create post with org context
curl -X POST http://localhost:8080/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test post to organization",
    "organizationId": "11111111-1111-1111-1111-111111111111",
    "postType": "GENERAL"
  }'
```

### Feed Preference API Tests

```bash
# Get feed preferences
curl http://localhost:8080/api/feed-preferences \
  -H "Authorization: Bearer $TOKEN"

# Set filter to PRIMARY_ONLY
curl -X POST http://localhost:8080/api/feed-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activeFilter": "PRIMARY_ONLY",
    "selectedGroupIds": []
  }'

# Set filter to SELECTED_GROUPS
curl -X POST http://localhost:8080/api/feed-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activeFilter": "SELECTED_GROUPS",
    "selectedGroupIds": ["44444444-4444-4444-4444-444444444444"]
  }'
```

### Stripe Connect API Tests

```bash
# Create Stripe account (admin only)
curl -X POST http://localhost:8080/api/stripe-connect/create-account/{orgId} \
  -H "Authorization: Bearer $TOKEN"

# Get account status
curl http://localhost:8080/api/stripe-connect/account-status/{orgId} \
  -H "Authorization: Bearer $TOKEN"

# Create dashboard link
curl -X POST http://localhost:8080/api/stripe-connect/create-dashboard-link/{orgId} \
  -H "Authorization: Bearer $TOKEN"
```

## Performance Testing

### Load Testing Scenarios

1. **Concurrent Feed Requests**
   - 100 users requesting feed simultaneously
   - Verify response time < 2s
   - Verify no database deadlocks

2. **Organization Join Flood**
   - 50 users joining same organization
   - Verify all memberships created
   - Verify member count accurate

3. **Group Mute/Unmute Toggle**
   - Rapid mute/unmute by multiple users
   - Verify feed updates correctly
   - Verify no race conditions

## Security Testing

### Authorization Tests

1. **Non-member Access**
   - [ ] Try to access org-private content without membership
   - [ ] Verify 403 Forbidden
   - [ ] Try to join INVITE_ONLY group without invite
   - [ ] Verify rejection

2. **Role-based Access**
   - [ ] Regular member tries to delete group → Should fail
   - [ ] Admin tries to delete group → Should succeed
   - [ ] Moderator tries to kick member → Should succeed

3. **Org Switching Exploit**
   - [ ] Try to manipulate API to bypass 30-day cooldown
   - [ ] Verify server-side validation prevents it

4. **Feed Injection**
   - [ ] Try to see posts from non-member organization
   - [ ] Verify not visible in feed
   - [ ] Try to manipulate feed filter API
   - [ ] Verify server validates membership

## Regression Testing Checklist

After each deployment:

- [ ] Existing users can still log in
- [ ] Global organization still exists
- [ ] Legacy posts still visible
- [ ] Feed still loads
- [ ] Prayers/events accessible
- [ ] Donations still work
- [ ] Group memberships intact
- [ ] No broken foreign keys
- [ ] Migration V13 idempotent (can run multiple times safely)

## Bug Reporting Template

When reporting issues, include:

```markdown
### Bug Description
[Clear description of the issue]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [And so on...]

### Expected Behavior
[What you expected to happen]

### Actual Behavior
[What actually happened]

### Environment
- User Role: [MEMBER/ADMIN/MODERATOR]
- Primary Org: [Organization name/ID]
- Secondary Orgs: [List of organizations]
- Groups: [List of groups]
- Browser/Device: [Browser version or device info]

### Screenshots
[If applicable]

### API Response
[If applicable, include error response]
```

## Success Criteria

The multi-tenant system is working correctly when:

- ✅ All 7 user journeys complete without errors
- ✅ All API tests return expected responses
- ✅ Feed filtering works correctly for all modes
- ✅ Organization switching enforces 30-day cooldown
- ✅ Stripe Connect onboarding completes successfully
- ✅ Deep linking opens correct pages
- ✅ Security tests pass (no unauthorized access)
- ✅ Performance meets requirements (< 2s response time)
- ✅ Migration V13 runs successfully
- ✅ No data loss or corruption

## Next Steps After Testing

1. Deploy to staging environment
2. Run full test suite again
3. Perform load testing with realistic data volumes
4. Get stakeholder approval
5. Plan production deployment
6. Create rollback plan
7. Deploy to production
8. Monitor metrics for 48 hours
9. Gather user feedback
10. Iterate based on feedback

---

**Happy Testing!** 🎉

For questions or issues, contact the development team.
