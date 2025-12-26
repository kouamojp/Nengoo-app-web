import { API_URL } from './utils';

export const getNotifications = async (userId, userType) => {
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Type': userType,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const getUnreadNotificationsCount = async (userId, userType) => {
  try {
    const response = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Type': userType,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch unread count');
    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId,
      },
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (userId, userType) => {
  try {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId,
        'X-User-Type': userType,
      },
    });
    if (!response.ok) throw new Error('Failed to mark all as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

export const deleteNotification = async (notificationId, userId) => {
  try {
    const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': userId,
      },
    });
    if (!response.ok) throw new Error('Failed to delete notification');
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};
