import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useDataset, format, titles, human, langName } from './data';
import { Head, PageIntro } from './layout';
import type { PublicModel } from '@ccp-bench/schema';
type Metric = keyof PublicModel['metrics'];
const metrics = Object.keys(titles) as Metric[];
export function ModelPage() {
  const { key } = useParams();
  const { models, index } = useDataset();
  const model = models.find((m) => m.model.key === key);
  if (!model)
    return (
      <>
        <Head
          title="Model unavailable"
          description="The requested model is not included in this run."
        />
        <div className="empty">
          <h1>Model unavailable</h1>
          <Link to="/">Browse evaluated models</Link>
        </div>
      </>
    );
  const categoryRows = model.groups.filter(
    (g) =>
      g.category !== 'all' &&
      g.type === 'all' &&
      g.language === 'en' &&
      g.split === 'all',
  );
  const typeRows = model.groups.filter(
    (g) =>
      g.category === 'all' &&
      g.type !== 'all' &&
      g.language === 'en' &&
      g.split === 'all',
  );
  const top = [...model.items]
    .filter((i) => i.scope === 'china_sensitive' && i.language === 'en')
    .sort((a, b) => (b.metrics.nas ?? -1) - (a.metrics.nas ?? -1))
    .slice(0, 10);
  return (
    <>
      <Head
        title={model.model.display}
        description={`Inspect ${model.model.display}'s refusal, omission, narrative alignment, category results, and public answer transcripts.`}
      />
      <div className="breadcrumb">
        <Link to="/">Leaderboard</Link> / Model
      </div>
      <PageIntro title={model.model.display}>
        <p>
          {model.model.origin.toUpperCase()} origin · {model.model.weights}{' '}
          weights · {model.model.host} hosting
        </p>
        <p>
          Endpoint: {model.model.endpoint.model}. Settings and model metadata
          are snapshotted with the run.
        </p>
      </PageIntro>
      <section>
        <h2>Category profile</h2>
        <p>
          English results. Darker cells indicate higher measured values, not
          greater certainty.
        </p>
        <div className="table-scroll">
          <table className="heatmap">
            <thead>
              <tr>
                <th>Category</th>
                {metrics.map((k) => (
                  <th key={k}>{titles[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((r) => (
                <tr key={r.category + r.scope}>
                  <th>{human(r.category)}</th>
                  {metrics.map((k) => (
                    <td
                      key={k}
                      style={{
                        background:
                          r.metrics[k].mean == null
                            ? undefined
                            : `color-mix(in srgb, var(--accent) ${Math.min(50, Math.max(0, (r.metrics[k].mean ?? 0) * (k === 'nas' ? 0.5 : k === 'evasion' ? 12.5 : 50)))}%, var(--surface))`,
                      }}
                    >
                      {format(r.metrics[k].mean, k)}
                      <small>± {format(r.metrics[k].se, k)}</small>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>By question type</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Type / scope</th>
                <th>Refusal</th>
                <th>NAS</th>
                <th>Omission</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map((r) => (
                <tr key={r.type + r.scope}>
                  <th>
                    {human(r.type)} / {human(r.scope)}
                  </th>
                  {(['refusal_rate', 'nas', 'omission_rate'] as Metric[]).map(
                    (k) => (
                      <td key={k}>{format(r.metrics[k].mean, k)}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Languages and hosting</h2>
        <p>
          {index.languages.map((l) => langName[l]).join(', ')} measured.{' '}
          <Link to="/languages">View language comparisons</Link>.
        </p>
        {model.host_gaps.length ? (
          <ul>
            {model.host_gaps
              .filter((g) => g.split === 'all')
              .map((g, i) => (
                <li key={i}>
                  {g.vendor_model} minus {g.other_model}, {langName[g.language]}
                  : NAS gap {format(g.metrics.nas.mean, 'nas')}
                </li>
              ))}
          </ul>
        ) : (
          <div className="empty">
            No paired vendor-host comparison has been run for these weights.
          </div>
        )}
      </section>
      <section>
        <h2>Highest narrative alignment on public items</h2>
        <ol className="ranked-items">
          {top.map((i) => (
            <li key={i.item_id}>
              <Link to={`/items/${i.item_id}`}>
                {index.items.find((x) => x.id === i.item_id)?.prompt ??
                  i.item_id}
              </Link>
              <span>{format(i.metrics.nas, 'nas')} NAS</span>
            </li>
          ))}
        </ol>
        {!top.length && <p>No graded public items for this model.</p>}
      </section>
    </>
  );
}
export function ComparePage() {
  const { index, models } = useDataset();
  const [left, setLeft] = useState(models[0]!.model.key),
    [right, setRight] = useState(models[1]?.model.key ?? models[0]!.model.key),
    [only, setOnly] = useState(false);
  const a = models.find((m) => m.model.key === left)!,
    b = models.find((m) => m.model.key === right)!;
  const rows = index.items
    .map((item) => ({
      item,
      a: a.items.find((r) => r.item_id === item.id && r.language === 'en'),
      b: b.items.find((r) => r.item_id === item.id && r.language === 'en'),
    }))
    .filter(
      (r) =>
        !only || JSON.stringify(r.a?.metrics) !== JSON.stringify(r.b?.metrics),
    );
  return (
    <>
      <Head
        title="Compare models"
        description="Compare two models on the same public questions and inspect where their answers and metrics differ."
      />
      <PageIntro title="Compare the same questions.">
        <p>
          English public-item results. Each link opens the underlying
          transcripts and judge verdicts.
        </p>
      </PageIntro>
      <div className="filters">
        <label>
          First model
          <select value={left} onChange={(e) => setLeft(e.target.value)}>
            {models.map((m) => (
              <option key={m.model.key} value={m.model.key}>
                {m.model.display}
              </option>
            ))}
          </select>
        </label>
        <label>
          Second model
          <select value={right} onChange={(e) => setRight(e.target.value)}>
            {models.map((m) => (
              <option key={m.model.key} value={m.model.key}>
                {m.model.display}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={only}
            onChange={(e) => setOnly(e.target.checked)}
          />
          Show only differences
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>{a.model.display}</th>
              <th>{b.model.display}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item.id}>
                <th>
                  <Link to={`/items/${r.item.id}`}>{r.item.prompt}</Link>
                </th>
                {[r.a, r.b].map((v, i) => (
                  <td key={i}>
                    {v ? (
                      <>
                        <strong>{format(v.metrics.nas, 'nas')} NAS</strong>
                        <small>
                          {format(v.metrics.refusal_rate, 'refusal_rate')}{' '}
                          refusal ·{' '}
                          {format(v.metrics.omission_rate, 'omission_rate')}{' '}
                          omission
                        </small>
                      </>
                    ) : (
                      'Not evaluated'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="empty">
          No differences in the measured public-item metrics for this pair.
        </div>
      )}
    </>
  );
}
export function LanguagesPage() {
  const { models, index } = useDataset();
  return (
    <>
      <Head
        title="Language gaps"
        description="Compare English, Simplified Chinese, and Traditional Chinese responses, using paired questions and transparent coverage."
      />
      <PageIntro title="Does language change the answer?">
        <p>
          Language gaps use paired items. Positive values mean higher scores in
          Chinese than English.
        </p>
      </PageIntro>
      {!index.languages.includes('zh-Hans') && (
        <div className="notice">
          <strong>Chinese evaluation is not yet available.</strong>
          <p>
            The current pilot measures English only. Translation and bilingual
            runs will populate this page; missing results are not zeros.
          </p>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>English NAS</th>
              <th>Simplified Chinese NAS</th>
              <th>Traditional Chinese NAS</th>
              <th>zh-Hans minus en</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.model.key}>
                <th>
                  <Link to={`/models/${m.model.key}`}>{m.model.display}</Link>
                </th>
                {['en', 'zh-Hans', 'zh-Hant'].map((l) => (
                  <td key={l} lang={l}>
                    {format(
                      m.groups.find(
                        (g) =>
                          g.language === l &&
                          g.split === 'all' &&
                          g.category === 'all' &&
                          g.type === 'all' &&
                          g.scope === 'china_sensitive',
                      )?.metrics.nas.mean,
                      'nas',
                    )}
                  </td>
                ))}
                <td>
                  {format(
                    m.language_gaps.find(
                      (g) => g.language === 'zh-Hans' && g.split === 'all',
                    )?.metrics.nas.mean,
                    'nas',
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
