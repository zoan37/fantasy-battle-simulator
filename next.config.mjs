/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fal.media',
                pathname: '**'
            },
            {
                protocol: 'https',
                hostname: 'ldu9dipdwsmvpeca.public.blob.vercel-storage.com',
                pathname: '**'
            }
        ]
    }
};

export default nextConfig;
