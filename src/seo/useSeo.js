import { useEffect } from 'react';
import { BRAND, SITE_URL, defaultSeo } from './seoData';

const upsertMeta = (selector, attrs) => {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  return node;
};

const upsertLink = (selector, attrs) => {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('link');
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};

const removeManagedJsonLd = () => {
  document.head
    .querySelectorAll('script[data-seo-jsonld="true"]')
    .forEach((node) => node.remove());
};

const addJsonLd = (items = []) => {
  removeManagedJsonLd();
  items.filter(Boolean).forEach((item) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  });
};

export function useSeo({
  lang = 'es',
  title,
  description,
  keywords,
  path = '/',
  image = '/favicon.png',
  type = 'website',
  alternates = [],
  noindex = false,
  jsonLd = [],
} = {}) {
  useEffect(() => {
    const fallback = defaultSeo[lang] || defaultSeo.es;
    const seoTitle = title || fallback.title;
    const seoDescription = description || fallback.description;
    const seoKeywords = keywords || fallback.keywords;
    const canonicalUrl = `${SITE_URL}${path}`;
    const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;

    document.documentElement.lang = lang;
    document.title = seoTitle;

    upsertMeta('meta[name="description"]', { name: 'description', content: seoDescription });
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: seoKeywords });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    });
    upsertMeta('meta[name="application-name"]', { name: 'application-name', content: BRAND });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: BRAND });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seoTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seoDescription });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: lang === 'en' ? 'en_US' : 'es_ES' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seoTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seoDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
    document.head.querySelectorAll('link[data-seo-alternate="true"]').forEach((node) => node.remove());
    alternates.forEach(({ hrefLang, href }) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hrefLang;
      link.href = href.startsWith('http') ? href : `${SITE_URL}${href}`;
      link.setAttribute('data-seo-alternate', 'true');
      document.head.appendChild(link);
    });

    addJsonLd(jsonLd);

    return () => {
      removeManagedJsonLd();
    };
  }, [alternates, description, image, jsonLd, keywords, lang, noindex, path, title, type]);
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  sameAs: [],
};

export const softwareJsonLd = (lang = 'es') => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: BRAND,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web, iOS, Android',
  url: SITE_URL,
  inLanguage: lang,
  description: defaultSeo[lang]?.description || defaultSeo.es.description,
  offers: {
    '@type': 'Offer',
    category: 'Subscription',
    priceCurrency: 'EUR',
  },
});
