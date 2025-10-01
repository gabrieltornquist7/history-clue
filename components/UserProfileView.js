"use client";
import ProfileView from './ProfileView';

/**
 * UserProfileView - Wrapper for viewing other users' profiles
 * This component simply renders the main ProfileView with the specified userId,
 * giving the same beautiful profile experience when viewing friends or other players.
 */
export default function UserProfileView({ setView, session, userId, onBack }) {
  console.log('[UserProfileView] Rendering ProfileView for userId:', userId);
  
  // Pass a custom setView function that calls onBack if provided
  const handleSetView = (view) => {
    console.log('[UserProfileView] handleSetView called with:', view);
    
    // If going back and we have onBack callback, use it
    if ((view === 'menu' || view === 'friends') && onBack && typeof onBack === 'function') {
      onBack();
    } else if (setView && typeof setView === 'function') {
      // Otherwise use the normal setView
      setView(view);
    }
  };

  return (
    <ProfileView 
      setView={handleSetView}
      session={session}
      userId={userId}
    />
  );
}
