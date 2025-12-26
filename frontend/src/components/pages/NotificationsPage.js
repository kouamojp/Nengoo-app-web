import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import NotificationList from '../ui/NotificationList';
import { Navigate } from 'react-router-dom';

const NotificationsPage = (props) => {
  const { user, language } = props;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Mes Notifications</h1>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* We reuse the NotificationList but without absolute positioning for a full page view */}
          <div className="w-full">
            <NotificationList 
              userId={user.id} 
              userType={user.type} 
              onClose={() => {}} 
              isFullPage={true} 
            />
          </div>
        </div>
      </div>
      <Footer language={language} />
    </div>
  );
};

export default NotificationsPage;
