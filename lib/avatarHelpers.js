import { supabase } from './supabaseClient';

export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;

  // Convert any URL to string first
  let url = String(avatarUrl);

  // If it contains storage path but missing /public/
  if (url.includes('/storage/v1/object/avatars/')) {
    // Fix it by adding /public/
    url = url.replace('/storage/v1/object/avatars/', '/storage/v1/object/public/avatars/');
  }

  // If it's just a filename (no http/https), build full URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bisjnzssegpfhkxaayuz.supabase.co';
    url = `${supabaseUrl}/storage/v1/object/public/avatars/${url}`;
  }

  return url;
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