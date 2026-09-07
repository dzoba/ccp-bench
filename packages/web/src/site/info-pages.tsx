import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { marked } from 'marked';
import { z } from 'zod';
import { AgreementRowSchema } from '@ccp-bench/schema';
import methodology from '../../../../docs/METHODOLOGY.md?raw';
import changelog from '../../../../docs/CHANGELOG.md?raw';
import { Head, PageIntro } from './layout';
import { useDataset, fetchData, human } from './data';
export function Methodology() {
  const { index } = useDataset();
  const [rows, setRows] = useState<z.infer<typeof AgreementRowSchema>[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    const a = new AbortController();
    fetchData(
      `/data/${index.version}/agreement.json`,
      z.array(AgreementRowSchema),
      a.signal,
    )
      .then(setRows)
      .catch((e) => {
        if (!a.signal.aborted) setError(String(e));
      });
    return () => a.abort();
  }, [index.version]);
  return (
    <>
      <Head
        title="Methodology"
        description="How questions, narrative flags, reference facts, two-family judging, scoring, uncertainty, and held-out privacy work."
      />
      <div
        className="prose"
        dangerouslySetInnerHTML={{
          __html: marked.parse(methodology) as string,
        }}
      />
      <section>
        <h2>Judge agreement for this run</h2>
        <p>
          Kappa is shown separately for each actual judge pair. Undefined values
          reflect insufficient variation, not perfect agreement.
        </p>
        {error ? (
          <div className="notice">
            Agreement data could not be loaded. Reload to try again.
          </div>
        ) : !rows.length ? (
          <div className="skeleton">
            <div />
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Judge pair</th>
                  <th>Field</th>
                  <th>Kappa</th>
                  <th>Paired decisions</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) =>
                    [
                      'label',
                      'refusal',
                      'flags_matched',
                      'facts_present',
                    ].includes(r.field),
                  )
                  .map((r, i) => (
                    <tr key={i}>
                      <th>{human(r.category)}</th>
                      <td>{r.judge_keys.join(' / ')}</td>
                      <td>{human(r.field)}</td>
                      <td>
                        {r.kappa === null ? 'Undefined' : r.kappa.toFixed(3)}
                      </td>
                      <td>{r.pairs}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p>
        <a href="https://github.com/dzoba/ccp-bench/tree/main/packages/runner/src/judge/prompts">
          Read the versioned judge prompts
        </a>
      </p>
    </>
  );
}
export function Sources() {
  return (
    <>
      <Head
        title="Sources"
        description="Source datasets, research provenance, and the distinction between imported claims and reviewed benchmark references."
      />
      <PageIntro title="Sources and provenance.">
        <p>
          The question bank began with the supplied CCP Bench candidate
          repository. Each item preserves its source attribution and version
          history.
        </p>
      </PageIntro>
      <div className="prose">
        <h2>Start with the item-level evidence</h2>
        <p>
          References are attached to <Link to="/items">individual items</Link>.
          The imported bank is currently marked draft. Source claims are
          preserved as attribution and are not presented as independently
          verified consensus.
        </p>
        <h2>Repository sources</h2>
        <ul>
          <li>
            <a href="https://github.com/dzoba/ccp-bench/blob/main/docs/source/question-bank-v0.md">
              Original candidate question repository
            </a>
          </li>
          <li>
            <a href="https://github.com/dzoba/ccp-bench/blob/main/docs/IMPORT_REPORT.md">
              Import audit and source completeness report
            </a>
          </li>
          <li>
            <a href="https://github.com/dzoba/ccp-bench/blob/main/docs/CONTRIBUTING.md">
              Reference and rubric contribution guidelines
            </a>
          </li>
        </ul>
        <h2>Upstream attributions</h2>
        <p>
          The supplied repository cites llmcensor, CAISI, and deccp, among other
          sources. Their attributions remain in each item's provenance.
          Inclusion is not a claim that our pilot reproduces every upstream
          result.
        </p>
        <h2>Corrections are part of the method</h2>
        <p>
          Report an unclear question, disputed reference, missing source, or
          mistranslation using the dispute form on its item page. Revised
          wording receives a new item version.
        </p>
      </div>
    </>
  );
}
export function Changelog() {
  return (
    <>
      <Head
        title="Changelog"
        description="Benchmark versions, item changes, scoring decisions, and implementation milestones."
      />
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: marked.parse(changelog) as string }}
      />
    </>
  );
}
export function About() {
  return (
    <>
      <Head
        title="About"
        description="CCP Bench is an independent, open benchmark maintained by Chris Dzoba, with MIT code and CC BY 4.0 data."
      />
      <PageIntro title="Open methods. Inspectable evidence.">
        <p>
          CCP Bench measures how language models answer politically sensitive
          and matched control questions.
        </p>
      </PageIntro>
      <div className="prose">
        <h2>Maintainer</h2>
        <p>
          Chris Dzoba. Contact{' '}
          <a href="mailto:chris@dzoba.com">chris@dzoba.com</a> or open an issue
          in the <a href="https://github.com/dzoba/ccp-bench">repository</a>.
        </p>
        <h2>Independence</h2>
        <p>
          This project is not affiliated with any government, model vendor, or
          upstream dataset author. Scores describe observed responses under a
          recorded configuration; they do not establish intent or general model
          quality.
        </p>
        <h2>License</h2>
        <p>
          Code is available under MIT. Authored benchmark data is available
          under CC BY 4.0. Source materials retain their original licenses and
          attributions.
        </p>
        <h2>Current status</h2>
        <p>
          The site currently exposes a provisional pilot. Human calibration
          review, translations, held-out evaluation, and the full model roster
          are being developed. Limitations remain visible beside the results.
        </p>
      </div>
    </>
  );
}
export function NotFound() {
  return (
    <>
      <Head
        title="Page not found"
        description="This page does not exist. Return to the benchmark or browse public questions."
      />
      <section className="not-found">
        <span>404</span>
        <h1>This page isn't in the record.</h1>
        <p>The link may have moved, or the item may not be public.</p>
        <div>
          <Link className="button" to="/">
            View leaderboard
          </Link>
          <Link to="/items">Browse items</Link>
        </div>
      </section>
    </>
  );
}
