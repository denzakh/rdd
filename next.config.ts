import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        loader: 'custom',
        loaderFile: './image-loader.ts',
        deviceSizes: [828, 1920],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'assets.ux42.studio',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
