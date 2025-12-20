import path from 'node:path';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import type { Storage } from 'firebase-admin/storage';
import { Timestamp, type Firestore, type DocumentData, type Query } from 'firebase-admin/firestore';
import type {
  Conversation,
  Message,
  Artifact,
  Unpack,
  ReplyDraft,
  PlaybookEntry,
  UserProfile,
  Person,
  Entry,
} from '@mora/core';

type WithId<T> = T & { id: string };

interface ConversationBundle {
  conversation: WithId<Conversation>;
  messages: WithId<Message>[];
  artifacts: WithId<Artifact>[];
  unpacks: WithId<Unpack>[];
  replyDrafts: WithId<ReplyDraft>[];
  playbookEntries: WithId<PlaybookEntry>[];
}

interface PersonBundle {
  person: WithId<Person>;
  entries: WithId<Entry>[];
}

export interface UserExportBundle {
  uid: string;
  exportedAt: string;
  user: WithId<UserProfile> | null;
  conversations: ConversationBundle[];
  people: PersonBundle[];
}

export interface ExportResult {
  storagePath: string;
  signedUrl: string;
  format: 'zip';
  requestId: string;
}

interface Attachment {
  zipPath: string;
  buffer: Buffer;
  contentType?: string;
}

/**
 * Builds an Obsidian-friendly Markdown + JSON export and packages it into a zip.
 * Media artifacts (storagePath) are included when available.
 */
export async function generateUserExport(params: {
  uid: string;
  db: Firestore;
  storage: Storage;
}): Promise<ExportResult> {
  const { uid, db, storage } = params;
  const requestId = randomUUID();
  const exportedAt = new Date().toISOString();
  const bucket = storage.bucket();

  const bundle = await buildBundle({ uid, db, exportedAt });
  const markdown = buildMarkdown(bundle);

  const attachments = await collectAttachments(bundle, bucket);

  const zip = new JSZip();
  zip.file('export.md', markdown);
  zip.file('export.json', JSON.stringify(bundle, null, 2));
  for (const attachment of attachments) {
    zip.file(attachment.zipPath, attachment.buffer, {
      binary: true,
      createFolders: true,
    });
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const storagePath = `exports/${uid}/${exportedAt}.zip`;
  const file = bucket.file(storagePath);
  await file.save(zipBuffer, {
    contentType: 'application/zip',
    resumable: false,
    metadata: {
      metadata: { requestId },
    },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return { storagePath, signedUrl, format: 'zip', requestId };
}

async function buildBundle(params: {
  uid: string;
  db: Firestore;
  exportedAt: string;
}): Promise<UserExportBundle> {
  const { uid, db, exportedAt } = params;

  const userSnap = await db.collection('users').where('uid', '==', uid).limit(1).get();
  const userDoc = userSnap.docs[0];
  const user = userDoc ? toPlain<UserProfile>(userDoc.data(), userDoc.id) : null;

  const conversationsSnap = await db.collection('conversations').where('uid', '==', uid).get();
  const conversations = conversationsSnap.docs.map((doc) => toPlain<Conversation>(doc.data(), doc.id));

  const messagesByConversation: Record<string, WithId<Message>[]> = {};
  for (const convDoc of conversationsSnap.docs) {
    const msgs = await convDoc.ref.collection('messages').orderBy('order', 'asc').get();
    messagesByConversation[convDoc.id] = msgs.docs.map((m) => toPlain<Message>(m.data(), m.id));
  }

  const artifacts = await exportByQuery<Artifact>(db.collection('artifacts').where('uid', '==', uid));
  const unpacks = await exportByQuery<Unpack>(db.collection('unpacks').where('uid', '==', uid));
  const replyDrafts = await exportByQuery<ReplyDraft>(db.collection('replyDrafts').where('uid', '==', uid));
  const playbookEntries = await exportByQuery<PlaybookEntry>(db.collection('playbookEntries').where('uid', '==', uid));

  const peopleSnap = await db.collection('people').where('uid', '==', uid).get();
  const people = peopleSnap.docs.map((doc) => toPlain<Person>(doc.data(), doc.id));
  const entriesByPerson: Record<string, WithId<Entry>[]> = {};
  for (const personDoc of peopleSnap.docs) {
    const entriesSnap = await personDoc.ref.collection('entries').orderBy('createdAt', 'desc').get();
    entriesByPerson[personDoc.id] = entriesSnap.docs.map((entry) => toPlain<Entry>(entry.data(), entry.id));
  }

  const conversationBundles: ConversationBundle[] = conversations.map((conversation) => ({
    conversation,
    messages: messagesByConversation[conversation.id] ?? [],
    artifacts: artifacts.filter((a) => a.conversationId === conversation.id),
    unpacks: unpacks.filter((u) => u.conversationId === conversation.id),
    replyDrafts: replyDrafts.filter((d) => d.conversationId === conversation.id),
    playbookEntries: playbookEntries.filter((p) => p.uid === uid),
  }));

  const personBundles: PersonBundle[] = people.map((person) => ({
    person,
    entries: entriesByPerson[person.id] ?? [],
  }));

  return {
    uid,
    exportedAt,
    user,
    conversations: conversationBundles,
    people: personBundles,
  };
}

async function collectAttachments(bundle: UserExportBundle, bucket: ReturnType<Storage['bucket']>): Promise<Attachment[]> {
  const attachments: Attachment[] = [];

  for (const conversation of bundle.conversations) {
    for (const artifact of conversation.artifacts) {
      const storagePath = typeof artifact.storagePath === 'string' ? artifact.storagePath : null;
      if (!storagePath) continue;

      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        continue;
      }

      try {
        const [buffer] = await file.download();
        const zipPath = path.posix.join('media', path.basename(storagePath));
        attachments.push({ zipPath, buffer, contentType: artifact.mimeType as string | undefined });
      } catch (error) {
        // Skip attachments that fail to download; keep export resilient
        // eslint-disable-next-line no-console
        console.warn('Attachment download failed', { storagePath, error: (error as Error)?.message });
      }
    }
  }

  return attachments;
}

async function exportByQuery<T>(q: Query<DocumentData>): Promise<WithId<T>[]> {
  const snap = await q.get();
  return snap.docs.map((d) => toPlain<T>(d.data(), d.id));
}

function toPlain<T>(data: DocumentData, id: string): WithId<T> {
  const result: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
      continue;
    }
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
      continue;
    }
    result[key] = value;
  }
  return result as WithId<T>;
}

function buildMarkdown(bundle: UserExportBundle): string {
  const lines: string[] = [];
  const userLabel = bundle.user?.displayName || bundle.user?.email || bundle.uid;

  lines.push('# Mora Export');
  lines.push('');
  lines.push(`- Exported: ${bundle.exportedAt}`);
  lines.push(`- User: ${userLabel}`);
  if (bundle.user?.subscriptionTier) {
    lines.push(`- Subscription: ${bundle.user.subscriptionTier}`);
  }

  lines.push('');
  lines.push('## Conversations');
  if (bundle.conversations.length === 0) {
    lines.push('No conversations found.');
  }

  for (const convo of bundle.conversations) {
    const c = convo.conversation;
    lines.push('');
    lines.push(`### ${c.title ?? 'Untitled Conversation'}`);
    lines.push(`- Conversation ID: ${c.id}`);
    lines.push(`- Status: ${c.status ?? 'unknown'}`);
    if (c.createdAt) lines.push(`- Created: ${c.createdAt}`);
    if (c.updatedAt) lines.push(`- Updated: ${c.updatedAt}`);
    if (c.personId) lines.push(`- Person ID: ${c.personId}`);
    lines.push(`- Messages: ${convo.messages.length}`);
    lines.push(`- Unpacks: ${convo.unpacks.length}`);
    lines.push(`- Drafts: ${convo.replyDrafts.length}`);
    lines.push(`- Artifacts: ${convo.artifacts.length}`);

    if (convo.messages.length > 0) {
      lines.push('');
      lines.push('#### Messages');
      for (const msg of convo.messages) {
        const speaker = msg.speaker ?? 'Unknown';
        const timestamp = msg.timestamp ? `[${msg.timestamp}] ` : '';
        lines.push(`- ${timestamp}${speaker}: ${sanitizeText(msg.text)}`);
      }
    }

    if (convo.artifacts.length > 0) {
      lines.push('');
      lines.push('#### Artifacts');
      for (const art of convo.artifacts) {
        const title = art.title ?? art.type ?? 'Artifact';
        lines.push(`- ${title}`);
        if (art.transcript) {
          lines.push(`  - Transcript: ${truncate(sanitizeText(art.transcript), 240)}`);
        }
        if (art.sourceUrl) lines.push(`  - Source: ${art.sourceUrl}`);
        if (art.storagePath) lines.push(`  - Media: media/${path.basename(String(art.storagePath))}`);
      }
    }

    if (convo.unpacks.length > 0) {
      lines.push('');
      lines.push('#### Unpacks');
      for (const unpack of convo.unpacks) {
        lines.push(`- Generated: ${unpack.generatedAt ?? unpack.createdAt ?? ''}`);
        if (unpack.summary) lines.push(`  - Summary: ${sanitizeText(unpack.summary)}`);
        if (Array.isArray(unpack.keyPoints) && unpack.keyPoints.length) {
          lines.push('  - Key Points:');
          for (const point of unpack.keyPoints) {
            lines.push(`    - ${sanitizeText(point)}`);
          }
        }
      }
    }

    if (convo.replyDrafts.length > 0) {
      lines.push('');
      lines.push('#### Reply Drafts');
      for (const draft of convo.replyDrafts) {
        const status = draft.isSent ? 'sent' : draft.isEdited ? 'edited' : 'draft';
        lines.push(`- (${draft.tone ?? 'custom'}) ${status} @ ${draft.updatedAt ?? draft.createdAt ?? ''}`);
        lines.push(`  - ${sanitizeText(draft.content ?? '')}`);
      }
    }

    if (convo.playbookEntries.length > 0) {
      lines.push('');
      lines.push('#### Referenced Playbook');
      for (const entry of convo.playbookEntries) {
        lines.push(`- ${entry.title}`);
      }
    }
  }

  lines.push('');
  lines.push('## People');
  if (bundle.people.length === 0) {
    lines.push('No people found.');
  }
  for (const personBundle of bundle.people) {
    const p = personBundle.person;
    lines.push('');
    lines.push(`### ${p.displayName}`);
    lines.push(`- Person ID: ${p.id}`);
    if (p.relationshipType) lines.push(`- Relationship: ${p.relationshipType}`);
    if (p.importanceNote) lines.push(`- Importance: ${sanitizeText(p.importanceNote)}`);
    if (personBundle.entries.length > 0) {
      lines.push('');
      lines.push('#### Entries');
      for (const entry of personBundle.entries) {
        lines.push(`- (${entry.type ?? 'entry'}) ${entry.createdAt ?? ''}`);
        if (entry.whatTheySaid) lines.push(`  - They said: ${sanitizeText(entry.whatTheySaid)}`);
        if (entry.whatISaid) lines.push(`  - I said: ${sanitizeText(entry.whatISaid)}`);
        if (entry.content) lines.push(`  - Notes: ${sanitizeText(entry.content)}`);
      }
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('Generated by Mora. This export includes Markdown and JSON. Media files are stored in the media/ folder when available.');

  return lines.join('\n');
}

function sanitizeText(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text.replace(/\r?\n/g, ' ').trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
