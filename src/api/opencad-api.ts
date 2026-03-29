/**
 * OpenCAD client API — unified facade exposed as window.OpenCAD.
 */

import * as documentApi from './document-api';
import * as featureApi from './feature-api';
import * as measureApi from './measure-api';
import * as exportApi from './export-api';
import type { ExportOptions, ExportResult } from './types';

export class OpenCADAPI {
  /** Document management */
  readonly documents = {
    create: documentApi.createDocument,
    list: documentApi.listAllDocuments,
    open: documentApi.openDocument,
    save: documentApi.saveCurrentDocument,
    delete: documentApi.removeDocument,
    generateId: documentApi.generateDocumentId,
    close: documentApi.closeDatabase,
  };

  /** Feature management */
  readonly features = {
    getAll: featureApi.getFeatures,
    get: featureApi.getFeature,
    add: featureApi.addFeature,
    remove: featureApi.removeFeature,
    modify: featureApi.modifyFeature,
    list: featureApi.getFeatureSummaries,
    getDetails: featureApi.getFeatureDetails,
    listAvailable: featureApi.listAvailableFeatures,
    getDefaults: featureApi.getFeatureDefaults,
  };

  /** Measurement and analysis */
  readonly measure = {
    distance: measureApi.measureDistanceBetween,
    angle: measureApi.measureAngleBetween,
    bounds: measureApi.computeMeshBounds,
    massProperties: measureApi.computeMeshMassProperties,
    centroid: measureApi.computeMeshCentroid,
    surfaceArea: measureApi.computeMeshSurfaceArea,
    volume: measureApi.computeMeshVolume,
  };

  /** Export and import */
  readonly io = {
    export: (options: ExportOptions): ExportResult => exportApi.exportToFormat(options),
    download: exportApi.downloadExport,
    importSTL: exportApi.importSTLFile,
    importOBJ: exportApi.importOBJFile,
    serialize: exportApi.serializeToOCAD,
    deserialize: exportApi.deserializeFromOCAD,
  };

  /** API version */
  readonly version = '1.0.0';
}
