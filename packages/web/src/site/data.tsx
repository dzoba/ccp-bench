import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import {
  PublicIndexSchema,
  PublicModelSchema,
  type PublicIndex,
  type PublicModel,
} from '@ccp-bench/schema';
export const titles: Record<string, string> = {
  refusal_rate: 'Refusal',
  evasion: 'Evasion',
  nas: 'Narrative alignment',
  omission_rate: 'Omission',
  euphemism_rate: 'Euphemisms',
  contested_as_settled_rate: 'Contested as settled',
};
export function human(s: string) {
  return s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
export function format(value: number | null | undefined, metric: string) {
  if (value === null || value === undefined) return 'Not measured';
  return metric.includes('rate')
    ? (value * 100).toFixed(1) + '%'
    : value.toFixed(1);
}
export const langName: Record<string, string> = {
  en: 'English',
  'zh-Hans': 'Simplified Chinese',
  'zh-Hant': 'Traditional Chinese',
  all: 'All measured languages',
};
export async function fetchData<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok)
    throw new Error(
      `Data request failed (${res.status}). Try reloading the page.`,
    );
  return schema.parse(await res.json());
}
const Context = createContext<{
  index: PublicIndex;
  models: PublicModel[];
} | null>(null);
export function DatasetProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<{
      index: PublicIndex;
      models: PublicModel[];
    } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      const pointer = await fetchData(
        '/data/current.json',
        z.object({ version: z.string().regex(/^[\w.-]+$/) }),
        abort.signal,
      );
      const index = await fetchData(
        `/data/${pointer.version}/index.json`,
        PublicIndexSchema,
        abort.signal,
      );
      const models = await Promise.all(
        index.models.map((m) =>
          fetchData(
            `/data/${pointer.version}/models/${m.key}.json`,
            PublicModelSchema,
            abort.signal,
          ),
        ),
      );
      setValue({ index, models });
    })().catch((e) => {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : 'Unable to load results');
    });
    return () => abort.abort();
  }, []);
  if (error)
    return (
      <section className="empty">
        <h2>Results could not be loaded</h2>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Reload results</button>
      </section>
    );
  if (!value)
    return (
      <div
        className="skeleton"
        aria-label="Loading benchmark results"
        role="status"
      >
        <div />
        <div />
        <div />
        <span className="sr-only">Loading benchmark results</span>
      </div>
    );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDataset() {
  const value = useContext(Context);
  if (!value) throw new Error('Dataset context unavailable');
  return value;
}
