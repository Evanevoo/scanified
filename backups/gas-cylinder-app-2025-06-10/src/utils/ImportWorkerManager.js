let worker = null;
let listeners = [];

export function getImportWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/invoiceImportWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      listeners.forEach(fn => fn(event));
    };
  }
  return worker;
}

export function addImportWorkerListener(fn) {
  listeners.push(fn);
}

export function removeImportWorkerListener(fn) {
  listeners = listeners.filter(l => l !== fn);
} 