# Enhanced Enterprise Scanner System

A Scandit/Scanbot-level barcode scanner implementation for React Native, combining platform-specific optimizations with advanced image processing, batch scanning, and performance optimization.

## Architecture Overview

The Enhanced Enterprise Scanner System is built in layers:

1. **Unified Scanner API** - Platform-agnostic interface
2. **Image Processing Layer** - Multi-frame analysis, enhancement, low-light optimization, damage recovery
3. **Batch Scanning System** - Batch orchestration, concurrent scanning, queue management
4. **Performance Layer** - Frame optimization, caching, worker pools, monitoring
5. **UI Components** - Batch controls, concurrent overlays, settings screen

## Quick Start

### Basic Single Scan

```typescript
import { UnifiedScanner } from '../shared/scanners/UnifiedScanner';
import EnhancedExpoCameraScanner from '../shared/components/EnhancedExpoCameraScanner'; // iOS
import EnhancedVisionCameraScanner from '../shared/components/EnhancedVisionCameraScanner'; // Android

// Create scanner instance
const scanner = new UnifiedScanner({
  mode: 'single',
  formats: ['code39', 'code128', 'qr'],
});

// In your component
<EnhancedExpoCameraScanner
  onBarcodeScanned={(barcode, result) => {
    console.log('Scanned:', barcode, result);
  }}
  scanner={scanner}
  enabled={true}
/>
```

### Batch Scanning

```typescript
import { BatchScanner } from '../shared/scanners/BatchScanner';
import { UnifiedScanner } from '../shared/scanners/UnifiedScanner';
import BatchScanControls from '../shared/components/BatchScanControls';

// Create scanner with batch mode
const scanner = new UnifiedScanner({ mode: 'batch' });
const batchScanner = new BatchScanner();

// Start batch session
const session = batchScanner.startBatch({
  duplicateCooldown: 500,
  autoCompleteThreshold: 50,
});

// Handle scan
const result = batchScanner.processScan(scanResult);
if (result.accepted) {
  console.log('Scan added to batch:', result.sessionStats);
}

// Complete batch
const summary = batchScanner.completeBatch();
console.log('Batch complete:', summary);

// Use BatchScanControls component
<BatchScanControls
  scannedCount={batchSession.scans.length}
  scanRate={2.5}
  onComplete={() => completeBatch()}
  onClear={() => clearBatch()}
  onUndo={() => undoLastScan()}
/>
```

### Concurrent Multi-Barcode Scanning

```typescript
import { ConcurrentScanner } from '../shared/scanners/ConcurrentScanner';
import ConcurrentScanOverlay from '../shared/components/ConcurrentScanOverlay';

const concurrentScanner = new ConcurrentScanner({
  maxBarcodesPerFrame: 10,
  priorityStrategy: 'center',
});

// Detect multiple barcodes
const detected = concurrentScanner.detectMultiple(scanResults, frame);

// Get highlights for UI
const highlights = concurrentScanner.highlightBarcodes();

// Use ConcurrentScanOverlay component
<ConcurrentScanOverlay
  detectedBarcodes={detected}
  showCaptureAll={true}
  onCaptureAll={() => captureAllBarcodes()}
  onBarcodeSelected={(barcode) => handleScan(barcode)}
/>
```

### Image Processing

```typescript
import { MultiFrameProcessor } from '../shared/scanners/ImageProcessor';
import { ImageEnhancer } from '../shared/scanners/ImageEnhancer';
import { LowLightOptimizer } from '../shared/scanners/LowLightOptimizer';
import { DamageRecovery } from '../shared/scanners/DamageRecovery';

// Multi-frame analysis
const processor = new MultiFrameProcessor({ bufferSize: 5 });
processor.addFrame(frame);
const aggregated = processor.aggregateResults(scanResults);

// Image enhancement
const enhanced = ImageEnhancer.enhance(image, {
  autoContrast: true,
  brightness: 40,
  sharpen: true,
  denoise: true,
});

// Low-light optimization
const lowLight = new LowLightOptimizer();
const lightLevel = lowLight.detectLightLevel(image);
const conditions = lowLight.analyzeLightConditions(lightLevel);
console.log('Light conditions:', conditions.recommendation);

// Damage recovery
const damageRecovery = new DamageRecovery();
const recovery = damageRecovery.attemptRecovery(partialBarcode, 'ean13');
if (recovery.success) {
  console.log('Recovered:', recovery.reconstructed);
}
```

### Performance Optimization

```typescript
import { FrameOptimizer } from '../shared/scanners/FrameOptimizer';
import { ScanCache } from '../shared/scanners/ScanCache';
import { WorkerPool } from '../shared/scanners/WorkerPool';
import { PerformanceMonitor } from '../shared/scanners/PerformanceMonitor';

// Frame optimization
const optimizer = new FrameOptimizer({
  targetFPS: 15,
  skipSimilarFrames: true,
  downsampleFactor: 1.5,
});

// Adaptive FPS based on device
const fps = optimizer.adjustFrameRate({
  deviceTier: 'mid',
  batteryLevel: 85,
  isLowPowerMode: false,
});

// Scan caching
const cache = new ScanCache({ maxSize: 100 });
cache.set('barcode123', { data: 'cached result' });
const cached = cache.get('barcode123');

// Worker pool for async processing
const workerPool = new WorkerPool({ maxWorkers: 2 });
workerPool.registerProcessor('lookup', async (barcode) => {
  // Database lookup logic
  return await lookupBarcode(barcode);
});

const result = await workerPool.processAsync('lookup', barcode);

// Performance monitoring
const monitor = new PerformanceMonitor(15);
monitor.recordScanTime(125); // milliseconds
const stats = monitor.getStats();
console.log('Avg scan time:', stats.avgScanTime);

// Auto-tuning
const optimized = monitor.autoTune();
console.log('Recommendations:', optimized.recommendations);
```

### Scanner Settings

```typescript
import ScannerSettingsScreen, { loadScannerSettings } from '../shared/screens/ScannerSettingsScreen';

// Load saved settings
const settings = await loadScannerSettings();

// Show settings screen
<ScannerSettingsScreen onClose={() => navigation.goBack()} />

// Apply settings to scanner
const scanner = new UnifiedScanner({
  mode: settings.mode,
  imageProcessing: settings.imageProcessing,
  performance: settings.performance,
});
```

### Feedback Service Integration

```typescript
import { feedbackService } from '../services/feedbackService';

// Initialize feedback service
await feedbackService.initialize();

// Provide feedback for different events
await feedbackService.scanSuccess(barcode);
await feedbackService.scanDuplicate(barcode);
await feedbackService.startBatch();
await feedbackService.batchProgress(count);
await feedbackService.multiBarcodeDetected(count);
await feedbackService.lowConfidence();
await feedbackService.batchComplete(totalCount);
```

## Configuration Presets

The system includes three built-in presets:

### Fast Mode
- Single scan mode
- Minimal processing
- 30 FPS target
- Best for rapid scanning in good conditions

```typescript
const scanner = new UnifiedScanner();
scanner.loadPreset('fast');
```

### Accurate Mode
- All processing features enabled
- 15 FPS target
- Best for challenging conditions (low-light, damaged barcodes)

```typescript
const scanner = new UnifiedScanner();
scanner.loadPreset('accurate');
```

### Balanced Mode (Default)
- Good balance of speed and accuracy
- 20 FPS target
- Recommended for most use cases

```typescript
const scanner = new UnifiedScanner();
scanner.loadPreset('balanced');
```

## Performance Targets

The enhanced scanner system aims to achieve:

- **Scan Speed**: 2-5 scans per second in batch mode
- **Accuracy**: 95%+ for good quality barcodes
- **Damage Recovery**: 30-40% recovery rate
- **Low-Light**: 50%+ improvement in detection
- **Latency**: <100ms scan-to-result time
- **Cache Hit Rate**: 60-80% for repeat scans

## Platform Differences

### iOS (Expo Camera)
- Uses Expo Camera with VisionKit
- Frame capture via `takePictureAsync()`
- Multi-barcode support via ML Kit (optional)
- Excellent stability and reliability

### Android (Vision Camera)
- Uses react-native-vision-camera
- GPU-accelerated worklets (15 FPS)
- Built-in OCR support
- Higher frame rate capabilities

## File Structure

```
shared/
├── scanners/
│   ├── UnifiedScanner.ts          # Main API
│   ├── ImageProcessor.ts          # Multi-frame
│   ├── ImageEnhancer.ts           # Enhancement
│   ├── LowLightOptimizer.ts       # Low-light
│   ├── DamageRecovery.ts          # Error correction
│   ├── BatchScanner.ts            # Batch orchestration
│   ├── ConcurrentScanner.ts       # Multi-barcode
│   ├── ScanQueue.ts               # Queue management
│   ├── FrameOptimizer.ts          # Frame processing
│   ├── ScanCache.ts               # Caching
│   ├── WorkerPool.ts              # Background processing
│   └── PerformanceMonitor.ts      # Metrics
├── components/
│   ├── BatchScanControls.tsx      # Batch UI
│   └── ConcurrentScanOverlay.tsx  # Multi-barcode UI
└── screens/
    └── ScannerSettingsScreen.tsx  # Configuration

gas-cylinder-mobile/ (iOS)
└── components/
    └── EnhancedExpoCameraScanner.tsx

gas-cylinder-android/ (Android)
└── components/
    └── EnhancedVisionCameraScanner.tsx
```

## Best Practices

1. **Always initialize feedback service** before scanning
2. **Use appropriate presets** for your use case
3. **Enable caching** for frequently scanned items
4. **Monitor performance** in production
5. **Test in real conditions** (low-light, damaged labels, etc.)
6. **Configure batch settings** based on your workflow
7. **Handle errors gracefully** with appropriate feedback

## Troubleshooting

### Poor Scan Performance
- Check device tier and adjust FPS
- Enable frame skipping
- Reduce image processing features
- Use auto-tuning recommendations

### Low Accuracy
- Enable multi-frame analysis
- Use accurate preset
- Enable image enhancement
- Check lighting conditions

### High Battery Drain
- Reduce FPS
- Disable unnecessary processing
- Enable frame skipping
- Use worker threads wisely

## License

Part of the Gas Cylinder App project.
