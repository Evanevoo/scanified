import React, { useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * High-quality barcode display component
 * Renders barcodes optimized for scanning with proper resolution and format
 */
export default function BarcodeDisplay({ 
  value, 
  format = 'CODE128', 
  width = 2, 
  height = 100,
  displayValue = true,
  fontSize = 20,
  margin = 10,
  background = '#ffffff',
  lineColor = '#000000',
  className = '',
  style = {}
}) {
  const barcodeRef = useRef(null);
  const lastValueRef = useRef('');
  const isRenderingRef = useRef(false);

  // Memoize the processed value to prevent unnecessary re-renders
  const processedValue = useMemo(() => {
    return value ? String(value).trim() : '';
  }, [value]);

  // Memoize config to prevent object recreation
  const config = useMemo(() => ({
    format,
    width,
    height,
    displayValue,
    fontSize,
    margin,
    background,
    lineColor
  }), [format, width, height, displayValue, fontSize, margin, background, lineColor]);

  useEffect(() => {
    // Prevent concurrent renders
    if (isRenderingRef.current) {
      return;
    }

    // Skip if no value or ref not ready
    if (!barcodeRef.current) {
      return;
    }
    
    // Skip if value hasn't changed
    if (lastValueRef.current === processedValue) {
      return;
    }

    // Set rendering flag
    isRenderingRef.current = true;

    // Update ref to track current value
    lastValueRef.current = processedValue;

    // Clear if no value
    if (!processedValue) {
      barcodeRef.current.innerHTML = '';
      isRenderingRef.current = false;
      return;
    }

    // Use requestAnimationFrame to prevent blocking and ensure DOM is ready
    requestAnimationFrame(() => {
      if (!barcodeRef.current) {
        isRenderingRef.current = false;
        return;
      }

      try {
        // Clear previous barcode
        barcodeRef.current.innerHTML = '';
        
        // Create SVG element for high-quality rendering
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        barcodeRef.current.appendChild(svg);

        // Generate barcode with high-quality settings
        JsBarcode(svg, processedValue, {
          ...config,
          // Quality settings for better scanning
          valid: function(valid) {
            if (!valid) {
              console.warn('Invalid barcode value:', processedValue);
            }
          },
          // Additional quality options
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 5,
          // Ensure crisp rendering
          xmlDocument: document
        });

        // Ensure SVG scales properly and maintains quality
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('data-barcode', 'true');
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
        // Ensure high-quality rendering
        svg.style.imageRendering = 'crisp-edges';
        svg.style.shapeRendering = 'crispEdges';
      } catch (error) {
        console.error('Error generating barcode:', error);
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `<div style="color: red; padding: 10px;">Error: ${error.message}</div>`;
        }
      } finally {
        // Reset rendering flag
        isRenderingRef.current = false;
      }
    });
  }, [processedValue, config]);

  if (!value) {
    return (
      <div style={{ padding: '20px', color: '#999', textAlign: 'center' }}>
        No barcode value provided
      </div>
    );
  }

  return (
    <div 
      ref={barcodeRef} 
      className={`barcode-container ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: background,
        padding: '10px',
        ...style
      }}
    />
  );
}
