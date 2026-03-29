/**
 * Vite plugin that generates robots.txt and sitemap.xml at build time.
 */

import type { Plugin } from 'vite';

export interface SeoPluginOptions {
  siteUrl: string;
  changefreq?: string;
  priority?: number;
}

interface SitemapPage {
  url: string;
  priority: number;
  changefreq: string;
  lastmod?: string;
}

export function seoPlugin(options: SeoPluginOptions): Plugin {
  const { siteUrl } = options;

  return {
    name: 'opencad-seo',
    enforce: 'post',

    generateBundle() {
      // Generate robots.txt
      const robots = [
        'User-agent: *',
        'Allow: /',
        `Sitemap: ${siteUrl}/sitemap.xml`,
        '',
      ].join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robots,
      });

      // Generate sitemap.xml
      const pages: SitemapPage[] = [
        { url: '/', priority: 1.0, changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
        { url: '/editor', priority: 0.9, changefreq: 'weekly' },
        { url: '/docs', priority: 0.7, changefreq: 'monthly' },
      ];

      const xmlEntries = pages
        .map(
          (p) =>
            `  <url>
    <loc>${siteUrl}${p.url}</loc>
    <lastmod>${p.lastmod ?? ''}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
        )
        .join('\n');

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        xmlEntries,
        '</urlset>',
      ].join('\n');

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemap,
      });
    },
  };
}
