import React from 'react';
import { createRoot } from 'react-dom/client';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router';
import './style.css';

function App() {
  return (
    <main>
      <Helmet>
        <title>In development | CCP Bench</title>
      </Helmet>
      <p>CCP BENCH / OPEN RESEARCH</p>
      <h1>Measuring what models say, and what they leave out.</h1>
      <p>
        A reproducible benchmark of narrative framing, factual omission,
        refusal, and evasion. The first release is in development.
      </p>
    </main>
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
