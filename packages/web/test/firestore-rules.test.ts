import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
suite('Firestore privacy and dispute rules', () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: 'demo-ccp-bench',
      firestore: {
        rules: await readFile(
          new URL('../../../firestore.rules', import.meta.url),
          'utf8',
        ),
      },
    });
  });
  afterAll(async () => environment?.cleanup());
  beforeEach(async () => environment.clearFirestore());
  const valid = () => ({
    item_id: 'tam-001',
    field: 'reference',
    text: 'This reference needs an additional source.',
    status: 'open',
    created_at: serverTimestamp(),
    email: 'reviewer@example.com',
    honeypot: '',
  });
  it('allows anonymous valid creates but never exposes submitter data', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'disputes', 'valid'), valid()));
    await assertFails(getDoc(doc(db, 'disputes', 'valid')));
    await assertFails(
      updateDoc(doc(db, 'disputes', 'valid'), { status: 'resolved' }),
    );
  });
  it('rejects malformed, oversized, pre-resolved, held-out and honeypot submissions', async () => {
    const db = environment.unauthenticatedContext().firestore();
    for (const patch of [
      { text: 'short' },
      { text: 'x'.repeat(5001) },
      { status: 'resolved' },
      { item_id: 'h-tam-001' },
      { honeypot: 'spam' },
      { unexpected: 'field' },
      { source_url: 'javascript:alert(1)' },
      { email: 'x'.repeat(255) },
    ])
      await assertFails(
        setDoc(doc(db, 'disputes', 'invalid'), { ...valid(), ...patch }),
      );
  });
  it('allows only published run reads and blocks client admin enrollment', async () => {
    await environment.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'runs', 'public'), { published: true });
      await setDoc(doc(c.firestore(), 'runs', 'private'), { published: false });
    });
    const db = environment.authenticatedContext('reader').firestore();
    await assertSucceeds(getDoc(doc(db, 'runs', 'public')));
    await assertFails(getDoc(doc(db, 'runs', 'private')));
    await assertFails(setDoc(doc(db, 'admins', 'reader'), { active: true }));
    await assertFails(setDoc(doc(db, 'runs', 'new'), { published: true }));
  });
  it('lets a seeded maintainer resolve disputes without rewriting the submitted complaint', async () => {
    await environment.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'admins', 'maintainer'), {
        active: true,
      });
      await setDoc(doc(c.firestore(), 'disputes', 'case'), {
        ...valid(),
        created_at: new Date(),
      });
    });
    const db = environment.authenticatedContext('maintainer').firestore();
    await assertSucceeds(getDoc(doc(db, 'disputes', 'case')));
    await assertSucceeds(
      updateDoc(doc(db, 'disputes', 'case'), {
        status: 'resolved',
        resolution_pr: 'https://github.com/example/repo/pull/1',
        resolved_at: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(db, 'disputes', 'case'), { text: 'Rewritten complaint' }),
    );
  });
});
