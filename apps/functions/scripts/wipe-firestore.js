#!/usr/bin/env node
/**
 * Firestore wipe utility (dangerous!)
 *
 * Deletes ALL collections for the target project, including sub-collections.
 * Use only for approved schema-breaking changes (e.g., SPEC-003 E2EE cutover).
 *
 * Usage:
 *   FIREBASE_PROJECT_ID=<project> CONFIRM_WIPE=1 node scripts/wipe-firestore.js
 *   # Optional: pass --dry-run to list collections without deleting
 *
 * Auth:
 *   Relies on Application Default Credentials (ADC). Set GOOGLE_APPLICATION_CREDENTIALS
 *   to a service account key file or run `gcloud auth application-default login`.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  getArgValue('--project');

if (!projectId) {
  console.error('Missing project ID. Set FIREBASE_PROJECT_ID or pass --project <id>.');
  process.exit(1);
}

const confirmed = process.env.CONFIRM_WIPE === '1' || process.env.CONFIRM_WIPE === 'true';
if (!confirmed) {
  console.error('Set CONFIRM_WIPE=1 to allow destructive deletion.');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();

async function deleteDocumentRecursive(docRef, writer, stats) {
  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    await deleteCollectionRecursive(sub, writer, stats);
  }
  writer.delete(docRef);
  stats.docs += 1;
}

async function deleteCollectionRecursive(colRef, writer, stats) {
  let batches = 0;
  while (true) {
    const snapshot = await colRef.limit(500).get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) {
      await deleteDocumentRecursive(doc.ref, writer, stats);
    }
    // Flush periodically to avoid memory growth
    await writer.flush();
    batches += 1;
    console.log(`[wipe-firestore] Processed batch ${batches} in ${colRef.path} (total docs so far: ${stats.docs})`);
  }
}

async function wipe() {
  console.log(`[wipe-firestore] Target project: ${projectId}`);
  if (dryRun) {
    console.log('[wipe-firestore] DRY RUN - no documents will be deleted');
  }

  const collections = await db.listCollections();
  if (collections.length === 0) {
    console.log('[wipe-firestore] No collections found.');
    return;
  }

  for (const col of collections) {
    const path = col.path;
    if (dryRun) {
      console.log(`[wipe-firestore] (dry-run) Would delete collection: ${path}`);
      continue;
    }

    console.log(`[wipe-firestore] Deleting collection: ${path}`);
    const writer = db.bulkWriter();
    writer.onWriteError((error) => {
      console.error('[wipe-firestore] Write error:', error);
      return false; // stop on first error
    });
    const stats = { docs: 0 };
    await deleteCollectionRecursive(col, writer, stats);
    await writer.close();
    console.log(`[wipe-firestore] Deleted collection: ${path} (docs deleted: ${stats.docs})`);
  }

  console.log('[wipe-firestore] Done.');
}

wipe().catch((error) => {
  console.error('[wipe-firestore] Failed:', error);
  process.exit(1);
});
