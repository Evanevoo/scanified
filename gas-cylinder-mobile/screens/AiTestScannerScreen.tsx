import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { decodeBarcodeFromPhoto, getAiBarcodeScannerConfig } from '../services/aiVisionBarcodeService';
import { feedbackService } from '../services/feedbackService';

/** Same shape as EnhancedScanScreen / ScanCylinders customer + receipt handling. */
const FORMAT_OPTIONS: { label: string; pattern: RegExp; hint: string }[] = [
  {
    label: 'Customer / receipt',
    pattern: /^[*%]*[0-9A-Fa-f]{8}-[0-9]{10}[A-Za-z]?[*%]*$/i,
    hint: '%800005BE-1578330321A or 800005BE-1578330321A; optional * (Code39)',
  },
  {
    label: 'General (bottles, orders)',
    pattern: /^[\dA-Za-z\-%*]{4,60}$/,
    hint: 'Alphanumeric, %, -, * (same idea as Home / fill scan screens)',
  },
  { label: '9-digit serial', pattern: /^\d{9}$/, hint: 'Cylinder serial — exactly 9 digits' },
];

const AUTO_INTERVAL_MS = 2800;

/**
 * Settings-only test: camera preview for aiming; decode path is vision AI only (no live barcode scanner).
 * Reads automatically on a timer (each pass grabs a silent still — Expo has no raw frame API for JS).
 */
export default function AiTestScannerScreen() {
  const navigation = useNavigation();

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.iosOnlyRoot}>
        <Text style={styles.iosOnlyText}>AI test scanner is only available on iOS.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<any>(null);
  const busyRef = useRef(false);
  const formatIndexRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [lastOk, setLastOk] = useState('');
  const [lastError, setLastError] = useState('');
  /** Default to customer/receipt — most common mismatch with old “flex” option. */
  const [formatIndex, setFormatIndex] = useState(0);
  const [autoReadEnabled, setAutoReadEnabled] = useState(true);
  /** After a successful decode, stop auto cycles until user taps Scan again. */
  const [pausedAfterHit, setPausedAfterHit] = useState(false);
  const { url: aiUrl } = getAiBarcodeScannerConfig();

  formatIndexRef.current = formatIndex;

  useEffect(() => {
    feedbackService.initialize();
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      setCameraReady(false);
      return;
    }
    const delay = Platform.OS === 'ios' ? 280 : 200;
    const t = setTimeout(() => setCameraReady(true), delay);
    return () => clearTimeout(t);
  }, [permission?.granted]);

  const tryAiDecodeOnce = useCallback(async (): Promise<'hit' | 'miss' | 'skip'> => {
    if (!cameraRef.current) return 'skip';
    if (busyRef.current) return 'skip';
    busyRef.current = true;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: formatIndexRef.current === 0 ? 0.88 : 0.72,
        shutterSound: false,
        base64: true,
      });
      const pattern = FORMAT_OPTIONS[formatIndexRef.current].pattern;
      const decoded =
        photo?.base64 != null
          ? await decodeBarcodeFromPhoto({
              imageBase64: photo.base64,
              mimeType: 'image/jpeg',
              validationPattern: pattern,
            })
          : photo?.uri
            ? await decodeBarcodeFromPhoto({
                imageUri: photo.uri,
                validationPattern: pattern,
              })
            : null;
      if (!decoded) {
        setLastError('Could not grab preview frame');
        return 'miss';
      }
      if ('error' in decoded) {
        setLastError(decoded.error);
        return 'miss';
      }
      setLastOk(decoded.barcode);
      setLastError('');
      await feedbackService.scanSuccess(decoded.barcode).catch(() => {});
      return 'hit';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setLastError(msg);
      return 'miss';
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!cameraReady || !permission?.granted) return;
    if (!autoReadEnabled || pausedAfterHit) return;

    const run = () => {
      void (async () => {
        const r = await tryAiDecodeOnce();
        if (r === 'hit') setPausedAfterHit(true);
      })();
    };

    const id = setInterval(run, AUTO_INTERVAL_MS);
    const boot = setTimeout(run, 900);
    return () => {
      clearInterval(id);
      clearTimeout(boot);
    };
  }, [cameraReady, permission?.granted, autoReadEnabled, pausedAfterHit, tryAiDecodeOnce]);

  const validationPattern = FORMAT_OPTIONS[formatIndex].pattern;

  const onScanAgain = () => {
    setPausedAfterHit(false);
    setLastOk('');
    setLastError('');
  };

  const endpointLabel =
    aiUrl.length > 52 ? `${aiUrl.slice(0, 28)}…${aiUrl.slice(-20)}` : aiUrl;

  return (
    <View style={styles.root}>
      {!permission ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : !permission.granted ? (
        <View style={styles.centered}>
          <Text style={styles.help}>Camera access is required to aim at a label.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => requestPermission()}>
            <Text style={styles.primaryBtnText}>Allow camera</Text>
          </TouchableOpacity>
        </View>
      ) : !cameraReady ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.help}>Starting camera…</Text>
        </View>
      ) : (
        <>
          <View style={styles.cameraWrap}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="video"
              animateShutter={false}
              barcodeScannerEnabled={false}
            />
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Go back"
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              {busy ? (
                <View style={styles.readingPill}>
                  <ActivityIndicator size="small" color="#E9D5FF" />
                  <Text style={styles.readingPillText}>Reading…</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.hintOverlay} pointerEvents="none">
              <Text style={styles.hintText}>
                AI reads automatically from the live preview (silent frame samples every few seconds). Hold the label
                steady — no tap required.
              </Text>
            </View>
          </View>

          <ScrollView
            style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}
            contentContainerStyle={styles.panelContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.autoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Auto-read</Text>
                <Text style={styles.monoSmall}>Runs while the camera is open (uses API each cycle).</Text>
              </View>
              <Switch
                value={autoReadEnabled}
                onValueChange={setAutoReadEnabled}
                trackColor={{ false: '#333', true: '#5B21B6' }}
                thumbColor={autoReadEnabled ? '#C4B5FD' : '#888'}
              />
            </View>

            <Text style={styles.statusLine}>
              {pausedAfterHit
                ? 'Decoded. Tap Scan again for another label.'
                : !autoReadEnabled
                  ? 'Auto-read is off.'
                  : 'Point at a barcode — reading in the background…'}
            </Text>

            {pausedAfterHit ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onScanAgain}>
                <Text style={styles.secondaryBtnText}>Scan again</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionLabel}>Expected format</Text>
            <View style={styles.chips}>
              {FORMAT_OPTIONS.map((opt, i) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.chip, formatIndex === i && styles.chipActive]}
                  onPress={() => setFormatIndex(i)}
                >
                  <Text style={[styles.chipText, formatIndex === i && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.mono}>{FORMAT_OPTIONS[formatIndex].hint}</Text>
            <Text style={styles.regexSmall}>{validationPattern.toString()}</Text>

            <Text style={styles.sectionLabel}>AI endpoint</Text>
            <Text style={styles.configMono} selectable>
              {endpointLabel}
            </Text>
            <Text style={styles.configHint}>
              Override with EXPO_PUBLIC_AI_BARCODE_FUNCTION_URL or EXPO_PUBLIC_NETLIFY_FUNCTIONS_BASE_URL, then rebuild.
            </Text>

            {lastOk ? (
              <View style={styles.resultOk}>
                <Text style={styles.resultLabel}>Result</Text>
                <Text style={styles.resultValue} selectable>
                  {lastOk}
                </Text>
              </View>
            ) : null}
            {lastError && !lastOk ? (
              <View style={styles.resultErr}>
                <Text style={styles.resultLabel}>Last attempt</Text>
                <Text style={styles.resultErrText} selectable>
                  {lastError}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iosOnlyRoot: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iosOnlyText: {
    color: '#e5e5e5',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  help: {
    color: '#e5e5e5',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cameraWrap: {
    flex: 1,
    minHeight: 220,
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  readingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(91,33,182,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  readingPillText: {
    color: '#EDE9FE',
    fontSize: 14,
    fontWeight: '700',
  },
  hintOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 10,
    borderRadius: 8,
  },
  hintText: {
    color: '#f5f5f5',
    fontSize: 13,
    textAlign: 'center',
  },
  panel: {
    flexGrow: 0,
    maxHeight: '48%',
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  panelContent: {
    padding: 16,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 4,
  },
  monoSmall: {
    color: '#777',
    fontSize: 12,
  },
  statusLine: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtnText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    borderColor: '#A78BFA',
    backgroundColor: '#2a2540',
  },
  chipText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#E9D5FF',
  },
  mono: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 4,
  },
  regexSmall: {
    color: '#666',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  configMono: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
    lineHeight: 16,
  },
  configHint: {
    color: '#666',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  resultOk: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  resultErr: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  resultLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultValue: {
    color: '#6EE7B7',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultErrText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
});
