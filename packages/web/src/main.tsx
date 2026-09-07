import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route } from 'react-router';
import { DatasetProvider } from './site/data';
import { Layout } from './site/layout';
import Leaderboard from './site/leaderboard';
import './style.css';
const ItemExplorer = lazy(() =>
  import('./site/item-pages').then((m) => ({ default: m.ItemExplorer })),
);
const ItemPage = lazy(() =>
  import('./site/item-pages').then((m) => ({ default: m.ItemPage })),
);
const ModelPage = lazy(() =>
  import('./site/model-pages').then((m) => ({ default: m.ModelPage })),
);
const ComparePage = lazy(() =>
  import('./site/model-pages').then((m) => ({ default: m.ComparePage })),
);
const LanguagesPage = lazy(() =>
  import('./site/model-pages').then((m) => ({ default: m.LanguagesPage })),
);
const Methodology = lazy(() =>
  import('./site/info-pages').then((m) => ({ default: m.Methodology })),
);
const Sources = lazy(() =>
  import('./site/info-pages').then((m) => ({ default: m.Sources })),
);
const Changelog = lazy(() =>
  import('./site/info-pages').then((m) => ({ default: m.Changelog })),
);
const About = lazy(() =>
  import('./site/info-pages').then((m) => ({ default: m.About })),
);
const NotFound = lazy(() =>
  import('./site/info-pages').then((m) => ({ default: m.NotFound })),
);
const Admin = lazy(() =>
  import('./site/disputes').then((m) => ({ default: m.AdminDisputes })),
);
function App() {
  return (
    <Layout>
      <DatasetProvider>
        <Suspense
          fallback={
            <div className="skeleton" role="status" aria-label="Loading page">
              <div />
              <div />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Leaderboard />} />
            <Route path="/items" element={<ItemExplorer />} />
            <Route path="/items/:id" element={<ItemPage />} />
            <Route path="/models/:key" element={<ModelPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/languages" element={<LanguagesPage />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin/disputes" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </DatasetProvider>
    </Layout>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
