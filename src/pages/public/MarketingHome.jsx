import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import { MdArrowForward, MdCheckCircle, MdLanguage } from 'react-icons/md';
import { blogPosts, defaultSeo, SITE_URL } from '@/seo/seoData';
import { organizationJsonLd, softwareJsonLd, useSeo } from '@/seo/useSeo';
import logo from '@/images/xtramys.webp';
import fieldImage from '@/images/campo.webp';

const copy = {
  es: {
    navFeatures: 'Funciones',
    navBlog: 'Blog',
    login: 'Entrar',
    cta: 'Crear cuenta',
    eyebrow: 'Software para cuerpos tecnicos de futbol',
    title: 'Xtramys',
    subtitle:
      'La app para entrenadores que centraliza gestion de equipo, planificacion de entrenamientos, pizarra tactica, wellness, lesiones, fichas de partido y analisis rival.',
    primary: 'Empezar con Xtramys',
    secondary: 'Ver articulos',
    trust: 'Diseñada para entrenadores, preparadores fisicos, analistas y coordinadores deportivos.',
    sectionsTitle: 'Todo el trabajo del equipo en una sola plataforma',
    sectionsSubtitle:
      'Xtramys conecta la informacion del dia a dia para que el cuerpo tecnico pueda preparar, ejecutar y revisar con criterio.',
    features: [
      ['Gestion de equipos', 'Jugadores, temporadas, plantillas, categorias, asistencia y seguimiento individual.'],
      ['Entrenamientos', 'Planifica sesiones, selecciona ejercicios, ordena descansos y registra observaciones.'],
      ['Pizarra tactica', 'Crea graficos, tareas tacticas y videos para explicar comportamientos de juego.'],
      ['Analisis rival', 'Organiza rivales, plantillas de analisis, clips, informes y patrones tacticos.'],
      ['Wellness y lesiones', 'Controla cuestionarios, disponibilidad, historial medico-deportivo y reportes.'],
      ['Fichas de partido', 'Prepara convocatorias, alineaciones, eventos, competiciones y documentos del partido.'],
    ],
    audiencesTitle: 'Para futbol base, academias y clubes competitivos',
    audiences: [
      'Entrenadores que necesitan una app profesional para organizar su semana.',
      'Coordinadores que quieren estandarizar metodologia, ejercicios y seguimiento.',
      'Analistas que trabajan con videos, rival analysis y tareas tacticas.',
      'Preparadores fisicos que conectan fuerza, wellness, lesiones y carga diaria.',
    ],
    blogTitle: 'Guias para entrenadores de futbol',
    blogSubtitle: 'Contenidos pensados para posicionar y ayudar: gestion de equipo, tactica, entrenamiento y analisis.',
    finalTitle: 'Gestiona tu equipo de futbol con una herramienta pensada para entrenadores',
    finalText:
      'Deja de repartir informacion entre hojas, notas, chats y carpetas. Xtramys convierte el trabajo del cuerpo tecnico en un sistema ordenado.',
    finalCta: 'Acceder a Xtramys',
  },
  en: {
    navFeatures: 'Features',
    navBlog: 'Blog',
    login: 'Log in',
    cta: 'Create account',
    eyebrow: 'Software for football coaching staffs',
    title: 'Xtramys',
    subtitle:
      'The coaching app that centralizes team management, training planning, tactical boards, wellness, injuries, match sheets and opponent analysis.',
    primary: 'Start with Xtramys',
    secondary: 'Read articles',
    trust: 'Built for coaches, fitness coaches, analysts and sporting coordinators.',
    sectionsTitle: 'All team workflows in one platform',
    sectionsSubtitle:
      'Xtramys connects daily football staff information so coaches can plan, execute and review with better context.',
    features: [
      ['Team management', 'Players, seasons, squads, categories, attendance and individual monitoring.'],
      ['Training sessions', 'Plan sessions, select drills, organize rest times and register coaching notes.'],
      ['Tactical board', 'Create diagrams, tactical tasks and videos to explain game behaviours.'],
      ['Opponent analysis', 'Organize opponents, analysis templates, clips, reports and tactical patterns.'],
      ['Wellness and injuries', 'Track questionnaires, availability, medical history and player reports.'],
      ['Match sheets', 'Prepare squads, lineups, events, competitions and match documents.'],
    ],
    audiencesTitle: 'For academies, grassroots football and competitive clubs',
    audiences: [
      'Coaches who need a professional app to organize their week.',
      'Coordinators who want to standardize methodology, drills and monitoring.',
      'Analysts working with videos, opponent analysis and tactical tasks.',
      'Fitness coaches connecting strength, wellness, injuries and daily workload.',
    ],
    blogTitle: 'Guides for football coaches',
    blogSubtitle: 'Helpful content for team management, tactics, training and opponent analysis.',
    finalTitle: 'Manage your football team with a tool built for coaches',
    finalText:
      'Stop spreading information across spreadsheets, notes, chats and folders. Xtramys turns coaching staff work into an organized system.',
    finalCta: 'Open Xtramys',
  },
};

const Page = styled.main`
  min-height: 100dvh;
  background: #f7faf8;
  color: #152236;
`;

const Nav = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px clamp(18px, 4vw, 56px);
  background: rgba(247, 250, 248, 0.92);
  border-bottom: 1px solid rgba(21, 34, 54, 0.08);
  backdrop-filter: blur(14px);
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

const NavLinks = styled.nav`
  display: flex;
  align-items: center;
  gap: 14px;
  a {
    color: #34445a;
    font-weight: 700;
    text-decoration: none;
    font-size: 14px;
  }
  @media (max-width: 760px) {
    a:not(.primary):not(.lang) { display: none; }
  }
`;

const PillLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(21, 34, 54, 0.12);
  background: ${({ $primary }) => ($primary ? '#116149' : '#ffffff')};
  color: ${({ $primary }) => ($primary ? '#ffffff !important' : '#243449 !important')};
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(300px, 0.98fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
  padding: clamp(48px, 8vw, 94px) clamp(18px, 4vw, 56px) 42px;
  @media (max-width: 880px) { grid-template-columns: 1fr; }
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: #116149;
  font-size: 13px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const H1 = styled.h1`
  margin: 0;
  font-size: clamp(46px, 8vw, 96px);
  line-height: 0.92;
  letter-spacing: 0;
  color: #102033;
`;

const Lead = styled.p`
  max-width: 720px;
  margin: 20px 0 0;
  color: #405168;
  font-size: clamp(18px, 2vw, 23px);
  line-height: 1.48;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
`;

const HeroButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid ${({ $secondary }) => ($secondary ? 'rgba(21,34,54,.16)' : '#116149')};
  background: ${({ $secondary }) => ($secondary ? '#fff' : '#116149')};
  color: ${({ $secondary }) => ($secondary ? '#203147' : '#fff')};
  text-decoration: none;
  font-weight: 850;
`;

const HeroMedia = styled.div`
  position: relative;
  min-height: 420px;
  border-radius: 8px;
  overflow: hidden;
  background: #183b2b;
  box-shadow: 0 24px 60px rgba(16, 32, 51, 0.2);
  img { width: 100%; height: 100%; min-height: 420px; object-fit: cover; display: block; }
  @media (max-width: 560px) {
    min-height: 260px;
    img { min-height: 260px; }
  }
`;

const MediaOverlay = styled.div`
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const Metric = styled.div`
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.9);
  strong { display: block; font-size: 18px; color: #102033; }
  span { display: block; margin-top: 2px; font-size: 12px; color: #4a5c72; font-weight: 700; }
`;

const Section = styled.section`
  padding: 56px clamp(18px, 4vw, 56px);
`;

const SectionHead = styled.div`
  max-width: 780px;
  margin-bottom: 28px;
  h2 { margin: 0; font-size: clamp(28px, 4vw, 44px); color: #102033; letter-spacing: 0; }
  p { margin: 12px 0 0; font-size: 17px; line-height: 1.55; color: #516278; }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 960px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;

const Feature = styled.article`
  min-height: 168px;
  border: 1px solid rgba(21, 34, 54, 0.1);
  border-radius: 8px;
  padding: 20px;
  background: #ffffff;
  h3 { margin: 0 0 8px; font-size: 19px; color: #102033; }
  p { margin: 0; color: #53657a; line-height: 1.5; }
`;

const Audience = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 28px;
  align-items: start;
  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

const CheckList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 14px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid rgba(21, 34, 54, 0.1);
    color: #3f5066;
    font-weight: 650;
  }
  svg { color: #116149; flex-shrink: 0; margin-top: 2px; }
`;

const BlogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 1100px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;

const BlogCard = styled(Link)`
  display: flex;
  flex-direction: column;
  min-height: 210px;
  padding: 18px;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  border: 1px solid rgba(21, 34, 54, 0.1);
  span { color: #116149; font-size: 12px; font-weight: 850; text-transform: uppercase; letter-spacing: .06em; }
  h3 { margin: 12px 0 8px; font-size: 18px; line-height: 1.25; color: #102033; }
  p { margin: 0; color: #53657a; line-height: 1.45; }
`;

const Final = styled.section`
  margin: 30px clamp(18px, 4vw, 56px) 56px;
  padding: clamp(30px, 5vw, 52px);
  border-radius: 8px;
  background: #102033;
  color: #fff;
  h2 { margin: 0; font-size: clamp(28px, 4vw, 46px); letter-spacing: 0; }
  p { max-width: 760px; margin: 14px 0 24px; color: #cbd6e3; font-size: 17px; line-height: 1.55; }
`;

const Footer = styled.footer`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding: 22px clamp(18px, 4vw, 56px);
  color: #64748b;
  border-top: 1px solid rgba(21, 34, 54, 0.08);
  a { color: #334155; text-decoration: none; font-weight: 700; }
`;

export default function MarketingHome({ lang = 'es' }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const c = copy[lang] || copy.es;
  const seo = defaultSeo[lang] || defaultSeo.es;
  const path = lang === 'en' ? '/en' : location.pathname === '/es' ? '/es' : '/';
  const blogPrefix = lang === 'en' ? '/en/blog' : '/blog';

  useEffect(() => {
    if (!i18n.language?.startsWith(lang)) i18n.changeLanguage(lang);
  }, [i18n, lang]);

  const jsonLd = useMemo(() => [
    organizationJsonLd,
    softwareJsonLd(lang),
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Xtramys',
      url: SITE_URL,
      inLanguage: lang,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/blog?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ], [lang]);

  useSeo({
    lang,
    path,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: [
      { hrefLang: 'es', href: '/' },
      { hrefLang: 'en', href: '/en' },
      { hrefLang: 'x-default', href: '/' },
    ],
    jsonLd,
  });

  return (
    <Page>
      <Nav>
        <Brand to={lang === 'en' ? '/en' : '/'}>
          <img src={logo} alt="Xtramys" />
          Xtramys
        </Brand>
        <NavLinks aria-label="Main">
          <a href="#features">{c.navFeatures}</a>
          <Link to={blogPrefix}>{c.navBlog}</Link>
          <PillLink className="lang" to={lang === 'en' ? '/' : '/en'}>
            <MdLanguage /> {lang === 'en' ? 'ES' : 'EN'}
          </PillLink>
          <Link to="/auth/login">{c.login}</Link>
          <PillLink className="primary" to="/auth/register" $primary>{c.cta}</PillLink>
        </NavLinks>
      </Nav>

      <Hero>
        <div>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <H1>{c.title}</H1>
          <Lead>{c.subtitle}</Lead>
          <Actions>
            <HeroButton to="/auth/register">{c.primary}<MdArrowForward /></HeroButton>
            <HeroButton to={blogPrefix} $secondary>{c.secondary}</HeroButton>
          </Actions>
          <Lead style={{ fontSize: 15, marginTop: 18 }}>{c.trust}</Lead>
        </div>
        <HeroMedia aria-label="Xtramys tactical football planning">
          <img src={fieldImage} alt={lang === 'en' ? 'Football tactical board for coaching planning' : 'Pizarra tactica de futbol para planificar entrenamientos'} />
          <MediaOverlay>
            <Metric><strong>360</strong><span>{lang === 'en' ? 'team view' : 'vision equipo'}</span></Metric>
            <Metric><strong>1</strong><span>{lang === 'en' ? 'workspace' : 'plataforma'}</span></Metric>
            <Metric><strong>24/7</strong><span>{lang === 'en' ? 'cloud access' : 'acceso cloud'}</span></Metric>
          </MediaOverlay>
        </HeroMedia>
      </Hero>

      <Section id="features">
        <SectionHead>
          <h2>{c.sectionsTitle}</h2>
          <p>{c.sectionsSubtitle}</p>
        </SectionHead>
        <FeatureGrid>
          {c.features.map(([title, text]) => (
            <Feature key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </Feature>
          ))}
        </FeatureGrid>
      </Section>

      <Section>
        <Audience>
          <SectionHead>
            <h2>{c.audiencesTitle}</h2>
          </SectionHead>
          <CheckList>
            {c.audiences.map((item) => (
              <li key={item}><MdCheckCircle /> {item}</li>
            ))}
          </CheckList>
        </Audience>
      </Section>

      <Section>
        <SectionHead>
          <h2>{c.blogTitle}</h2>
          <p>{c.blogSubtitle}</p>
        </SectionHead>
        <BlogGrid>
          {blogPosts.map((post) => {
            const p = post[lang] || post.es;
            return (
              <BlogCard key={post.slug} to={`${blogPrefix}/${post.slug}`}>
                <span>{p.category} · {p.readingTime}</span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
              </BlogCard>
            );
          })}
        </BlogGrid>
      </Section>

      <Final>
        <h2>{c.finalTitle}</h2>
        <p>{c.finalText}</p>
        <HeroButton to="/auth/register">{c.finalCta}<MdArrowForward /></HeroButton>
      </Final>

      <Footer>
        <span>© {new Date().getFullYear()} Xtramys</span>
        <span>
          <Link to={blogPrefix}>{c.navBlog}</Link> · <Link to="/auth/login">{c.login}</Link>
        </span>
      </Footer>
    </Page>
  );
}
