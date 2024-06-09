/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fal.media',
                pathname: '**'
            },
            // test blob store
            {
                protocol: 'https',
                hostname: 'ldu9dipdwsmvpeca.public.blob.vercel-storage.com',
                pathname: '**'
            },
            // prod blob store
            {
                protocol: 'https',
                hostname: 'dh2jt8inkxocsggz.public.blob.vercel-storage.com',
                pathname: '**'
            }
        ]
    }
};

export default nextConfig;
