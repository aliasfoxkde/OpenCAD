import { describe, it, expect } from 'vitest';
import { seoPlugin } from '../../vite-plugin-seo';

function runPlugin(siteUrl: string): Array<{ fileName: string; source: string }> {
  const emitted: Array<{ fileName: string; source: string }> = [];
  const plugin = seoPlugin({ siteUrl });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hook = plugin.generateBundle as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: any = {
    emitFile: (file: { type: string; fileName: string; source: string }) => {
      emitted.push({ fileName: file.fileName, source: file.source });
    },
  };
  hook.call(ctx);
  return emitted;
}

describe('seoPlugin', () => {
  it('should return a plugin with correct name', () => {
    const plugin = seoPlugin({ siteUrl: 'https://opencad.pages.dev' });
    expect(plugin.name).toBe('opencad-seo');
    expect(plugin.enforce).toBe('post');
  });

  it('should have a generateBundle hook', () => {
    const plugin = seoPlugin({ siteUrl: 'https://opencad.pages.dev' });
    expect(typeof plugin.generateBundle).toBe('function');
  });

  it('should generate robots.txt content with sitemap link', () => {
    const emitted = runPlugin('https://opencad.pages.dev');
    const robots = emitted.find((f) => f.fileName === 'robots.txt');
    expect(robots).toBeDefined();
    expect(robots!.source).toContain('User-agent: *');
    expect(robots!.source).toContain('Allow: /');
    expect(robots!.source).toContain('Sitemap: https://opencad.pages.dev/sitemap.xml');
  });

  it('should generate sitemap.xml with correct XML structure', () => {
    const emitted = runPlugin('https://opencad.pages.dev');
    const sitemap = emitted.find((f) => f.fileName === 'sitemap.xml');
    expect(sitemap).toBeDefined();
    expect(sitemap!.source).toContain('<?xml version="1.0"');
    expect(sitemap!.source).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap!.source).toContain('https://opencad.pages.dev/');
  });

  it('should include all SPA routes in sitemap', () => {
    const emitted = runPlugin('https://opencad.pages.dev');
    const sitemap = emitted.find((f) => f.fileName === 'sitemap.xml')!;
    expect(sitemap.source).toContain('<loc>https://opencad.pages.dev/</loc>');
    expect(sitemap.source).toContain('<loc>https://opencad.pages.dev/editor</loc>');
    expect(sitemap.source).toContain('<loc>https://opencad.pages.dev/docs</loc>');
  });

  it('should include priority and changefreq in sitemap entries', () => {
    const emitted = runPlugin('https://opencad.pages.dev');
    const sitemap = emitted.find((f) => f.fileName === 'sitemap.xml')!;
    expect(sitemap.source).toContain('<priority>1</priority>');
    expect(sitemap.source).toContain('<priority>0.9</priority>');
    expect(sitemap.source).toContain('<changefreq>daily</changefreq>');
    expect(sitemap.source).toContain('<changefreq>weekly</changefreq>');
    expect(sitemap.source).toContain('<changefreq>monthly</changefreq>');
  });
});
