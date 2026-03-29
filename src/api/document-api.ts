/**
 * Document management API — wraps IndexedDB layer.
 */

import {
  saveDocument,
  loadDocument,
  deleteDocument,
  listDocuments,
  createDocumentId,
  createNewDocument,
  closeDB,
} from '@/cad/io/db';
import type { StoredDocument, DocumentMeta } from '@/cad/io/db';
import type { APIResponse, CreateDocumentOptions, DocumentInfo } from './types';

/** Create a new document */
export async function createDocument(
  options: CreateDocumentOptions = {},
): Promise<APIResponse<StoredDocument>> {
  try {
    const doc = createNewDocument(options.name, options.units);
    await saveDocument(doc);
    return { success: true, data: doc };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** List all saved documents */
export async function listAllDocuments(): Promise<APIResponse<DocumentInfo[]>> {
  try {
    const docs = await listDocuments();
    const info: DocumentInfo[] = docs.map((d: DocumentMeta) => ({
      id: d.id,
      name: d.name,
      created: d.created,
      modified: d.modified,
      featureCount: d.featureCount,
      units: 'mm',
    }));
    return { success: true, data: info };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Open a document by ID */
export async function openDocument(id: string): Promise<APIResponse<StoredDocument>> {
  try {
    const doc = await loadDocument(id);
    if (!doc) {
      return { success: false, error: `Document "${id}" not found` };
    }
    return { success: true, data: doc };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Save current document state */
export async function saveCurrentDocument(
  doc: StoredDocument,
): Promise<APIResponse<void>> {
  try {
    await saveDocument(doc);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Delete a document */
export async function removeDocument(id: string): Promise<APIResponse<void>> {
  try {
    await deleteDocument(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Generate a unique document ID without creating a document */
export function generateDocumentId(): string {
  return createDocumentId();
}

/** Close the IndexedDB connection */
export async function closeDatabase(): Promise<void> {
  return closeDB();
}
