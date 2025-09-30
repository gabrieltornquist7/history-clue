// contexts/BadgeNotificationContext.js
"use client";
import React, { createContext, useContext, useState } from 'react';

const BadgeNotificationContext = createContext();

export const useBadgeNotifications = () => {
  const context = useContext(BadgeNotificationContext);
  if (!context) {
    throw new Error('useBadgeNotifications must be used within BadgeNotificationProvider');
  }
  return context;
};

export const BadgeNotificationProvider = ({ children }) => {
  const [badgeQueue, setBadgeQueue] = useState([]);

  const queueBadgeNotification = (badgeData) => {
    console.log('[BadgeNotification] Queueing badge:', badgeData);
    setBadgeQueue(prev => [...prev, { ...badgeData, id: Date.now() }]);
  };

  const removeNotification = (id) => {
    console.log('[BadgeNotification] Removing notification:', id);
    setBadgeQueue(prev => prev.filter(badge => badge.id !== id));
  };

  return (
    <BadgeNotificationContext.Provider
      value={{
        badgeQueue,
        queueBadgeNotification,
        removeNotification
      }}
    >
      {children}
    </BadgeNotificationContext.Provider>
  );
};