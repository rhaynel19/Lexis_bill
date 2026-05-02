import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trinalyze.pro';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/', 
        '/admin/', 
        '/super-admin/',
        '/checkout/',
        '/api/',
        '/contador/',
        '/(protected)/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
