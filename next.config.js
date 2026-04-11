/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.com' },
    ],
  },
}
