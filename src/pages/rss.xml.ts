import rss from '@astrojs/rss';
import { getSection, listPosts } from '../lib/cms/repository';

export async function GET(context: { site: URL }) {
  const [settings, posts] = await Promise.all([
    getSection('settings'),
    listPosts({ lang: 'en', includeDrafts: false }),
  ]);

  return rss({
    title: `${settings.brand} | ${settings.name}`,
    description: settings.description.en,
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.pubDate),
      link: `/blog/${post.slug}`,
      categories: post.tags,
    })),
  });
}
