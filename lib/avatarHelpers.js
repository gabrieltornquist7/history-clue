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

  // Extract width/height classes or use defaults
  const sizeClasses = size.split(' ');
  const widthClass = sizeClasses.find(c => c.startsWith('w-')) || 'w-10';
  const heightClass = sizeClasses.find(c => c.startsWith('h-')) || 'h-10';

  return (
    <div
      className={`${widthClass} ${heightClass} rounded-full bg-gray-800 overflow-hidden flex-shrink-0 ${className}`}
      style={{ position: 'relative' }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'w-full h-full flex items-center justify-center';
            fallback.innerHTML = '<span class="text-gray-500">👤</span>';
            e.target.parentElement.appendChild(fallback);
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-500">👤</span>
        </div>
      )}
    </div>
  );
};