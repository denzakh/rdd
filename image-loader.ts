import type { ImageLoaderProps } from 'next/image';

const assetDomain = 'https://assets.ux42.studio';

export default function cloudflareLoader({
    src,
    width,
    quality,
}: ImageLoaderProps) {
    if (process.env.NODE_ENV === 'development') {
        return src;
    }

    if (src.endsWith('.svg')) {
        return src;
    }

    if (width < 50) {
        return src;
    }

    const params = [`width=${width}`, 'format=auto'];
    params.push(`quality=${quality || 75}`);

    const paramsString = params.join(',');

    // 1. Локальная статика (public/images/...)
    if (src.startsWith('/')) {
        return `/cdn-cgi/image/${paramsString}${src}`;
    }

    // 2. Внешние изображения из R2 (ux42.studio)
    if (src.startsWith(assetDomain)) {
        // Добавляем '/' после параметров и передаем ПОЛНЫЙ src
        // Результат будет: /cdn-cgi/image/width=1920.../https://assets.ux42.studio/terminator.jpg
        return `/cdn-cgi/image/${paramsString}/${src}`;
    }

    return src;
}
