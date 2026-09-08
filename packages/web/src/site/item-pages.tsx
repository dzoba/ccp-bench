import { useEffect, useState, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { PublicItemSchema, type PublicItem } from '@ccp-bench/schema';
import { useDataset, fetchData, human, langName } from './data';
import { Head, PageIntro } from './layout';
const Dispute = lazy(() => import('./disputes'));
const verdictName = (label: string) =>
  label === 'parroting' ? 'Narrative endorsement' : human(label);
export function ItemExplorer() {
  const { index } = useDataset();
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [type, setType] = useState('all'),
    [contested, setContested] = useState('all'),
    [coverage, setCoverage] = useState('results');
  const hasResults = (item: (typeof index.items)[number]) =>
    Object.values(item.labels).some((labels) => labels.length > 0);
  const evaluatedCount = index.items.filter(hasResults).length;
  const items = index.items.filter(
    (i) =>
      (coverage === 'all' ||
        (coverage === 'results' ? hasResults(i) : !hasResults(i))) &&
      (category === 'all' || i.category === category) &&
      (type === 'all' || i.type === type) &&
      (contested === 'all' || String(i.contested) === contested) &&
      (i.prompt + ' ' + i.id).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Head
        title="Item explorer"
        description="Browse public benchmark questions, reference facts, narrative flags, and model answer transcripts."
      />
      <PageIntro title="Inspect the questions.">
        <p>
          {evaluatedCount} of {index.items.length} questions have published
          results.
        </p>
      </PageIntro>
      <div className="filters">
        <label>
          Coverage
          <select
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
          >
            <option value="results">With results ({evaluatedCount})</option>
            <option value="all">All questions ({index.items.length})</option>
            <option value="pending">
              Without results ({index.items.length - evaluatedCount})
            </option>
          </select>
        </label>
        <label className="search-label">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Question text or item ID"
            type="search"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {index.categories.map((c) => (
              <option key={c} value={c}>
                {human(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {['direct', 'indirect', 'control'].map((t) => (
              <option key={t} value={t}>
                {human(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contested
          <select
            value={contested}
            onChange={(e) => setContested(e.target.value)}
          >
            <option value="all">All items</option>
            <option value="true">Contested</option>
            <option value="false">Not contested</option>
          </select>
        </label>
      </div>
      <p className="caption">{items.length} matching items</p>
      <div className="item-list">
        {items.map((i) => (
          <article key={i.id}>
            <div className="item-meta">
              {human(i.category)}{' '}
              <span>
                {i.id} · {i.type}
                {i.contested ? ' · Contested' : ''}
              </span>
            </div>
            <h2>
              <Link to={`/items/${i.id}`}>{i.prompt}</Link>
            </h2>
            <div className="label-row">
              {hasResults(i) ? (
                index.models.map((m) => (
                  <span key={m.key}>
                    <strong>{m.display.replace(/\s*\(.*\)/, '')}</strong>{' '}
                    {i.labels[m.key]?.length ? (
                      i.labels[m.key]!.map((l) => (
                        <span className={`label-chip ${l}`} key={l}>
                          {verdictName(l)}
                        </span>
                      ))
                    ) : (
                      <span className="muted">No scored answer</span>
                    )}
                  </span>
                ))
              ) : (
                <span className="muted">No results in this run</span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="empty">
          No questions match these filters. Try another search or category, or
          select All questions to include questions without results.
        </div>
      )}
    </>
  );
}
export function ItemPage() {
  const { id } = useParams();
  const { index } = useDataset();
  const [data, setData] = useState<PublicItem | null>(null),
    [error, setError] = useState(''),
    [language, setLanguage] = useState('en'),
    [showDispute, setShowDispute] = useState(false);
  useEffect(() => {
    setData(null);
    setError('');
    if (!index.items.some((i) => i.id === id)) {
      setError(
        'This public item does not exist. Held-out items are not available.',
      );
      return;
    }
    const abort = new AbortController();
    fetchData(
      `/data/${index.version}/items/${id}.json`,
      PublicItemSchema,
      abort.signal,
    )
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : 'Unable to load item');
      });
    return () => abort.abort();
  }, [id, index]);
  if (error)
    return (
      <>
        <Head
          title="Item unavailable"
          description="This public benchmark item is unavailable."
        />
        <div className="empty">
          <h1>Item unavailable</h1>
          <p>{error}</p>
          <Link to="/items">Browse public items</Link>
        </div>
      </>
    );
  if (!data)
    return (
      <div className="skeleton" role="status" aria-label="Loading item">
        <div />
        <div />
        <div />
      </div>
    );
  const { item, transcripts } = data;
  const langs = Object.keys(item.prompts);
  return (
    <>
      <Head
        title={`${item.id}: ${human(item.category)}`}
        description={item.prompts.en}
      />
      <div className="breadcrumb">
        <Link to="/items">All items</Link> / {item.id}
      </div>
      <PageIntro title={item.prompts.en}>
        <p>
          {human(item.category)} · {human(item.type)} · Reference status:{' '}
          {item.review_status}
        </p>
      </PageIntro>
      <div className="tabs" aria-label="Prompt language">
        {langs.map((l) => (
          <button
            className={l === language ? 'selected' : ''}
            key={l}
            onClick={() => setLanguage(l)}
          >
            {langName[l] ?? l}
          </button>
        ))}
      </div>
      <blockquote lang={language}>
        {item.prompts[language as keyof typeof item.prompts] ??
          'No translation available.'}
      </blockquote>
      {item.contested && (
        <div className="notice">
          <strong>Contested claim</strong>
          <p>{item.contested_note}</p>
          <p>
            This item measures whether a disputed claim is asserted as settled,
            not which side is taken.
          </p>
        </div>
      )}
      <section className="reference-panel">
        <h2>Reference answer</h2>
        <p>{item.reference_answer}</p>
        <details>
          <summary>Sources and provenance</summary>
          <ul>
            {item.reference_sources.map((s, i) => (
              <li key={i}>
                {/^https?:\/\//.test(s) ? <a href={s}>{s}</a> : s}
              </li>
            ))}
          </ul>
          <p>
            Source dataset: {item.provenance.dataset ?? 'Locally authored'}.
            Item version {item.version}.
          </p>
        </details>
        <div className="rubric-columns">
          <div>
            <h3>Required facts</h3>
            <ul>
              {item.required_facts.map((f) => (
                <li key={f.id}>
                  {f.text}
                  <small>Weight {f.weight}</small>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Narrative flags</h3>
            <ul>
              {item.narrative_flags.map((f) => (
                <li key={f.id}>
                  {f.text}
                  <small>
                    Severity {f.severity} · Actor {f.actor.toUpperCase()}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <h2>Model transcripts</h2>
          <span>
            Visible answers are graded; reasoning is shown separately.
          </span>
        </div>
        <div className="transcript-grid">
          {index.models.map((m) => {
            const answers = transcripts.filter(
              (t) => t.model_key === m.key && t.language === language,
            );
            return (
              <article key={m.key}>
                <h3>
                  <Link to={`/models/${m.key}`}>{m.display}</Link>
                </h3>
                {!answers.length ? (
                  <p className="muted">
                    This model has no answer for this item and language in this
                    run.
                  </p>
                ) : (
                  answers.map((a) => (
                    <div key={a.sample_idx} className="sample">
                      <p className="caption">
                        Sample {a.sample_idx + 1} · Finish: {a.finish_reason}
                        {a.filter_layer === 'api' ? ' · API filter' : ''}
                      </p>
                      {a.provider_error ? (
                        <p className="notice">
                          Provider error: {a.provider_error}
                        </p>
                      ) : (
                        <p className="answer-text" lang={language}>
                          {a.text}
                        </p>
                      )}
                      {a.reasoning && (
                        <details>
                          <summary>Reasoning trace (not graded)</summary>
                          <p className="answer-text">{a.reasoning}</p>
                        </details>
                      )}
                      {a.judgments.map((j) => (
                        <details key={j.judge_key}>
                          <summary>
                            {j.verdict
                              ? verdictName(j.verdict.label)
                              : 'Judge error'}{' '}
                            · {j.judge_key}
                          </summary>
                          {j.judge_error ? (
                            <p>{j.judge_error}</p>
                          ) : (
                            <>
                              <p>{j.verdict!.rationale}</p>
                              <dl>
                                <dt>Facts present</dt>
                                <dd>
                                  {j.verdict!.facts_present.join(', ') ||
                                    'None'}
                                </dd>
                                <dt>Flags matched</dt>
                                <dd>
                                  {j.verdict!.flags_matched.join(', ') ||
                                    'None'}
                                </dd>
                                <dt>Evasion</dt>
                                <dd>{j.verdict!.evasion}</dd>
                                <dt>Confidence</dt>
                                <dd>{j.verdict!.confidence}</dd>
                              </dl>
                            </>
                          )}
                        </details>
                      ))}
                      {a.human && (
                        <details>
                          <summary>
                            Human review: {verdictName(a.human.verdict.label)}
                          </summary>
                          <p>{a.human.verdict.rationale}</p>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="dispute-callout">
        <h2>See something that needs correction?</h2>
        <p>
          Dispute a prompt, reference, rubric flag, required fact, or
          translation.
        </p>
        <button onClick={() => setShowDispute(!showDispute)}>
          {showDispute ? 'Close dispute form' : 'Dispute this item'}
        </button>
        {showDispute && (
          <Suspense fallback={<p>Loading dispute form…</p>}>
            <Dispute itemId={item.id} />
          </Suspense>
        )}
      </section>
    </>
  );
}
