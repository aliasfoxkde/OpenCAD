/**
 * CRDT-backed persistence using Yjs + y-indexeddb.
 *
 * Provides local-first, conflict-free state synchronization.
 * The Yjs document wraps feature tree and sketch data so that
 * multiple tabs or peers can edit simultaneously without conflicts.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { FeatureNode, FeatureType } from '../../types/cad';

const DB_PREFIX = 'opencad-yjs';

export interface CRDTDocument {
  doc: Y.Doc;
  provider: IndexeddbPersistence | null;
  features: Y.Array<Y.Map<unknown>>;
  sketches: Y.Array<Y.Map<unknown>>;
  metadata: Y.Map<unknown>;
}

let activeDoc: CRDTDocument | null = null;

/** Create a new Yjs document backed by IndexedDB */
export function createCRDTDocument(documentId: string): CRDTDocument {
  const doc = new Y.Doc();

  const features = doc.getArray<Y.Map<unknown>>('features');
  const sketches = doc.getArray<Y.Map<unknown>>('sketches');
  const metadata = doc.getMap<unknown>('metadata');

  // Set metadata
  metadata.set('id', documentId);
  metadata.set('created', Date.now());
  metadata.set('modified', Date.now());

  // Persist to IndexedDB
  const provider = new IndexeddbPersistence(`${DB_PREFIX}-${documentId}`, doc);

  const crdtDoc: CRDTDocument = { doc, provider, features, sketches, metadata };
  activeDoc = crdtDoc;

  return crdtDoc;
}

/** Load an existing Yjs document from IndexedDB */
export async function loadCRDTDocument(documentId: string): Promise<CRDTDocument> {
  const crdtDoc = createCRDTDocument(documentId);

  // Wait for IndexedDB to sync
  if (crdtDoc.provider) {
    await crdtDoc.provider.whenSynced;
  }

  return crdtDoc;
}

/** Close and clean up the active CRDT document */
export function closeCRDTDocument(): void {
  if (activeDoc) {
    if (activeDoc.provider) {
      activeDoc.provider.destroy();
    }
    activeDoc.doc.destroy();
    activeDoc = null;
  }
}

/** Get the active CRDT document */
export function getActiveCRDTDocument(): CRDTDocument | null {
  return activeDoc;
}

// ============================================================
// Feature tree operations
// ============================================================

/** Add a feature to the CRDT feature tree */
export function addFeature(crdtDoc: CRDTDocument, feature: FeatureNode): void {
  const featureMap = new Y.Map();
  featureMap.set('id', feature.id);
  featureMap.set('type', feature.type);
  featureMap.set('name', feature.name);
  featureMap.set('parameters', JSON.stringify(feature.parameters));
  featureMap.set('dependencies', JSON.stringify(feature.dependencies));
  featureMap.set('children', JSON.stringify(feature.children));
  featureMap.set('suppressed', feature.suppressed);

  crdtDoc.doc.transact(() => {
    crdtDoc.features.push([featureMap]);
    crdtDoc.metadata.set('modified', Date.now());
  });
}

/** Remove a feature from the CRDT feature tree */
export function removeFeature(crdtDoc: CRDTDocument, featureId: string): void {
  crdtDoc.doc.transact(() => {
    for (let i = 0; i < crdtDoc.features.length; i++) {
      const f = crdtDoc.features.get(i);
      if (f && f.get('id') === featureId) {
        crdtDoc.features.delete(i);
        crdtDoc.metadata.set('modified', Date.now());
        break;
      }
    }
  });
}

/** Update a feature in the CRDT feature tree */
export function updateFeature(crdtDoc: CRDTDocument, featureId: string, updates: Partial<FeatureNode>): void {
  crdtDoc.doc.transact(() => {
    for (let i = 0; i < crdtDoc.features.length; i++) {
      const f = crdtDoc.features.get(i);
      if (f && f.get('id') === featureId) {
        if (updates.name !== undefined) f.set('name', updates.name);
        if (updates.parameters !== undefined) f.set('parameters', JSON.stringify(updates.parameters));
        if (updates.suppressed !== undefined) f.set('suppressed', updates.suppressed);
        if (updates.type !== undefined) f.set('type', updates.type);
        crdtDoc.metadata.set('modified', Date.now());
        break;
      }
    }
  });
}

/** Get all features from the CRDT as plain objects */
export function getFeatures(crdtDoc: CRDTDocument): FeatureNode[] {
  const features: FeatureNode[] = [];
  for (let i = 0; i < crdtDoc.features.length; i++) {
    const f = crdtDoc.features.get(i);
    if (f) {
      features.push(yMapToFeatureNode(f));
    }
  }
  return features;
}

/** Convert a Y.Map to a FeatureNode */
function yMapToFeatureNode(map: Y.Map<unknown>): FeatureNode {
  return {
    id: map.get('id') as string,
    type: map.get('type') as FeatureType,
    name: map.get('name') as string,
    parameters: JSON.parse((map.get('parameters') as string) || '{}'),
    dependencies: JSON.parse((map.get('dependencies') as string) || '[]'),
    children: JSON.parse((map.get('children') as string) || '[]'),
    suppressed: (map.get('suppressed') as boolean) || false,
  };
}

/** Observe changes to the feature tree */
export function observeFeatures(crdtDoc: CRDTDocument, callback: (features: FeatureNode[]) => void): () => void {
  const handler = () => {
    callback(getFeatures(crdtDoc));
  };

  crdtDoc.features.observe(handler);
  return () => crdtDoc.features.unobserve(handler);
}

/** Get document metadata */
export function getMetadata(crdtDoc: CRDTDocument): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const [key, value] of crdtDoc.metadata.entries()) {
    meta[key] = value;
  }
  return meta;
}

/** Export the document as a JSON snapshot */
export function exportSnapshot(crdtDoc: CRDTDocument): string {
  return JSON.stringify(
    {
      metadata: getMetadata(crdtDoc),
      features: getFeatures(crdtDoc),
      version: 1,
    },
    null,
    2,
  );
}

/** Import a JSON snapshot into the document */
export function importSnapshot(crdtDoc: CRDTDocument, json: string): void {
  const data = JSON.parse(json);
  if (data.version !== 1) throw new Error('Unsupported snapshot version');

  crdtDoc.doc.transact(() => {
    // Clear existing features
    crdtDoc.features.delete(0, crdtDoc.features.length);

    // Import features
    for (const feature of data.features ?? []) {
      addFeature(crdtDoc, feature);
    }

    // Update metadata
    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata)) {
        crdtDoc.metadata.set(key, value);
      }
    }
    crdtDoc.metadata.set('modified', Date.now());
  });
}
