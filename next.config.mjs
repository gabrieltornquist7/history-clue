// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Optimized image configuration
  images: {
    // Keep your existing Supabase configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bisjnzssegpfhkxaayuz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/avatars/**',
      },
      // Add other domains your app uses
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
        port: '',
        pathname: '/leaflet@1.7.1/dist/images/**',
      },
    ],
    // Modern image formats for better compression
    formats: ['image/webp', 'image/avif'],
    // Cache images for better performance
    minimumCacheTTL: 60,
  },
  
  // Enable experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  // Webpack optimizations for better bundle splitting
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Production client-side optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Vendor chunks - separate node_modules
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Leaflet maps - separate chunk since it's heavy
          leaflet: {
            test: /[\\/]node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/,
            name: 'leaflet',
            chunks: 'all',
            priority: 20,
          },
          // Supabase - separate chunk for database operations
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 15,
          },
          // Common components used across multiple pages
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    // Disable source maps in production for smaller bundles
    if (!dev) {
      config.devtool = false;
    }
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log statements in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable gzip compression
  compress: true,
  
  // Remove Next.js powered-by header for security
  poweredByHeader: false,
  
  // Optimize CSS loading
  optimizeFonts: true,
  
  // Add security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;