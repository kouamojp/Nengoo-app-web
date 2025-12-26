import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../../lib/notifications';

const NotificationList = ({ userId, userType, onClose, isFullPage = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    const data = await getNotifications(userId, userType);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, userType]);

  const handleMarkAsRead = async (id, link) => {
    await markNotificationAsRead(id, userId);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (link && onClose) {
      onClose(); // Close dropdown on navigation if onClose provided
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId, userType);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent triggering click on the notification item
    await deleteNotification(id, userId);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const containerClasses = isFullPage 
    ? "w-full bg-white rounded-lg shadow-sm" 
    : "absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200";

  return (
    <div className={containerClasses}>
      <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-700">Notifications</h3>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={handleMarkAllAsRead}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      
      <div className={isFullPage ? "" : "max-h-96 overflow-y-auto"}>
        {loading ? (
          <div className="p-4 text-center text-gray-500">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Aucune notification</div>
        ) : (
          <ul>
            {notifications.map(notification => (
              <li 
                key={notification.id} 
                className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${notification.read ? 'bg-white' : 'bg-purple-50'}`}
              >
                <div 
                  className="block p-4 cursor-pointer"
                  onClick={() => handleMarkAsRead(notification.id, notification.link)}
                >
                  <Link to={notification.link || '#'} className="block">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${notification.read ? 'text-gray-800' : 'text-gray-900 font-semibold'}`}>
                        {notification.title}
                      </p>
                      <button 
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="text-gray-400 hover:text-red-500 ml-2"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                       {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationList;
