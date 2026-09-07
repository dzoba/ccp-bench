import { useEffect, useState, type FormEvent } from 'react';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { z } from 'zod';
import { db, auth } from './firebase';
import { Head, PageIntro } from './layout';
const fields = ['prompt', 'flag', 'fact', 'reference', 'translation'];
export default function Dispute({ itemId }: { itemId: string }) {
  const [field, setField] = useState('reference'),
    [text, setText] = useState(''),
    [source, setSource] = useState(''),
    [email, setEmail] = useState(''),
    [honey, setHoney] = useState(''),
    [state, setState] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (honey) return;
    const since = Number(sessionStorage.getItem('dispute-last') ?? 0);
    if (Date.now() - since < 60000) {
      setState('Please wait one minute between submissions.');
      return;
    }
    if (text.trim().length < 10) {
      setState('Please describe the issue in at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, 'disputes'), {
        item_id: itemId,
        field,
        text: text.trim(),
        source_url: source.trim(),
        email: email.trim(),
        honeypot: '',
        status: 'open',
        created_at: serverTimestamp(),
      });
      sessionStorage.setItem('dispute-last', String(Date.now()));
      setText('');
      setState(
        'Your dispute was submitted. Thank you for making the evidence clearer.',
      );
    } catch {
      setState(
        'The dispute could not be submitted. Try again, or contact chris@dzoba.com with the item ID.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="dispute-form" onSubmit={submit}>
      <label>
        Field
        <select value={field} onChange={(e) => setField(e.target.value)}>
          {fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label>
        What needs correction?
        <textarea
          required
          minLength={10}
          maxLength={5000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label>
        Source URL (optional)
        <input
          type="url"
          maxLength={2048}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </label>
      <label>
        Email (optional, visible only to maintainers)
        <input
          type="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Leave empty
        <input
          tabIndex={-1}
          autoComplete="off"
          value={honey}
          onChange={(e) => setHoney(e.target.value)}
        />
      </label>
      <button disabled={busy}>{busy ? 'Submitting…' : 'Submit dispute'}</button>
      <p role="status">{state}</p>
    </form>
  );
}
const DisputeSchema = z.object({
  item_id: z.string(),
  field: z.string(),
  text: z.string(),
  source_url: z.string().optional(),
  email: z.string().optional(),
  status: z.string(),
});
export function AdminDisputes() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [isAdmin, setIsAdmin] = useState(false),
    [rows, setRows] = useState<
      (z.infer<typeof DisputeSchema> & { id: string })[]
    >([]),
    [error, setError] = useState('');
  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u);
        setReady(true);
        setIsAdmin(false);
        if (u) {
          try {
            const admin = await getDoc(doc(db, 'admins', u.uid));
            setIsAdmin(admin.exists());
            if (admin.exists()) {
              const snapshot = await getDocs(
                query(
                  collection(db, 'disputes'),
                  where('status', '==', 'open'),
                  orderBy('created_at', 'desc'),
                ),
              );
              setRows(
                snapshot.docs.map((d) => ({
                  ...DisputeSchema.parse(d.data()),
                  id: d.id,
                })),
              );
            }
          } catch {
            setError('Unable to load maintainer permissions or disputes.');
          }
        }
      }),
    [],
  );
  async function resolve(id: string, status: string, pr: string) {
    try {
      await updateDoc(doc(db, 'disputes', id), {
        status,
        resolution_pr: pr,
        resolved_at: serverTimestamp(),
      });
      setRows(rows.filter((r) => r.id !== id));
    } catch {
      setError('Resolution could not be saved.');
    }
  }
  return (
    <>
      <Head
        title="Dispute administration"
        description="GitHub sign-in for benchmark maintainers to review and resolve item disputes."
      />
      <PageIntro title="Review reported issues.">
        <p>
          Maintainer access is checked by Firestore rules. Submitter contact
          details are never publicly readable.
        </p>
      </PageIntro>
      {!ready ? (
        <div className="skeleton">
          <div />
        </div>
      ) : !user ? (
        <button
          onClick={() =>
            signInWithPopup(auth, new GithubAuthProvider()).catch(() =>
              setError(
                'GitHub sign-in is not available yet or was cancelled. Contact the maintainer.',
              ),
            )
          }
        >
          Sign in with GitHub
        </button>
      ) : (
        <>
          <button onClick={() => signOut(auth)}>Sign out</button>
          {!isAdmin ? (
            <div className="notice">
              This signed-in account is not a maintainer.
            </div>
          ) : !rows.length ? (
            <div className="empty">No open disputes.</div>
          ) : (
            rows.map((r) => (
              <DisputeRow key={r.id} row={r} onResolve={resolve} />
            ))
          )}
        </>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </>
  );
}
function DisputeRow({
  row,
  onResolve,
}: {
  row: z.infer<typeof DisputeSchema> & { id: string };
  onResolve: (id: string, status: string, pr: string) => Promise<void>;
}) {
  const [pr, setPr] = useState('');
  return (
    <article className="admin-dispute">
      <h2>
        {row.item_id}: {row.field}
      </h2>
      <p>{row.text}</p>
      <p>{row.email}</p>
      {row.source_url && <a href={row.source_url}>Supplied source</a>}
      <label>
        Resolution PR
        <input type="url" value={pr} onChange={(e) => setPr(e.target.value)} />
      </label>
      <button onClick={() => onResolve(row.id, 'resolved', pr)}>Resolve</button>
      <button onClick={() => onResolve(row.id, 'dismissed', pr)}>
        Dismiss
      </button>
    </article>
  );
}
