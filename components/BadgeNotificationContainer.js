// components/BadgeNotificationContainer.js
"use client";
import { useBadgeNotifications } from '../contexts/BadgeNotificationContext';
import BadgeEarnedNotification from './BadgeEarnedNotification';

export default function BadgeNotificationContainer({ setView }) {
  const { badgeQueue, removeNotification } = useBadgeNotifications();

  const handleViewBadge = (badgeId, notificationId) => {
    removeNotification(notificationId);
    // Navigate to badge gallery using the view system
    if (typeof window !== 'undefined') {
      window.location.hash = `badge-${badgeId}`;
    }
    // Use setView to navigate to badges view
    if (setView && typeof setView === 'function') {
      setView('badges');
    }
  };

  return (
    <>
      {badgeQueue.map((badge, index) => (
        <div
          key={badge.id}
          style={{
            position: 'fixed',
            top: `${4 + index * 120}px`, // Stack notifications vertically
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000 + index,
            width: '100%',
            maxWidth: '28rem',
            padding: '0 1rem'
          }}
        >
          <BadgeEarnedNotification
            badgeData={badge}
            onClose={() => removeNotification(badge.id)}
            onViewBadge={() => handleViewBadge(badge.badge_id, badge.id)}
          />
        </div>
      ))}
    </>
  );
}