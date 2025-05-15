// Advanced Web Worker for background invoice import
let currentIndex = 0;
let rows = [];
let mapping = {};
let columns = [];
let allFields = [];
let batchSize = 100;
let errors = [];
let debug = false;
let skippedItems = [];

function processBatch(start) {
  const end = Math.min(start + batchSize, rows.length);
  const batch = rows.slice(start, end);
  // If debug, log batch info
  if (debug) {
    console.log('Processing batch', start, end);
  }
  self.postMessage({ type: 'batch', batchId: start, rows: batch, start });
}

self.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === 'start') {
    rows = data.rows;
    mapping = data.mapping;
    columns = data.columns;
    allFields = data.allFields;
    batchSize = data.batchSize || 100;
    errors = [];
    currentIndex = 0;
    debug = !!data.debug;
    skippedItems = [];
    processBatch(currentIndex);
  } else if (type === 'resume') {
    // Resume from a given index
    currentIndex = data.nextIndex;
    processBatch(currentIndex);
  } else if (type === 'batchResult') {
    // Main thread sends back result for a batch
    if (data.errors && data.errors.length) {
      errors = errors.concat(data.errors);
      // Track skipped items if present in errors
      data.errors.forEach(err => {
        if (err.type === 'line_item' && err.error === 'Not a cylinder' && err.row) {
          skippedItems.push({
            invoiceDescription: err.row.description,
            cylinderDescription: '',
            invoiceProductCode: err.row.product_code,
            cylinderProductCode: '',
            reason: 'No match'
          });
        }
      });
    }
    currentIndex = data.nextIndex;
    // Post progress update after each batch
    const progress = Math.round((currentIndex / rows.length) * 100);
    self.postMessage({ type: 'progress', progress });
    if (currentIndex < rows.length) {
      processBatch(currentIndex);
    } else {
      self.postMessage({ type: 'done', result: { processed: rows.length, errors, skippedItems } });
    }
  }
}; 