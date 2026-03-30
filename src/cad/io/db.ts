/**
 * IndexedDB persistence layer for OpenCAD documents.
 *
 * Features:
 * - Save/load documents with versioning
 * - Auto-save with configurable interval
 * - Crash recovery from auto-saved snapshots
 * - Document list with metadata
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { FeatureNode } from '../../types/cad';

const DB_NAME = 'opencad';
const DB_VERSION = 1;
const DOCS_STORE = 'documents';
const SNAPSHOTS_STORE = 'snapshots';

export interface StoredDocument {
  id: string;
  name: string;
  units: 'mm' | 'cm' | 'm' | 'in';
  features: FeatureNode[];
  created: number;
  modified: number;
  autoSave: boolean;
  thumbnail?: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
  created: number;
  modified: number;
  featureCount: number;
  thumbnail?: string;
}

export interface SnapshotEntry {
  documentId: string;
  timestamp: number;
  data: string; // JSON serialized document
}

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('documentId', 'documentId', { unique: false });
      }
    },
  });

  return dbInstance;
}

/** Save a document to IndexedDB */
export async function saveDocument(doc: StoredDocument): Promise<void> {
  const db = await getDB();
  await db.put(DOCS_STORE, { ...doc, modified: Date.now() });
}

/** Load a document by ID */
export async function loadDocument(id: string): Promise<StoredDocument | null> {
  const db = await getDB();
  const doc = await db.get(DOCS_STORE, id);
  return (doc as StoredDocument) ?? null;
}

/** Delete a document by ID */
export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(DOCS_STORE, id);
  // Also delete associated snapshots
  const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
  const index = tx.store.index('documentId');
  let cursor = await index.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/** List all documents with metadata */
export async function listDocuments(): Promise<DocumentMeta[]> {
  const db = await getDB();
  const docs = (await db.getAll(DOCS_STORE)) as StoredDocument[];
  return docs
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      created: doc.created,
      modified: doc.modified,
      featureCount: doc.features.length,
      thumbnail: doc.thumbnail,
    }))
    .sort((a, b) => b.modified - a.modified);
}

/** Save a snapshot for crash recovery */
export async function saveSnapshot(documentId: string, data: string): Promise<void> {
  const db = await getDB();
  await db.add(SNAPSHOTS_STORE, {
    documentId,
    timestamp: Date.now(),
    data,
  });
}

/** Get the latest snapshot for a document (for crash recovery) */
export async function getLatestSnapshot(documentId: string): Promise<SnapshotEntry | null> {
  const db = await getDB();
  const tx = db.transaction(SNAPSHOTS_STORE, 'readonly');
  const index = tx.store.index('documentId');
  const entries: SnapshotEntry[] = [];

  let cursor = await index.openCursor(documentId, 'prev');
  if (cursor) {
    entries.push(cursor.value as SnapshotEntry);
  }
  await tx.done;

  return entries[0] ?? null;
}

/** Clean up old snapshots, keeping only the latest N */
export async function pruneSnapshots(documentId: string, keepCount = 3): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
  const index = tx.store.index('documentId');

  const entries: { id: number; timestamp: number }[] = [];
  let cursor = await index.openCursor(documentId);
  while (cursor) {
    entries.push({ id: (cursor.value as { id: number }).id, timestamp: (cursor.value as SnapshotEntry).timestamp });
    cursor = await cursor.continue();
  }

  // Sort by timestamp descending, keep newest
  entries.sort((a, b) => b.timestamp - a.timestamp);
  const toDelete = entries.slice(keepCount);

  for (const entry of toDelete) {
    await tx.store.delete(entry.id);
  }
  await tx.done;

  return toDelete.length;
}

/** Auto-save manager */
export class AutoSaveManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private documentId: string | null = null;
  private getData: (() => StoredDocument) | null = null;

  start(documentId: string, getData: () => StoredDocument, intervalMs = 30000): void {
    this.stop();
    this.documentId = documentId;
    this.getData = getData;

    this.intervalId = setInterval(async () => {
      if (!this.documentId || !this.getData) return;

      try {
        const doc = this.getData();
        await saveDocument(doc);
        await saveSnapshot(doc.id, JSON.stringify(doc));
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.documentId = null;
    this.getData = null;
  }

  isActive(): boolean {
    return this.intervalId !== null;
  }
}

/** Create a new document ID */
export function createDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a new blank document */
export function createNewDocument(name = 'Untitled', units: 'mm' | 'cm' | 'm' | 'in' = 'mm'): StoredDocument {
  const now = Date.now();
  return {
    id: createDocumentId(),
    name,
    units,
    features: [],
    created: now,
    modified: now,
    autoSave: true,
  };
}

/** Close the database connection */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/** Delete the entire database (for testing) */
export async function deleteDatabase(): Promise<void> {
  await closeDB();
  indexedDB.deleteDatabase(DB_NAME);
}
