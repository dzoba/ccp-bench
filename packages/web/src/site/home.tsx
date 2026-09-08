import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useDataset } from './data';
import { Head } from './layout';

export default function Home() {
  const { index, models } = useDataset();
  const rows = models
    .map((entry) => ({
      model: entry.model,
      alignment: entry.groups.find(
        (group) =>
          group.scope === 'china_sensitive' &&
          group.category === 'all' &&
          group.type === 'all' &&
          group.language === 'all' &&
          group.split === 'all',
      )?.metrics.nas,
    }))
    .filter((row) => row.alignment?.mean != null)
    .sort((a, b) => b.alignment!.mean! - a.alignment!.mean!);
  const ceiling = Math.min(
    100,
    Math.max(
      25,
      Math.ceil(
        Math.max(
          ...rows.map(
            ({ alignment }) => alignment!.mean! + (alignment!.se ?? 0),
          ),
        ) / 25,
      ) * 25,
    ),
  );
  return (
    <section className="home-chart" aria-labelledby="chart-title">
      <Head
        title="CCP narrative alignment"
        description="Measure how AI answers align with CCP narratives across English and Chinese questions, with sources and uncertainty."
      />
      <div className="home-chart-heading">
        <h1 id="chart-title">
          Measuring how AI answers align with CCP narratives.
        </h1>
        <Link className="pilot-tag" to="/results">
          {index.status === 'provisional'
            ? 'Provisional results'
            : 'Validated results'}
        </Link>
      </div>
      <div className="chart-legend" aria-label="Model developer location">
        <span>
          <i className="origin-china" />
          China
        </span>
        <span>
          <i className="origin-us" />
          United States
        </span>
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
          {rows.map(({ model, alignment }) => {
            const name = model.display
              .replace(/^.*?:\s*/, '')
              .replace(/\s*\(.*\)/, '')
              .replace('Qwen3 235B A22B Instruct 2507', 'Qwen3 235B');
            const mean = alignment!.mean!;
            const se = alignment!.se;
            const low = Math.max(0, mean - (se ?? 0));
            const high = Math.min(100, mean + (se ?? 0));
            return (
              <Link
                className={`score-row ${model.origin === 'prc' ? 'model-china' : 'model-us'}`}
                key={model.key}
                to={`/models/${model.key}`}
              >
                <span className="score-model" title={model.display}>
                  {name}
                  <span className="sr-only">
                    {' '}
                    ({model.origin === 'prc' ? 'China' : 'United States'})
                  </span>
                </span>
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
                    {alignment!.n}. View evidence.
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
        {rows.length === 0 && (
          <p className="empty">
            Narrative alignment scores are not available yet.{' '}
            <Link to="/results">See measured results</Link>.
          </p>
        )}
        <figcaption id="chart-note">
          <span>
            CCP narrative alignment / 100{' '}
            <span className="chart-note-divider">·</span> Higher = more
            alignment
          </span>
          <span>
            English + Chinese <span className="chart-note-divider">·</span>{' '}
            Whiskers ±1 SE
          </span>
        </figcaption>
        <p className="alignment-note">
          Low alignment does not imply US alignment.{' '}
          <Link to="/methodology">How to read this</Link>
        </p>
      </figure>
    </section>
  );
}
