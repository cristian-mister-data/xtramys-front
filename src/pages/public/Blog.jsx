import { Link, Navigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowBack, MdLanguage } from 'react-icons/md';
import { blogPosts, defaultSeo, getPostBySlug, SITE_URL } from '@/seo/seoData';
import { organizationJsonLd, useSeo } from '@/seo/useSeo';
import logo from '@/images/xtramys.webp';

const text = {
  es: {
    title: 'Blog de Xtramys para entrenadores de futbol',
    description:
      'Guias sobre app para entrenadores, gestion de equipos, planificacion de entrenamientos, pizarra tactica, analisis rival, wellness y futbol.',
    h1: 'Blog para entrenadores de futbol',
    intro:
      'Articulos practicos sobre gestion de equipos, entrenamiento, tactica, analisis rival y tecnologia aplicada al cuerpo tecnico.',
    back: 'Volver al blog',
    home: 'Inicio',
    login: 'Entrar',
    related: 'Mas guias de Xtramys',
  },
  en: {
    title: 'Xtramys blog for football coaches',
    description:
      'Guides about football coaching apps, team management, training planning, tactical boards, opponent analysis, wellness and soccer workflows.',
    h1: 'Blog for football coaches',
    intro:
      'Practical articles about team management, training, tactics, opponent analysis and technology for coaching staffs.',
    back: 'Back to blog',
    home: 'Home',
    login: 'Log in',
    related: 'More Xtramys guides',
  },
};

const Page = styled.main`
  min-height: 100dvh;
  background: #f7faf8;
  color: #152236;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 16px clamp(18px, 4vw, 56px);
  border-bottom: 1px solid rgba(21, 34, 54, 0.08);
  background: rgba(247, 250, 248, 0.94);
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  font-weight: 850;
  img { width: 34px; height: 34px; object-fit: contain; }
`;

const Nav = styled.nav`
  display: flex;
  gap: 10px;
  align-items: center;
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 8px;
    color: #243449;
    text-decoration: none;
    font-weight: 750;
    background: #ffffff;
    border: 1px solid rgba(21, 34, 54, 0.1);
  }
`;

const Wrap = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(36px, 7vw, 74px) 18px;
`;

const Intro = styled.div`
  max-width: 760px;
  margin-bottom: 28px;
  h1 { margin: 0; font-size: clamp(34px, 6vw, 64px); line-height: 1; letter-spacing: 0; }
  p { margin: 16px 0 0; color: #53657a; font-size: 18px; line-height: 1.55; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const Card = styled(Link)`
  display: block;
  min-height: 210px;
  padding: 22px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(21, 34, 54, 0.1);
  text-decoration: none;
  color: inherit;
  span { color: #116149; font-size: 12px; font-weight: 850; text-transform: uppercase; letter-spacing: .06em; }
  h2 { margin: 12px 0 10px; font-size: 24px; line-height: 1.18; letter-spacing: 0; }
  p { margin: 0; color: #53657a; line-height: 1.55; }
`;

const Article = styled.article`
  max-width: 820px;
  margin: 0 auto;
  padding: clamp(34px, 7vw, 76px) 18px;
  h1 { margin: 0; font-size: clamp(34px, 6vw, 62px); line-height: 1.04; letter-spacing: 0; color: #102033; }
  .meta { margin: 14px 0 28px; color: #116149; font-weight: 850; }
  p { color: #3f5066; font-size: 19px; line-height: 1.72; }
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #116149;
  font-weight: 850;
  text-decoration: none;
  margin-bottom: 26px;
`;

function Shell({ lang, children }) {
  const c = text[lang] || text.es;
  return (
    <Page>
      <Header>
        <Brand to={lang === 'en' ? '/en' : '/'}>
          <img src={logo} alt="Xtramys" />
          Xtramys
        </Brand>
        <Nav>
          <Link to={lang === 'en' ? '/' : '/en'}><MdLanguage /> {lang === 'en' ? 'ES' : 'EN'}</Link>
          <Link to="/auth/login">{c.login}</Link>
        </Nav>
      </Header>
      {children}
    </Page>
  );
}

export function BlogIndex({ lang = 'es' }) {
  const { i18n } = useTranslation();
  const c = text[lang] || text.es;
  const path = lang === 'en' ? '/en/blog' : '/blog';

  useEffect(() => {
    if (!i18n.language?.startsWith(lang)) i18n.changeLanguage(lang);
  }, [i18n, lang]);

  const jsonLd = useMemo(() => [
    organizationJsonLd,
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: c.title,
      description: c.description,
      url: `${SITE_URL}${path}`,
      inLanguage: lang,
    },
  ], [c.description, c.title, lang, path]);

  useSeo({
    lang,
    path,
    title: c.title,
    description: c.description,
    keywords: defaultSeo[lang]?.keywords,
    alternates: [
      { hrefLang: 'es', href: '/blog' },
      { hrefLang: 'en', href: '/en/blog' },
      { hrefLang: 'x-default', href: '/blog' },
    ],
    jsonLd,
  });

  return (
    <Shell lang={lang}>
      <Wrap>
        <Intro>
          <h1>{c.h1}</h1>
          <p>{c.intro}</p>
        </Intro>
        <Grid>
          {blogPosts.map((post) => {
            const p = post[lang] || post.es;
            return (
              <Card key={post.slug} to={`${path}/${post.slug}`}>
                <span>{p.category} · {p.readingTime}</span>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
              </Card>
            );
          })}
        </Grid>
      </Wrap>
    </Shell>
  );
}

export function BlogArticle({ lang = 'es' }) {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const post = getPostBySlug(slug);
  const c = text[lang] || text.es;
  const p = post ? (post[lang] || post.es) : null;
  const blogPath = lang === 'en' ? '/en/blog' : '/blog';
  const path = post ? `${blogPath}/${post.slug}` : blogPath;
  const otherPath = post ? `${lang === 'en' ? '/blog' : '/en/blog'}/${post.slug}` : (lang === 'en' ? '/blog' : '/en/blog');

  useEffect(() => {
    if (!i18n.language?.startsWith(lang)) i18n.changeLanguage(lang);
  }, [i18n, lang]);

  const jsonLd = useMemo(() => {
    if (!post || !p) return [organizationJsonLd];
    return [
      organizationJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: p.title,
        description: p.description,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Organization', name: 'Xtramys' },
        publisher: { '@type': 'Organization', name: 'Xtramys', logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` } },
        mainEntityOfPage: `${SITE_URL}${path}`,
        inLanguage: lang,
      },
    ];
  }, [lang, p, path, post]);

  useSeo({
    lang,
    path,
    title: p ? `${p.title} | Xtramys` : c.title,
    description: p?.description || c.description,
    keywords: defaultSeo[lang]?.keywords,
    type: 'article',
    alternates: [
      { hrefLang: lang, href: path },
      { hrefLang: lang === 'en' ? 'es' : 'en', href: otherPath },
      { hrefLang: 'x-default', href: post ? `/blog/${post.slug}` : '/blog' },
    ],
    noindex: !post,
    jsonLd,
  });

  if (!post || !p) return <Navigate to={blogPath} replace />;

  return (
    <Shell lang={lang}>
      <Article>
        <Back to={lang === 'en' ? '/en/blog' : '/blog'}><MdArrowBack /> {c.back}</Back>
        <h1>{p.title}</h1>
        <div className="meta">{p.category} · {p.readingTime}</div>
        <p><strong>{p.description}</strong></p>
        {p.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <h2>{c.related}</h2>
        <Grid>
          {blogPosts.filter((item) => item.slug !== post.slug).slice(0, 2).map((item) => {
            const related = item[lang] || item.es;
            return (
              <Card key={item.slug} to={`${lang === 'en' ? '/en/blog' : '/blog'}/${item.slug}`}>
                <span>{related.category}</span>
                <h2>{related.title}</h2>
                <p>{related.description}</p>
              </Card>
            );
          })}
        </Grid>
      </Article>
    </Shell>
  );
}
