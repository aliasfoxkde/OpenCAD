import { useRef, useCallback, useEffect } from 'react';
import type { WorkerRequest, WorkerResponse } from '../types/worker';
import type { MeshData } from '../types/cad';

type ResponseHandler = (response: WorkerResponse) => void;

/**
 * Hook to communicate with the CAD kernel Web Worker.
 * Manages the worker lifecycle and provides typed message passing.
 */
export function useCADWorker() {
  const workerRef = useRef<Worker | null>(null);
  const handlersRef = useRef<Map<string, ResponseHandler>>(new Map());

  useEffect(() => {
    const worker = new Worker(
      new URL('../../cad/kernel/cad-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if ('id' in response && response.id) {
        const handler = handlersRef.current.get(response.id);
        if (handler) {
          handler(response);
          handlersRef.current.delete(response.id);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('[CAD Worker] Error:', error);
    };

    workerRef.current = worker;

    // Initialize the worker
    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const sendRequest = useCallback(
    (request: WorkerRequest, handler?: ResponseHandler): void => {
      if (!workerRef.current) {
        console.warn('[CAD Worker] Worker not ready');
        return;
      }

      if (handler && 'id' in request && request.id) {
        handlersRef.current.set(request.id, handler);
      }

      workerRef.current.postMessage(request);
    },
    [],
  );

  const createPrimitive = useCallback(
    (
      id: string,
      primitive: string,
      params: Record<string, number>,
    ): void => {
      sendRequest({ type: 'create_primitive', id, primitive: primitive as 'box', params });
    },
    [sendRequest],
  );

  const tessellate = useCallback(
    (id: string): Promise<MeshData> => {
      return new Promise((resolve, reject) => {
        sendRequest({ type: 'tessellate', id }, (response) => {
          if (response.type === 'tessellation_result') {
            resolve(response.mesh);
          } else if (response.type === 'tessellation_error') {
            reject(new Error(response.message));
          }
        });
      });
    },
    [sendRequest],
  );

  const deleteShape = useCallback(
    (id: string): void => {
      sendRequest({ type: 'delete_shape', id });
    },
    [sendRequest],
  );

  return {
    sendRequest,
    createPrimitive,
    tessellate,
    deleteShape,
    isReady: workerRef.current !== null,
  };
}
