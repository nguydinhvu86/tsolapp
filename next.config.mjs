/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: '/uploads/:path*',
                    destination: '/api/files/:path*',
                },
            ],
        };
    },
};

export default nextConfig;
