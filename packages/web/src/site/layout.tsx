import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { Menu, X } from 'lucide-react';
export function Head({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} | CCP Bench`;
  }, [title]);
  const origin = import.meta.env.VITE_SITE_URL || window.location.origin;
  const url = origin + pathname;
  return (
    <Helmet>
      <title>{title} | CCP Bench</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={`${title} | CCP Bench`} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${origin}/og.png`} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
const links = [
  ['/', 'Overview'],
  ['/results', 'Results'],
  ['/items', 'Items'],
  ['/compare', 'Compare'],
  ['/languages', 'Languages'],
  ['/methodology', 'Methodology'],
];
export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="logo">
          <span className="logo-mark" aria-hidden="true">
            ▥
          </span>
          CCP Bench
        </Link>
        <button
          className="menu-toggle"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? 'open' : ''}>
          {links.map(([to, label]) => (
            <NavLink end={to === '/'} key={to} to={to!}>
              {label}
            </NavLink>
          ))}
          <a className="repo-link" href="https://github.com/dzoba/ccp-bench">
            GitHub
          </a>
        </nav>
      </header>
      <main id="content" className={pathname === '/' ? 'home-main' : undefined}>
        {children}
      </main>
      <footer className="site-footer">
        <nav aria-label="Footer">
          <Link to="/sources">Sources</Link>
          <Link to="/changelog">Changelog</Link>
          <Link to="/about">About</Link>
          <Link to="/admin/disputes">Maintainer sign-in</Link>
        </nav>
        <span>MIT code / CC BY 4.0 data</span>
      </footer>
    </>
  );
}
export function PageIntro({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="page-intro">
      <h1>{title}</h1>
      <div>{children}</div>
    </div>
  );
}
