import api from './api';
import { prayerAPI } from './prayerApi';
import { announcementAPI } from './announcementApi';
import { eventAPI } from './eventApi';
import { resourceAPI } from './resourceApi';
import { Resource } from '../types/Resource';

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  userDisplayName: string;
  userProfilePicUrl?: string;
  userId?: string;
  timestamp: string | number[];
  actionUrl?: string;
  iconType: string;
  metadata?: any;
}

export interface DashboardStats {
  totalMembers: number;
  newMembersThisWeek: number;
  totalPrayerRequests: number;
  activePrayerRequests: number;
  answeredPrayerRequests: number;
  upcomingEvents: number;
  unreadAnnouncements: number;
  additionalStats: Record<string, any>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  actionUrl: string;
  iconType: string;
  buttonText: string;
  requiresAuth: boolean;
  requiredRole?: string;
}

export interface NotificationPreview {
  type: string;
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
}

export interface NotificationSummary {
  totalUnread: number;
  prayerRequests: number;
  announcements: number;
  chatMessages: number;
  events: number;
  previews: NotificationPreview[];
}

export interface DashboardResponse {
  recentActivity: DashboardActivityItem[];
  stats: DashboardStats;
  quickActions: QuickAction[];
  notifications: NotificationSummary;
  lastUpdated: string;
}

const dashboardApi = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getActivityFeed: async (): Promise<DashboardResponse> => {
    const response = await api.get('/dashboard/activity');
    return response.data;
  },

  getStats: async (): Promise<{ stats: DashboardStats; lastUpdated: string }> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getNotifications: async (): Promise<{ notifications: NotificationSummary; lastUpdated: string }> => {
    const response = await api.get('/dashboard/notifications');
    return response.data;
  },

  getQuickActions: async (): Promise<{ quickActions: QuickAction[]; lastUpdated: string }> => {
    const response = await api.get('/dashboard/quick-actions');
    return response.data;
  },

  // Prayer Request specific dashboard functions
  getPrayerActivityItems: async (limit: number = 10): Promise<DashboardActivityItem[]> => {
    try {
      // Get recent prayer requests for dashboard
      const response = await prayerAPI.getAllPrayerRequests(0, limit);
      const prayers = response.data.content || response.data;
      
      return prayers.map(prayer => ({
        id: prayer.id,
        type: 'prayer_request',
        title: prayer.title,
        description: prayer.description || 'Prayer request submitted',
        userDisplayName: prayer.isAnonymous ? 'Anonymous' : prayer.userName,
        userProfilePicUrl: prayer.isAnonymous ? undefined : prayer.userProfilePicUrl,
        userId: prayer.isAnonymous ? undefined : prayer.userId,
        timestamp: prayer.createdAt,
        actionUrl: `/prayers/${prayer.id}`,
        iconType: 'prayer',
        metadata: {
          category: prayer.category,
          status: prayer.status,
          isAnonymous: prayer.isAnonymous,
          interactionCount: prayer.interactionSummary?.totalInteractions || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching prayer activity items:', error);
      return [];
    }
  },

  getPrayerQuickActions: (): QuickAction[] => {
    return [
      {
        id: 'view-prayers',
        title: 'Prayer Requests',
        description: 'View, submit, and manage prayer requests with the community',
        actionUrl: '/prayers',
        iconType: 'prayer',
        buttonText: 'Prayer Requests',
        requiresAuth: true
      }
    ];
  },

  // Announcement specific dashboard functions
  getAnnouncementActivityItems: async (limit: number = 10): Promise<DashboardActivityItem[]> => {
    try {
      // Get recent announcements for dashboard
      const response = await announcementAPI.getAnnouncementsForFeed(limit);
      const announcements = response.data;
      
      return announcements.map(announcement => ({
        id: announcement.id,
        type: 'announcement',
        title: announcement.title,
        description: announcement.content.length > 100 
          ? announcement.content.substring(0, 100) + '...' 
          : announcement.content,
        userDisplayName: announcement.userName,
        userProfilePicUrl: announcement.userProfilePicUrl,
        userId: announcement.userId,
        timestamp: announcement.createdAt,
        actionUrl: `/announcements/${announcement.id}`,
        iconType: 'announcement',
        metadata: {
          category: announcement.category,
          isPinned: announcement.isPinned,
          userRole: announcement.userRole
        }
      }));
    } catch (error) {
      console.error('Error fetching announcement activity items:', error);
      return [];
    }
  },

  getAnnouncementQuickActions: (userRole?: string): QuickAction[] => {
    const actions: QuickAction[] = [
      {
        id: 'view-announcements',
        title: 'Announcements',
        description: 'View church announcements and important updates',
        actionUrl: '/announcements',
        iconType: 'announcement',
        buttonText: 'View Announcements',
        requiresAuth: true
      }
    ];

    // Add create action for admins and moderators
    if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
      actions.push({
        id: 'create-announcement',
        title: 'New Announcement',
        description: 'Create a new church announcement',
        actionUrl: '/announcements/create',
        iconType: 'create',
        buttonText: 'New Announcement',
        requiresAuth: true,
        requiredRole: 'ADMIN,MODERATOR'
      });
    }

    return actions;
  },

  // Event specific dashboard functions
  getEventActivityItems: async (limit: number = 10): Promise<DashboardActivityItem[]> => {
    try {
      // FIXED: Get recently created events (not just upcoming events) for activity feed
      // Use the new getRecentEvents endpoint to get events ordered by creation date
      const response = await eventAPI.getRecentEvents({ 
        page: 0, 
        size: limit
      });
      const events = response.data.events;
      
      return events.map(event => ({
        id: event.id,
        type: 'event',
        title: event.title,
        description: event.description || `Event scheduled for ${new Date(event.startTime).toLocaleDateString()}`,
        userDisplayName: event.creatorName,
        userProfilePicUrl: event.creatorProfilePicUrl,
        userId: event.creatorId,
        timestamp: event.createdAt, // Use createdAt for chronological ordering
        actionUrl: `/events/${event.id}`,
        iconType: 'event',
        metadata: {
          category: event.category,
          status: event.status,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          attendeeCount: event.rsvpSummary?.totalAttendees || 0,
          rsvpCount: event.rsvpSummary?.totalResponses || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching event activity items:', error);
      return [];
    }
  },

  // Get recent RSVPs for dashboard
  getRsvpActivityItems: async (limit: number = 5): Promise<DashboardActivityItem[]> => {
    try {
      const response = await eventAPI.getUserUpcomingRsvps();
      const rsvps = response.data.slice(0, limit);
      
      return rsvps.map(rsvp => ({
        id: `rsvp-${rsvp.eventId}`,
        type: 'rsvp',
        title: `RSVP: ${rsvp.eventTitle}`,
        description: `You're ${rsvp.response.toLowerCase()} for this event`,
        userDisplayName: rsvp.userName,
        userProfilePicUrl: rsvp.userProfilePicUrl,
        userId: rsvp.userId,
        timestamp: rsvp.timestamp,
        actionUrl: `/events/${rsvp.eventId}`,
        iconType: 'rsvp',
        metadata: {
          response: rsvp.response,
          eventStartTime: rsvp.eventStartTime,
          eventLocation: rsvp.eventLocation,
          guestCount: rsvp.guestCount
        }
      }));
    } catch (error) {
      console.error('Error fetching RSVP activity items:', error);
      return [];
    }
  },

  getEventQuickActions: (): QuickAction[] => {
    return [
      {
        id: 'view-calendar',
        title: 'Calendar & Events',
        description: 'View upcoming events and manage your RSVPs',
        actionUrl: '/calendar',
        iconType: 'calendar',
        buttonText: 'View Calendar',
        requiresAuth: true
      },
      {
        id: 'my-rsvps',
        title: 'My RSVPs',
        description: 'View events you\'ve RSVP\'d to',
        actionUrl: '/events',
        iconType: 'rsvp',
        buttonText: 'My Events',
        requiresAuth: true
      }
    ];
  },

  // Resource specific dashboard functions
  getResourceActivityItems: async (limit: number = 10): Promise<DashboardActivityItem[]> => {
    try {
      // Get recent approved resources for dashboard
      const response = await resourceAPI.getRecentResourcesForFeed(limit);
      const resources = response.data;
      
      return resources.map((resource: Resource) => ({
        id: resource.id,
        type: 'resource',
        title: resource.title,
        description: resource.description || 'New resource uploaded',
        userDisplayName: resource.uploaderName,
        userProfilePicUrl: resource.uploaderProfilePicUrl,
        userId: resource.uploadedById,
        timestamp: resource.createdAt,
        actionUrl: `/resources/${resource.id}`,
        iconType: 'resource',
        metadata: {
          category: resource.category,
          fileName: resource.fileName,
          fileType: resource.fileType,
          fileSize: resource.fileSize,
          downloadCount: resource.downloadCount,
          hasFile: !!resource.fileUrl
        }
      }));
    } catch (error) {
      console.error('Error fetching resource activity items:', error);
      return [];
    }
  },

  getResourceQuickActions: (): QuickAction[] => {
    return [
      {
        id: 'view-resources',
        title: 'Resources & Library',
        description: 'Browse studies, devotionals, documents and more',
        actionUrl: '/resources',
        iconType: 'resource',
        buttonText: 'Browse Library',
        requiresAuth: true
      },
      {
        id: 'upload-resource',
        title: 'Upload Resource',
        description: 'Share a file or text resource with the community',
        actionUrl: '/resources/create-file',
        iconType: 'upload',
        buttonText: 'Upload File',
        requiresAuth: true
      }
    ];
  },

  getDashboardWithAll: async (): Promise<DashboardResponse> => {
    try {
      // Get the main dashboard data
      const dashboardResponse = await api.get('/dashboard');
      const dashboardData = dashboardResponse.data;

      // Get all activity items in parallel
      const [prayerActivityItems, announcementActivityItems, eventActivityItems, rsvpActivityItems, resourceActivityItems] = await Promise.all([
        dashboardApi.getPrayerActivityItems(5),
        dashboardApi.getAnnouncementActivityItems(5),
        dashboardApi.getEventActivityItems(5),
        dashboardApi.getRsvpActivityItems(3),
        dashboardApi.getResourceActivityItems(3)
      ]);

      // Merge all activities with existing activities
      const combinedActivity = [
        ...prayerActivityItems,
        ...announcementActivityItems,
        ...eventActivityItems,
        ...rsvpActivityItems,
        ...resourceActivityItems,
        ...(dashboardData.recentActivity || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 25); // Keep the 25 most recent items

      // Add all quick actions if not already present
      const prayerQuickActions = dashboardApi.getPrayerQuickActions();
      const announcementQuickActions = dashboardApi.getAnnouncementQuickActions(
        dashboardData.userRole || localStorage.getItem('userRole')
      );
      const eventQuickActions = dashboardApi.getEventQuickActions();
      const resourceQuickActions = dashboardApi.getResourceQuickActions();
      
      const existingActionUrls = (dashboardData.quickActions || []).map((action: QuickAction) => action.actionUrl);
      const newActions = [
        ...prayerQuickActions, 
        ...announcementQuickActions, 
        ...eventQuickActions,
        ...resourceQuickActions
      ].filter(action => 
        !existingActionUrls.includes(action.actionUrl)
      );

      return {
        ...dashboardData,
        recentActivity: combinedActivity,
        quickActions: [...(dashboardData.quickActions || []), ...newActions]
      };
    } catch (error) {
      console.error('Error getting dashboard with all features:', error);
      // Fallback to regular dashboard
      const response = await api.get('/dashboard');
      return response.data;
    }
  },

  // Keep old function for backward compatibility
  getDashboardWithPrayers: async (): Promise<DashboardResponse> => {
    return dashboardApi.getDashboardWithAll();
  },
};

export default dashboardApi;