import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import ScanbotBarcodeSDK, {
  BarcodeScannerScreenConfiguration,
  SingleScanningMode,
  CommonBarcodeScannerConfiguration,
} from 'react-native-scanbot-barcode-scanner-sdk';
import logger from '../utils/logger';

const extra = (Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra) as Record<string, string> | undefined;
const licenseKey = extra?.SCANBOT_SDK_LICENSE_KEY ?? '';

export default function ScanbotTestScreen() {
  const [lastScan, setLastScan] = useState<{ text: string; format: string } | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  const ensureInit = async (): Promise<boolean> => {
    if (initialized.current) return true;
    if (!licenseKey || licenseKey.length < 10) {
      setStatus('No Scanbot license key. Add SCANBOT_SDK_LICENSE_KEY to .env (see .env.example).');
      return false;
    }
    try {
      setStatus('Initializing Scanbot SDK...');
      const result = await ScanbotBarcodeSDK.initializeSdk({ licenseKey });
      initialized.current = true;
      setStatus(`SDK ready. License: ${result.licenseStatus}`);
      logger.log('Scanbot SDK initialized:', result);
      return result.isLicenseValid;
    } catch (e: any) {
      const msg = e?.message || String(e);
      const isNotLinked = /doesn't seem to be linked|pod install|rebuilt the app|Expo Go/i.test(msg);
      setStatus(
        isNotLinked
          ? 'Scanbot native module not linked. See gas-cylinder-mobile/SCANBOT_IOS_SETUP.md: run "expo prebuild" + "expo run:ios" on Mac, or "eas build --profile production --platform ios". Not available in Expo Go.'
          : `Init failed: ${msg}`
      );
      if (isNotLinked) logger.warn('Scanbot not linked (expected in Expo Go or without native build). See SCANBOT_IOS_SETUP.md.');
      else logger.error('Scanbot init error:', e);
      return false;
    }
  };

  const startScan = async () => {
    setLoading(true);
    setStatus('');
    try {
      const ok = await ensureInit();
      if (!ok) {
        setLoading(false);
        return;
      }
      setStatus('Opening scanner...');

      const config = new BarcodeScannerScreenConfiguration({
        useCase: new SingleScanningMode({ confirmationSheetEnabled: false }),
        scannerConfiguration: new CommonBarcodeScannerConfiguration({
          barcodeFormats: [
            'CODE_39',   // 1D: packing slips & sales receipts (e.g. %80000809-1657573726A)
            'CODE_128',
            'CODABAR',
            'CODE_93',
            'DATA_MATRIX',
            'EAN_13',
            'EAN_8',
            'ITF',
            'PDF_417',
            'QR_CODE',
            'UPC_A',
            'UPC_E',
          ],
        }),
      });

      const result = await ScanbotBarcodeSDK.startBarcodeScanner(config);

      if (result.status === 'CANCELED') {
        setStatus('Scan cancelled');
        setLastScan(null);
      } else if (result.status === 'OK' && result.data?.items?.length) {
        const item = result.data.items[0];
        const text = item?.barcode?.text ?? '';
        const format = item?.barcode?.format ?? 'NONE';
        setLastScan({ text, format });
        setStatus(`Scanned: ${format}`);
        logger.log('Scanbot scan:', { text, format });
      } else {
        setStatus('No barcode in result');
        setLastScan(null);
      }
    } catch (e: any) {
      setStatus(`Error: ${e?.message || String(e)}`);
      setLastScan(null);
      logger.error('Scanbot scan error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scanbot SDK Test</Text>
      <Text style={styles.subtitle}>Code 39 (packing slips & sales receipts) and other 1D/2D</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={startScan}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Opening…' : 'Start Scanbot scan'}</Text>
      </TouchableOpacity>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {lastScan && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Last scan</Text>
          <Text style={styles.resultFormat}>{lastScan.format}</Text>
          <Text style={styles.resultText} selectable>{lastScan.text}</Text>
        </View>
      )}

      <Text style={styles.hint}>
        License: {licenseKey ? `Set (${licenseKey.length} chars)` : 'Not set. Add SCANBOT_SDK_LICENSE_KEY to .env.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  status: { marginTop: 16, fontSize: 14, color: '#333' },
  result: { marginTop: 24, padding: 16, backgroundColor: '#f0f9ff', borderRadius: 10 },
  resultLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  resultFormat: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  resultText: { fontSize: 16, fontFamily: 'monospace' },
  hint: { marginTop: 24, fontSize: 12, color: '#888' },
});
