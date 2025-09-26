import { supabase } from './supabaseClient';

export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;

  // If it's already a full URL, check if it needs /public/ fix
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    if (avatarUrl.includes('/storage/v1/object/') && !avatarUrl.includes('/public/')) {
      return avatarUrl.replace('/storage/v1/object/', '/storage/v1/object/public/');
    }
    return avatarUrl;
  }

  // If it's just a filename, construct the full URL
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