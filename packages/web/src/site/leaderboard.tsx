import {
  lazy,
  Suspense,
  useMemo,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import type { MetricEstimatesSchema } from '@ccp-bench/schema';
import type { z } from 'zod';
import { useDataset, format, titles, langName } from './data';
import { Head } from './layout';
const Chart = lazy(() => import('./chart'));
type Metric = keyof z.infer<typeof MetricEstimatesSchema>;
const metrics = Object.keys(titles) as Metric[];
export default function Leaderboard() {
  const { index, models } = useDataset();
  const [origin, setOrigin] = useState('all'),
    [weights, setWeights] = useState('all'),
    [language, setLanguage] = useState('en'),
    [split, setSplit] = useState('all'),
    [sort, setSort] = useState<Metric | 'composite'>('nas'),
    [descending, setDescending] = useState(true);
  const rows = useMemo(
    () =>
      models
        .filter(
          (m) =>
            (origin === 'all' || m.model.origin === origin) &&
            (weights === 'all' || m.model.weights === weights),
        )
        .map((m) => {
          const group = m.groups.find(
            (g) =>
              g.language === language &&
              g.split === split &&
              g.category === 'all' &&
              g.type === 'all' &&
              g.scope === 'china_sensitive',
          );
          return {
            model: m.model,
            metrics: group?.metrics,
            composite:
              language === 'all' && split === 'all' ? m.composite : null,
          };
        })
        .sort((a, b) => {
          const av =
              sort === 'composite' ? a.composite?.mean : a.metrics?.[sort].mean,
            bv =
              sort === 'composite' ? b.composite?.mean : b.metrics?.[sort].mean;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (descending ? -1 : 1) * (av - bv);
        }),
    [models, origin, weights, language, split, sort, descending],
  );
  function sorting(metric: typeof sort) {
    if (sort === metric) setDescending(!descending);
    else {
      setSort(metric);
      setDescending(true);
    }
  }
  const chartRows = rows.flatMap((r) => {
    const estimate = sort === 'composite' ? r.composite : r.metrics?.[sort];
    return estimate?.mean != null
      ? [
          {
            name: r.model.display.replace(/\s*\(.*\)/, ''),
            value: sort.includes('rate') ? estimate.mean * 100 : estimate.mean,
            se:
              estimate.se == null
                ? null
                : sort.includes('rate')
                  ? estimate.se * 100
                  : estimate.se,
          },
        ]
      : [];
  });
  return (
    <>
      <Head
        title="Leaderboard"
        description="Compare refusal, factual omission, and narrative alignment in model answers, with evidence and uncertainty beside each score."
      />
      <section className="hero">
        <div>
          <span className="release-status">
            {index.status === 'provisional'
              ? 'Provisional evaluation'
              : 'Validated evaluation'}
          </span>
          <h1>
            How models answer
            <br />
            sensitive questions.
          </h1>
          <p>
            Measure refusal, omission, and alignment with state narrative
            claims. Read the answers behind every result.
          </p>
          <div className="run-meta">
            <span>
              Last run{' '}
              <strong>
                {new Date(index.date).toLocaleDateString('en-US', {
                  dateStyle: 'medium',
                })}
              </strong>
            </span>
            <span>{index.models.length} models</span>
            <span>{index.items.length} public items</span>
          </div>
        </div>
        <div className="hero-note">
          <h2>A score is a starting point.</h2>
          <p>
            Higher narrative alignment means more rubric flags were endorsed. It
            does not establish a model's intent, developer affiliation, or
            overall quality.
          </p>
          <Link to="/methodology">Read the methodology</Link>
        </div>
      </section>
      {index.limitations.length > 0 && (
        <details className="notice" open>
          <summary>What this evaluation covers</summary>
          <ul>
            {index.limitations.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      )}
      <section className="results">
        <div className="section-heading">
          <h2>Model results</h2>
          <span>China-sensitive items · mean ± standard error</span>
        </div>
        <div className="filters">
          <label>
            Origin
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="all">All origins</option>
              <option value="prc">PRC</option>
              <option value="us">US</option>
              <option value="eu">Europe</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Weights
            <select
              value={weights}
              onChange={(e) => setWeights(e.target.value)}
            >
              <option value="all">Open and closed</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label>
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="all">All measured languages</option>
              {index.languages.map((l) => (
                <option key={l} value={l}>
                  {langName[l] ?? l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Split
            <select value={split} onChange={(e) => setSplit(e.target.value)}>
              <option value="all">Dev + held-out</option>
              <option value="dev">Dev</option>
              <option value="heldout">Held-out</option>
            </select>
          </label>
          <label>
            Sort / chart
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="composite">Composite</option>
              {metrics.map((k) => (
                <option key={k} value={k}>
                  {titles[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rows.length === 0 ? (
          <div className="empty">
            No models match these filters. Choose a broader origin or weights
            filter.
          </div>
        ) : (
          <>
            <div className="table-scroll leaderboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    {['composite', ...metrics].map((k) => (
                      <th
                        key={k}
                        aria-sort={
                          sort === k
                            ? descending
                              ? 'descending'
                              : 'ascending'
                            : 'none'
                        }
                      >
                        <button onClick={() => sorting(k as typeof sort)}>
                          {k === 'composite' ? 'Composite' : titles[k]}{' '}
                          {sort === k ? (descending ? '↓' : '↑') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.model.key}>
                      <th>
                        <Link to={`/models/${r.model.key}`}>
                          {r.model.display}
                        </Link>
                        <small>
                          {r.model.origin.toUpperCase()} · {r.model.weights}{' '}
                          weights
                        </small>
                      </th>
                      <td>{format(r.composite?.mean, 'composite')}</td>
                      {metrics.map((k) => (
                        <td key={k}>
                          {format(r.metrics?.[k].mean, k)}
                          {r.metrics?.[k].se != null && (
                            <small>
                              ± {format(r.metrics[k].se, k)} · n=
                              {r.metrics[k].n}
                            </small>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-results">
              {rows.map((r) => (
                <article key={r.model.key}>
                  <h3>
                    <Link to={`/models/${r.model.key}`}>{r.model.display}</Link>
                  </h3>
                  <dl>
                    <div>
                      <dt>Composite</dt>
                      <dd>{format(r.composite?.mean, 'composite')}</dd>
                    </div>
                    {metrics.map((k) => (
                      <div key={k}>
                        <dt>{titles[k]}</dt>
                        <dd>
                          {format(r.metrics?.[k].mean, k)}
                          <small>
                            {r.metrics?.[k].se != null
                              ? '± ' + format(r.metrics[k].se, k)
                              : ''}
                          </small>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
        <p className="caption">
          Composite = {index.weights.nas} × NAS + {index.weights.refusal} ×
          refusal rate + {index.weights.omission} × omission rate. It requires
          both English and Simplified Chinese; unavailable values are never
          replaced with zero.
        </p>
        {chartRows.length ? (
          <Deferred>
            <Suspense
              fallback={
                <div className="skeleton">
                  <div />
                </div>
              }
            >
              <Chart
                rows={chartRows}
                title={
                  (sort === 'composite' ? 'Composite' : titles[sort]) +
                  (sort.includes('rate') ? ' (%)' : '')
                }
              />
            </Suspense>
          </Deferred>
        ) : (
          <div className="empty">
            This metric has not been measured for the selected language and
            split. Select another metric or the dev split.
          </div>
        )}
      </section>
      <section className="coverage">
        <h2>Coverage and exclusions</h2>
        <p>
          Incomplete generations and invalid judge pairs are excluded, not
          counted as refusals.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Language</th>
                <th>Scored / recorded</th>
                <th>Excluded</th>
              </tr>
            </thead>
            <tbody>
              {index.coverage.map((c) => (
                <tr key={c.model_key + c.language}>
                  <th>
                    {index.models.find((m) => m.key === c.model_key)?.display}
                  </th>
                  <td>{langName[c.language]}</td>
                  <td>
                    {c.scored_samples} / {c.recorded_samples}
                  </td>
                  <td>
                    {Object.entries(c.exclusions)
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${v} ${k.replaceAll('_', ' ')}`)
                      .join(', ') || 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Deferred({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ minHeight: 300 }}>
      {visible ? (
        children
      ) : (
        <p className="caption">
          Chart appears here. The table above contains the same values.
        </p>
      )}
    </div>
  );
}
