import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useDataset } from './data';
import { Head } from './layout';

export default function Home() {
  const { index, models } = useDataset();
  const rows = models
    .filter((model) => model.composite?.mean != null)
    .sort((a, b) => b.composite!.mean! - a.composite!.mean!);
  const ceiling = Math.min(
    100,
    Math.max(
      25,
      Math.ceil(
        Math.max(
          ...rows.map(
            ({ composite }) => composite!.mean! + (composite!.se ?? 0),
          ),
        ) / 25,
      ) * 25,
    ),
  );
  return (
    <section className="home-chart" aria-labelledby="chart-title">
      <Head
        title="Censorship & narrative alignment"
        description="Compare model censorship and narrative alignment scores across English and Chinese questions. Explore the evidence behind the provisional results."
      />
      <div className="home-chart-heading">
        <h1 id="chart-title">Censorship &amp; narrative alignment.</h1>
        <Link className="pilot-tag" to="/results">
          {index.status === 'provisional'
            ? 'Provisional pilot'
            : 'Validated results'}
        </Link>
      </div>
      <figure
        className="money-chart"
        aria-labelledby="chart-title"
        aria-describedby="chart-note"
      >
        <div className="score-axis" aria-hidden="true">
          {[ceiling, ceiling * 0.75, ceiling * 0.5, ceiling * 0.25, 0].map(
            (tick) => (
              <span key={tick}>{Number(tick.toFixed(1))}</span>
            ),
          )}
        </div>
        <div
          className="score-rows"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, rows.length)}, minmax(0, 1fr))`,
          }}
        >
          {rows.map(({ model, composite }) => {
            const name = model.display
              .replace(/^.*?:\s*/, '')
              .replace(/\s*\(.*\)/, '');
            const mean = composite!.mean!;
            const se = composite!.se;
            const low = Math.max(0, mean - (se ?? 0));
            const high = Math.min(100, mean + (se ?? 0));
            return (
              <Link
                className="score-row"
                key={model.key}
                to={`/models/${model.key}`}
              >
                <span className="score-model">{name}</span>
                <span
                  className="score-track"
                  style={
                    {
                      '--score': `${(mean / ceiling) * 100}%`,
                      '--low': `${(low / ceiling) * 100}%`,
                      '--interval': `${((high - low) / ceiling) * 100}%`,
                      '--high': `${(high / ceiling) * 100}%`,
                    } as CSSProperties
                  }
                >
                  <span className="score-bar" />
                  {se != null && <span className="score-whisker" />}
                  <span className="score-number">{mean.toFixed(1)}</span>
                  <span className="sr-only">
                    {' '}
                    out of 100; standard error{' '}
                    {se == null ? 'unavailable' : se.toFixed(1)}; n=
                    {composite!.n}. View evidence.
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
        {rows.length === 0 && (
          <p className="empty">
            Composite scores are not available yet.{' '}
            <Link to="/results">See measured results</Link>.
          </p>
        )}
        <figcaption id="chart-note">
          <span>
            Composite score / 100 <span className="chart-note-divider">·</span>{' '}
            Lower is better
          </span>
          <span>
            English + Chinese <span className="chart-note-divider">·</span>{' '}
            Whiskers ±1 SE
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
