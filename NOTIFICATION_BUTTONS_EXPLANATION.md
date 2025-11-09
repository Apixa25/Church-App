# 🔔 Notification Buttons Explanation & Guide

## 📋 Overview

The Church App dashboard has **three notification buttons** that help you stay connected with your church community. Each button serves a specific purpose and shows different types of notifications.

---

## 🙏 **Prayer Notifications Button** (Praying Hands Emoji)

### **Location**
- Located in the **header actions** section (top right area of the dashboard)
- Appears as a **🙏 praying hands emoji** button

### **What It Does**
This button shows you **prayer-related notifications** in real-time. It keeps you informed about:

- 🙏 **New Prayer Requests** - When someone in your church community submits a new prayer request
- 💙 **Prayer Interactions** - When someone prays for a request or adds a comment
- ✨ **Prayer Answered** - When a prayer request is marked as answered or resolved
- 💬 **Prayer Comments** - When someone comments on a prayer request

### **How It Works**
- Click the 🙏 button to open a dropdown showing all your prayer notifications
- You'll see a **red badge** with a number indicating unread notifications
- The button has a **pulsing animation** when there are unread notifications
- Click on any notification to navigate to the related prayer request
- You can mark all as read, clear all notifications, or view all prayers

### **Technical Details**
- Uses WebSocket real-time connections for instant updates
- Subscribes to `/topic/prayers` (general prayer updates)
- Subscribes to `/user/queue/prayers` (personal prayer notifications)
- Connection status indicator shows if you're connected (🟢) or offline (🔴)

---

## 🔔 **Event Notifications Button** (Golden Bell with White Background)

### **Location**
- Located in the **header actions** section (top right area of the dashboard)
- Appears as a **🔔 golden bell emoji** button with a **white circular background**

### **What It Does**
This button shows you **event-related notifications** to keep you informed about church events:

- 📅 **New Events** - When a new event is created in the church calendar
- ✏️ **Event Updates** - When an existing event is modified (time, location, details)
- ❌ **Event Cancelled** - When an event is cancelled
- 🗑️ **Event Deleted** - When an event is removed
- 👥 **RSVP Updates** - When someone RSVPs to an event (attending, not attending, maybe)

### **How It Works**
- Click the 🔔 button (with white background) to open a dropdown showing all event notifications
- You'll see a **red badge** with a number indicating unread notifications
- Notifications automatically disappear after 10 seconds
- Click on any notification to see event details
- You can clear all notifications or close the dropdown

### **Technical Details**
- Uses WebSocket real-time connections for instant updates
- Subscribes to event updates via WebSocket service
- Shows connection status and recent event activity
- Keeps the 10 most recent notifications

---

## 🔔 **Community Notifications Button** (Golden Bell with Clear Background)

### **Location**
- Positioned **fixed in the top-right corner** of the screen
- Appears as a **🔔 golden bell emoji** button with a **transparent/clear background**
- Has a **green dot** indicator showing connection status

### **What It Does**
This button shows you **community/social notifications** about interactions with your posts and profile:

- ❤️ **Likes** - When someone likes your post
- 💬 **Comments** - When someone comments on your post
- 🔄 **Shares** - When someone shares your post
- 👤 **Mentions** - When someone mentions you in a post or comment
- 👥 **Follows** - When someone new follows you (if following feature is enabled)
- ℹ️ **System Notifications** - General community updates

### **How It Works**
- Click the 🔔 button (top-right corner) to open a notification panel
- You'll see a **red badge** with a number indicating unread notifications
- A **green dot** shows you're connected to the community
- A **red dot** indicates you're disconnected
- Notifications appear as **toasts** (pop-up messages) when they arrive
- Click on any notification to navigate to the related post or content
- You can mark all as read, clear all notifications, or dismiss individual notifications

### **Technical Details**
- Uses WebSocket real-time connections for instant updates
- Subscribes to `/user/queue/social` for personal social notifications
- Shows connection status with visual indicators
- Displays notifications as both a panel and toast messages
- Auto-hides notifications after 5 seconds (configurable)

---

## 🎯 **Quick Reference**

| Button | Emoji | Background | Location | Purpose |
|--------|-------|------------|----------|---------|
| **Prayer** | 🙏 | None | Header Actions | Prayer-related notifications |
| **Event** | 🔔 | White Circle | Header Actions | Event-related notifications |
| **Community** | 🔔 | Transparent | Top-Right Corner | Social/community interactions |

---

## 🔧 **Troubleshooting**

### **If notifications aren't working:**

1. **Check WebSocket Connection**
   - Look for connection status indicators (🟢 green = connected, 🔴 red = disconnected)
   - If disconnected, try refreshing the page
   - Check your internet connection

2. **Check Browser Console**
   - Open browser developer tools (F12)
   - Look for WebSocket connection errors
   - Check for any JavaScript errors

3. **Verify Backend is Running**
   - Ensure the backend server is running
   - Check that WebSocket endpoints are accessible
   - Verify authentication token is valid

4. **Clear Browser Cache**
   - Sometimes cached data can cause issues
   - Try clearing browser cache and reloading

---

## 📱 **User Experience Tips**

1. **Prayer Notifications** - Best for staying connected with prayer needs in your community
2. **Event Notifications** - Essential for keeping track of church events and RSVPs
3. **Community Notifications** - Great for seeing engagement on your posts and staying social

All three buttons work together to keep you fully informed about everything happening in your church community! 🎉




