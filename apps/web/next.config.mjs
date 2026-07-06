/** @type {import('next').NextConfig} */
const nextConfig = {
  // Consume the workspace packages as TypeScript source (no prebuild step).
  transpilePackages: ['@f1pitwall/shared', '@hatimshahera/f1-pitwall-replay-widget'],

  // We lint the whole monorepo with the root flat ESLint config via `pnpm lint`,
  // so Next's own build-time lint pass is redundant here.
  eslint: { ignoreDuringBuilds: true },

  // Ensure the generated JSON (copied into public/data) is bundled with the
  // serverless functions that read it, so the API routes work on Vercel.
  outputFileTracingIncludes: {
    '/api/**': ['./public/data/**/*'],
  },

  async headers() {
    // Allow the personal website (a different origin) to fetch the data.
    return [
      {
        source: '/data/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
