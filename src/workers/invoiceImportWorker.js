// Invoice Import Worker
let currentBatch = [];
let allRows = [];
let batchSize = 100;
let currentIndex = 0;
let errors = [];
let skippedItems = [];
let debug = false;

function processBatch(startIndex) {
  const endIndex = Math.min(startIndex + batchSize, allRows.length);
  const batch = allRows.slice(startIndex, endIndex);
  
  if (debug) {
    console.log("Processing batch", startIndex, endIndex);
  }
  
  self.postMessage({
    type: "batch",
    batchId: startIndex,
    rows: batch,
    start: startIndex,
    total: allRows.length,
    processed: startIndex,
    status: `Processing batch ${Math.floor(startIndex / batchSize) + 1}`
  });
}

// Helper function to add delay for testing
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

self.onmessage = function(event) {
  const { type, data } = event.data;
  
  if (type === "start") {
    // Initialize worker with data
    allRows = data.rows || [];
    batchSize = data.batchSize || 100;
    currentIndex = 0;
    errors = [];
    skippedItems = [];
    debug = !!data.debug;
    
    if (!allRows || allRows.length === 0) {
      self.postMessage({
        type: "error",
        error: "No rows provided to process"
      });
      return;
    }
    
    // Start processing
    processBatch(currentIndex);
    
  } else if (type === "resume") {
    // Resume processing from a specific index
    currentIndex = data.nextIndex || 0;
    processBatch(currentIndex);
    
  } else if (type === "batchResult") {
    // Handle batch processing results
    if (data.errors && data.errors.length > 0) {
      errors = errors.concat(data.errors);
      
      // Track skipped items for debugging
      data.errors.forEach(error => {
        if (error.type === "line_item" && error.error === "Not a cylinder" && error.row) {
          skippedItems.push({
            invoiceDescription: error.row.description || "",
            cylinderDescription: "",
            invoiceProductCode: error.row.product_code || "",
            cylinderProductCode: "",
            reason: "No match"
          });
        }
      });
    }
    
    // Move to next batch
    currentIndex = data.nextIndex || (currentIndex + batchSize);
    
    // Calculate progress
    const progress = Math.round((currentIndex / allRows.length) * 100);
    self.postMessage({
      type: "progress",
      progress: progress,
      total: allRows.length,
      processed: currentIndex,
      status: `Processed ${currentIndex} of ${allRows.length} rows`
    });
    
    // Check if we're done
    if (currentIndex < allRows.length) {
      // Add a small delay to simulate processing time
      setTimeout(() => {
        processBatch(currentIndex);
      }, debug ? 100 : 0); // 100ms delay for debug mode
    } else {
      // Send completion message
      self.postMessage({
        type: "done",
        result: {
          processed: allRows.length,
          errors: errors,
          skippedItems: skippedItems
        },
        status: "Import completed successfully"
      });
    }
  }
};
