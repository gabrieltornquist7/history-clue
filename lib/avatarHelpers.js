import { supabase } from './supabaseClient';

export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;

  // If it's already a full URL
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    // Fix missing /public/ in storage URLs
    if (avatarUrl.includes('/storage/v1/object/avatars/')) {
      return avatarUrl.replace('/storage/v1/object/avatars/', '/storage/v1/object/public/avatars/');
    }
    // General case - fix any missing /public/
    if (avatarUrl.includes('/storage/v1/object/') && !avatarUrl.includes('/public/')) {
      return avatarUrl.replace('/storage/v1/object/', '/storage/v1/object/public/');
    }
    // Already correct
    return avatarUrl;
  }

  // If it's just a filename, construct full URL with /public/
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
};

export const AvatarImage = ({ url, alt = "Avatar", size = "w-10 h-10", className = "" }) => {
  const avatarUrl = getAvatarUrl(url);

  return (
    <div className={`${size} rounded-full bg-gray-800 flex items-center justify-center overflow-hidden ${className}`}>
      {avatarUrl ? (
        <>
          <img
            src={avatarUrl}
            alt={alt}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
          <span className="text-gray-500 absolute" style={{ display: 'none' }}>
            👤
          </span>
        </>
      ) : (
        <span className="text-gray-500">👤</span>
      )}
    </div>
  );
};