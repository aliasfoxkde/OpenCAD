/**
 * Bidirectional sync bridge between CRDT document and CAD store.
 *
 * When a collaboration session is active:
 *   - Local cad-store mutations (add/remove/update feature) push to CRDT
 *   - Remote CRDT changes apply to cad-store via loadFeatures
 *
 * Echo-loop prevention: a JSON fingerprint of the last synced state is
 * compared on every notification.  If the incoming state matches the
 * fingerprint the notification is skipped because it was caused by our
 * own push in the opposite direction.
 */

import * as Y from 'yjs';
import { useCADStore } from '../../stores/cad-store';
import { addFeature, removeFeature, updateFeature, observeFeatures } from './crdt-store';
import type { CRDTDocument } from './crdt-store';
import type { FeatureNode } from '../../types/cad';

let unsubCRDT: (() => void) | null = null;
let unsubCAD: (() => void) | null = null;
let lastSyncedJSON = '';

// ============================================================
// Public API
// ============================================================

/** Start bidirectional sync between a CRDT document and the CAD store. */
export function startCollabSync(crdtDoc: CRDTDocument): void {
  stopCollabSync();

  // Seed the fingerprint with whatever is currently in the cad-store
  // so that the initial CRDT observer (if it fires synchronously) is
  // correctly deduped when the two sides already agree.
  lastSyncedJSON = JSON.stringify(useCADStore.getState().features);

  // Local cad-store change → push diff to CRDT
  // Note: Zustand 5's subscribe(selector, listener) overload does not fire.
  // Use the basic subscribe(state, prevState) overload instead.
  unsubCAD = useCADStore.subscribe((state, prevState) => {
    const nextFeatures = state.features;
    const prevFeatures = prevState.features;
    const nextJSON = JSON.stringify(nextFeatures);
    if (nextJSON === lastSyncedJSON) return;
    lastSyncedJSON = nextJSON;
    pushLocalChangesToCRDT(crdtDoc, prevFeatures, nextFeatures);
  });

  // Remote CRDT change → replace cad-store features
  unsubCRDT = observeFeatures(crdtDoc, (remoteFeatures) => {
    const remoteJSON = JSON.stringify(remoteFeatures);
    if (remoteJSON === lastSyncedJSON) return;
    lastSyncedJSON = remoteJSON;
    useCADStore.getState().loadFeatures(remoteFeatures);
  });
}

/** Stop sync and release all subscriptions. */
export function stopCollabSync(): void {
  if (unsubCRDT) {
    unsubCRDT();
    unsubCRDT = null;
  }
  if (unsubCAD) {
    unsubCAD();
    unsubCAD = null;
  }
  lastSyncedJSON = '';
}

// ============================================================
// Internal helpers
// ============================================================

function pushLocalChangesToCRDT(crdtDoc: CRDTDocument, prevFeatures: FeatureNode[], nextFeatures: FeatureNode[]): void {
  const prevIds = new Set(prevFeatures.map((f) => f.id));
  const nextIds = new Set(nextFeatures.map((f) => f.id));

  // Removed features
  for (const f of prevFeatures) {
    if (!nextIds.has(f.id)) {
      removeFeature(crdtDoc, f.id);
    }
  }

  // Added features
  for (const f of nextFeatures) {
    if (!prevIds.has(f.id)) {
      addFeature(crdtDoc, f);
    }
  }

  // Updated features
  for (const f of nextFeatures) {
    if (prevIds.has(f.id)) {
      const prev = prevFeatures.find((p) => p.id === f.id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(f)) {
        updateFeature(crdtDoc, f.id, f);
      }
    }
  }
}

// ============================================================
// Test helpers (exported for testing only)
// ============================================================

/** Create a minimal CRDT document without IndexedDB (for tests). */
export function createTestCRDTDoc(): CRDTDocument {
  const doc = new Y.Doc();
  return {
    doc,
    provider: null,
    features: doc.getArray<Y.Map<unknown>>('features'),
    sketches: doc.getArray<Y.Map<unknown>>('sketches'),
    metadata: doc.getMap<unknown>('metadata'),
  };
}

/** Get the current fingerprint (for test assertions). */
export function getLastSyncedJSON(): string {
  return lastSyncedJSON;
}

/** Reset bridge state (for test cleanup). */
export function resetBridgeState(): void {
  stopCollabSync();
}
