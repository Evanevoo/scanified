import React from 'react';
import { useImportProgress } from './ImportProgressContext';

export default function GlobalImportProgress() {
  const { importing, progress, errors, status, totalRows, processedRows } = useImportProgress();

  if (!importing) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Import in Progress</div>
        <div className="text-sm">{progress}%</div>
      </div>
      
      {/* Status message */}
      {status && (
        <div className="text-sm mb-2 text-blue-100">
          {status}
        </div>
      )}
      
      <div className="text-sm mb-2">
        You can navigate to another page. Import will continue in the background.
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-blue-500 rounded-full h-2 mb-2">
        <div
          className="bg-white h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Row count */}
      {totalRows > 0 && (
        <div className="text-xs text-blue-100 mb-1">
          {processedRows} of {totalRows} rows processed
        </div>
      )}
      
      {/* Error count */}
      {errors.length > 0 && (
        <div className="text-red-200 text-xs">
          Errors: {errors.length}
        </div>
      )}
      
      {/* Status indicator */}
      <div className="flex items-center mt-1">
        <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
        <span className="text-xs">Processing...</span>
      </div>
    </div>
  );
} 