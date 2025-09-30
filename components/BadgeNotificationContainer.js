// components/BadgeNotificationContainer.js
"use client";
import { useBadgeNotifications } from '../contexts/BadgeNotificationContext';
import BadgeEarnedNotification from './BadgeEarnedNotification';
import { useRouter } from 'next/navigation';

export default function BadgeNotificationContainer() {
  const { badgeQueue, removeNotification } = useBadgeNotifications();
  const router = useRouter();

  const handleViewBadge = (badgeId, notificationId) => {
    removeNotification(notificationId);
    // Navigate to badge gallery with this badge focused
    if (typeof window !== 'undefined') {
      window.location.hash = `badge-${badgeId}`;
    }
    router.push('/badges');
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