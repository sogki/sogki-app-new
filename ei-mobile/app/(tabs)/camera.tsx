import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ScanResultCard } from '@/src/components/camera/ScanResultCard';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { MarkdownText } from '@/src/components/ui/MarkdownText';
import { useLifeDashboard } from '@/src/context/LifeDashboardContext';
import { usePendingEiAsk } from '@/src/context/PendingEiAskContext';
import { adminApi } from '@/src/lib/adminApi';
import {
  CLASSIFY_MIN,
  CODE_TYPES,
  MAX_SCANS,
  prepareVisionImage,
  titleFromText,
  type VisionMode,
} from '@/src/lib/cameraVision';
import {
  analyseQrPayload,
  riskLabel,
  type QrAnalysis,
} from '@/src/lib/qrAnalysis';
import { normalizeOcrText } from '@/src/lib/ocrText';
import {
  isProductBarcodeType,
  lookupProductBarcode,
  productToScanText,
  type ProductLookup,
} from '@/src/lib/productLookup';
import { captureScanLocation, compressScanImage } from '@/src/lib/scanCapture';
import {
  buildScanFingerprint,
  findScanMemory,
  memoryBannerCopy,
  productCategoryLabel,
  productEmoji,
  productInfoBullets,
  qrInfoBullets,
  relativeAgoLong,
  textInfoBullets,
  type ScanMemoryHit,
} from '@/src/lib/scanMemory';
import type { LifeScan } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dashboard, refresh, savePayload } = useLifeDashboard();
  const { setPendingEiAsk } = usePendingEiAsk();
  const { height: windowHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const scanLockRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [resolvedMode, setResolvedMode] = useState<VisionMode | 'qr' | 'barcode'>('ocr');
  const [busy, setBusy] = useState(false);
  const [busyPhase, setBusyPhase] = useState<'classify' | 'analyse' | 'product' | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [qrAnalysis, setQrAnalysis] = useState<QrAnalysis | null>(null);
  const [product, setProduct] = useState<ProductLookup | null>(null);
  const [scanLock, setScanLock] = useState(false);
  const [resultSource, setResultSource] = useState<'camera' | 'library'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [modePrompt, setModePrompt] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [classifyReason, setClassifyReason] = useState<string | null>(null);
  const [memoryHit, setMemoryHit] = useState<ScanMemoryHit | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const showingResult = Boolean(result || error || qrAnalysis || product);
  const tabClearance = 110 + Math.max(insets.bottom, 8);
  const headerBlock = insets.top + 58;
  const compactPreviewH = 120;
  const idlePreviewH = Math.round(
    Math.min(
      Math.max(windowHeight - headerBlock - tabClearance - 8, 300),
      windowHeight * 0.7
    )
  );
  const previewHeight = useSharedValue(idlePreviewH);

  useEffect(() => {
    const next = showingResult || modePrompt ? compactPreviewH : idlePreviewH;
    previewHeight.value = withTiming(next, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [showingResult, modePrompt, idlePreviewH, compactPreviewH, previewHeight]);

  const previewAnimStyle = useAnimatedStyle(() => ({
    height: previewHeight.value,
  }));

  const reset = () => {
    scanLockRef.current = false;
    setPreviewUri(null);
    setResult(null);
    setQrAnalysis(null);
    setProduct(null);
    setScanLock(false);
    setError(null);
    setSavedId(null);
    setBusy(false);
    setBusyPhase(null);
    setModePrompt(false);
    setPendingUri(null);
    setClassifyReason(null);
    setMemoryHit(null);
    setCompareOpen(false);
    setResolvedMode('ocr');
  };

  const refreshMemory = useCallback(
    async (input: {
      mode: LifeScan['mode'];
      barcode?: string | null;
      qrRaw?: string | null;
      qrDestination?: string | null;
      title?: string | null;
      text?: string | null;
    }) => {
      const fingerprint = buildScanFingerprint(input);
      if (!fingerprint) {
        setMemoryHit(null);
        return null;
      }
      try {
        const dash = dashboard ?? (await refresh());
        const scans = dash?.payload.scans ?? [];
        const hit = findScanMemory(scans, fingerprint);
        setMemoryHit(hit);
        return hit;
      } catch {
        setMemoryHit(null);
        return null;
      }
    },
    [dashboard, refresh]
  );

  const grabStill = async (): Promise<string | null> => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.45,
        skipProcessing: true,
      });
      return photo?.uri ?? null;
    } catch {
      return null;
    }
  };

  const finishWithStill = async (uri: string | null) => {
    if (uri) {
      setPreviewUri(uri);
      setResultSource('camera');
    }
  };

  const applyQr = async (payload: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanLock(true);
    setModePrompt(false);
    setPendingUri(null);
    setResolvedMode('qr');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = await grabStill();
    const analysis = analyseQrPayload(payload);
    setQrAnalysis(analysis);
    setProduct(null);
    setResult(null);
    setError(null);
    setCompareOpen(false);
    await finishWithStill(uri);
    void refreshMemory({
      mode: 'qr',
      qrRaw: payload,
      qrDestination: analysis.destination,
      title: `QR · ${analysis.destination}`,
    });
  };

  const applyProductBarcode = async (code: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanLock(true);
    setModePrompt(false);
    setPendingUri(null);
    setResolvedMode('barcode');
    setBusy(true);
    setBusyPhase('product');
    setError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = await grabStill();
    try {
      const found = await lookupProductBarcode(code);
      setProduct(found);
      setQrAnalysis(null);
      setResult(null);
      setCompareOpen(false);
      if (!found.found) {
        setError(`No product found for ${code}. You can still Save the barcode.`);
      }
      await finishWithStill(uri);
      void refreshMemory({
        mode: 'barcode',
        barcode: code,
        title: found.name,
        text: productToScanText(found),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Product lookup failed');
      setProduct({
        barcode: code,
        found: false,
        name: 'Lookup failed',
        brand: '',
        authors: '',
        quantity: '',
        categories: '',
        kind: 'unknown',
        isFoodOrDrink: false,
        description: '',
        ingredients: '',
        allergens: '',
        activeIngredients: '',
        dosageForm: '',
        route: '',
        warnings: '',
        nutriscore: null,
        nova: null,
        imageUrl: null,
        nutrition: [],
        source: 'none',
        summary: `Barcode ${code}`,
      });
      await finishWithStill(uri);
    } finally {
      setBusy(false);
      setBusyPhase(null);
    }
  };

  const onBarcodeScanned = (scan: BarcodeScanningResult) => {
    if (scanLockRef.current || busy || previewUri || modePrompt || showingResult) return;
    const data = typeof scan.data === 'string' ? scan.data.trim() : '';
    if (!data) return;
    const type = scan.type;

    if (type === 'qr' || (!isProductBarcodeType(type) && data.includes('://'))) {
      void applyQr(data);
      return;
    }
    if (isProductBarcodeType(type) || /^\d{8,14}$/.test(data)) {
      void applyProductBarcode(data);
      return;
    }
    void applyQr(data);
  };

  const runVision = useCallback(
    async (uri: string, nextMode: VisionMode, source: 'camera' | 'library') => {
      setBusy(true);
      setBusyPhase('analyse');
      setError(null);
      setResult(null);
      setQrAnalysis(null);
      setProduct(null);
      setSavedId(null);
      setModePrompt(false);
      setPendingUri(null);
      setPreviewUri(uri);
      setResultSource(source);
      setResolvedMode(nextMode);
      try {
        const base64 = await prepareVisionImage(uri);
        const { reply } = await adminApi.eiVision({
          imageBase64: `data:image/jpeg;base64,${base64}`,
          mode: nextMode,
        });
        const cleaned = nextMode === 'ocr' ? normalizeOcrText(reply) : reply.trim();
        setResult(cleaned);
        setCompareOpen(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void refreshMemory({
          mode: nextMode,
          title: titleFromText(cleaned),
          text: cleaned,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Vision failed');
      } finally {
        setBusy(false);
        setBusyPhase(null);
      }
    },
    [refreshMemory]
  );

  const classifyAndRun = useCallback(
    async (uri: string, source: 'camera' | 'library') => {
      setBusy(true);
      setBusyPhase('classify');
      setError(null);
      setResult(null);
      setQrAnalysis(null);
      setProduct(null);
      setSavedId(null);
      setPreviewUri(uri);
      setResultSource(source);
      setModePrompt(false);
      setPendingUri(null);
      setClassifyReason(null);
      try {
        const base64 = await prepareVisionImage(uri);
        const { decision } = await adminApi.eiVision({
          imageBase64: `data:image/jpeg;base64,${base64}`,
          mode: 'classify',
        });
        const mode = decision?.mode;
        const confidence = decision?.confidence ?? 0;
        const reason = decision?.reason ?? null;
        setClassifyReason(reason);

        if (mode && confidence >= CLASSIFY_MIN) {
          await runVision(uri, mode, source);
          return;
        }

        setBusy(false);
        setBusyPhase(null);
        setPendingUri(uri);
        setModePrompt(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // If classify fails, fall back to manual pick rather than a hard error.
        setBusy(false);
        setBusyPhase(null);
        setPendingUri(uri);
        setModePrompt(true);
        setClassifyReason(e instanceof Error ? e.message : 'Could not auto-detect');
      }
    },
    [runVision]
  );

  const capture = async () => {
    if (!cameraRef.current || busy || scanLockRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo captured');
      await classifyAndRun(photo.uri, 'camera');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture');
    }
  };

  const pickFromLibrary = async () => {
    if (busy) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.55,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    await classifyAndRun(picked.assets[0].uri, 'library');
  };

  const pickMode = (mode: VisionMode) => {
    const uri = pendingUri || previewUri;
    if (!uri) return;
    void runVision(uri, mode, resultSource);
  };

  const saveScan = async () => {
    if ((!result && !qrAnalysis && !product) || saving) return;
    const text = product
      ? productToScanText(product)
      : qrAnalysis
        ? [
            `QR · ${qrAnalysis.summary}`,
            `Destination: ${qrAnalysis.destination}`,
            `Risk: ${riskLabel(qrAnalysis.risk)}`,
            ...qrAnalysis.riskReasons.map((r) => `• ${r}`),
            '',
            qrAnalysis.raw,
          ].join('\n')
        : result ?? '';
    if (!text.trim()) return;

    const mode: LifeScan['mode'] =
      resolvedMode === 'barcode'
        ? 'barcode'
        : resolvedMode === 'qr'
          ? 'qr'
          : resolvedMode === 'identify' || resolvedMode === 'translate'
            ? resolvedMode
            : 'ocr';
    const title = product
      ? product.name.slice(0, 48)
      : qrAnalysis
        ? `QR · ${qrAnalysis.destination.slice(0, 40)}`
        : titleFromText(text);
    const fingerprint =
      buildScanFingerprint({
        mode,
        barcode: product?.barcode,
        qrRaw: qrAnalysis?.raw,
        qrDestination: qrAnalysis?.destination,
        title,
        text,
      }) ?? undefined;

    setSaving(true);
    setError(null);
    try {
      const dash = dashboard ?? (await refresh());
      if (!dash) throw new Error('Dashboard unavailable');
      const existing = Array.isArray(dash.payload.scans) ? dash.payload.scans : [];
      const location = await captureScanLocation();
      let imageDataUrl: string | undefined;
      if (previewUri) {
        try {
          imageDataUrl = (await compressScanImage(previewUri)) ?? undefined;
        } catch {
          /* optional */
        }
      }
      const productImageUrl = product?.imageUrl
        ? product.imageUrl.replace(/^http:\/\//i, 'https://')
        : undefined;
      const now = new Date().toISOString();
      const prior =
        fingerprint != null ? findScanMemory(existing, fingerprint)?.scan : null;

      let next: LifeScan[];
      let id: string;

      if (prior) {
        id = prior.id;
        const updated: LifeScan = {
          ...prior,
          title,
          text,
          mode,
          source: resultSource,
          fingerprint: fingerprint ?? prior.fingerprint,
          lastSeenAt: now,
          scanCount: Math.max(1, prior.scanCount ?? 1) + 1,
          ...(imageDataUrl ? { imageDataUrl } : {}),
          ...(productImageUrl
            ? { productImageUrl }
            : productImageUrl === undefined && prior.productImageUrl
              ? {}
              : {}),
          ...(location
            ? {
                locationLabel: location.label,
                latitude: location.latitude,
                longitude: location.longitude,
              }
            : {}),
        };
        next = [updated, ...existing.filter((s) => s.id !== prior.id)].slice(0, MAX_SCANS);
        setMemoryHit({
          scan: updated,
          fingerprint: updated.fingerprint ?? fingerprint!,
          agoLabel: 'just now',
          timesSeen: updated.scanCount ?? 1,
        });
      } else {
        id = `scan_${Date.now()}`;
        const entry: LifeScan = {
          id,
          title,
          text,
          createdAt: now,
          lastSeenAt: now,
          scanCount: 1,
          source: resultSource,
          mode,
          ...(fingerprint ? { fingerprint } : {}),
          ...(imageDataUrl ? { imageDataUrl } : {}),
          ...(productImageUrl ? { productImageUrl } : {}),
          ...(location
            ? {
                locationLabel: location.label,
                latitude: location.latitude,
                longitude: location.longitude,
              }
            : {}),
        };
        next = [entry, ...existing].slice(0, MAX_SCANS);
      }

      await savePayload({ ...dash.payload, scans: next });
      setSavedId(id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save scan');
    } finally {
      setSaving(false);
    }
  };

  const askEiAboutScan = () => {
    const title = product?.name
      ?? (qrAnalysis ? qrAnalysis.destination : null)
      ?? (result ? titleFromText(result) : 'this scan');
    const memoryBit = memoryHit
      ? ` I previously saved this ${memoryHit.agoLabel} (seen ${memoryHit.timesSeen} time${memoryHit.timesSeen === 1 ? '' : 's'}).`
      : '';
    const detail = product
      ? productToScanText(product).slice(0, 350)
      : qrAnalysis
        ? `${qrAnalysis.summary}. Destination: ${qrAnalysis.destination}`
        : (result ?? '').slice(0, 350);
    setPendingEiAsk(
      `Tell me about this scan: ${title}.${memoryBit} Details:\n${detail}`
    );
    router.push('/');
  };

  const openLink = async () => {
    if (!qrAnalysis?.openUrl) return;
    if (qrAnalysis.risk === 'high') {
      Alert.alert('Suspicious link', 'This QR looks risky. Open anyway?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open anyway',
          style: 'destructive',
          onPress: () => void Linking.openURL(qrAnalysis.openUrl!),
        },
      ]);
      return;
    }
    try {
      await Linking.openURL(qrAnalysis.openUrl);
    } catch {
      Alert.alert('Could not open link');
    }
  };

  if (!permission) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </GradientBackground>
    );
  }

  if (!permission.granted) {
    return (
      <GradientBackground>
        <StatusBar style="light" />
        <View style={[styles.center, { paddingTop: insets.top + 40, paddingHorizontal: 24 }]}>
          <Ionicons name="camera-outline" size={40} color={colors.accentLight} />
          <Text style={styles.permTitle}>Camera access</Text>
          <Text style={styles.permBody}>
            Ei uses a universal scanner for text, QR codes, barcodes, objects, and translation.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
            <Text style={styles.primaryBtnText}>Allow camera</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => void pickFromLibrary()}>
            <Text style={styles.ghostBtnText}>Choose from library instead</Text>
          </Pressable>
        </View>
      </GradientBackground>
    );
  }

  const busyLabel =
    busyPhase === 'classify'
      ? 'Ei is deciding…'
      : busyPhase === 'product'
        ? 'Looking up product…'
        : resolvedMode === 'ocr'
          ? 'Scanning text…'
          : resolvedMode === 'translate'
            ? 'Translating…'
            : 'Identifying…';

  const hasResultCard = Boolean(qrAnalysis || product || result);
  const liveCamera = !previewUri && !showingResult && !modePrompt;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 6,
            paddingBottom: tabClearance,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.topText}>
            <Text style={styles.title}>Scan</Text>
            <Text style={styles.subtitle}>Ei picks the mode · QR & barcodes auto</Text>
          </View>
          <Pressable style={styles.libraryLink} onPress={() => router.push('/tools/scans')}>
            <Ionicons name="folder-open-outline" size={15} color={colors.accentLight} />
            <Text style={styles.libraryLinkText}>Scans</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.previewFrame, previewAnimStyle]}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : showingResult ? (
            <View style={styles.previewPlaceholder}>
              <Ionicons
                name={
                  product
                    ? 'barcode-outline'
                    : qrAnalysis
                      ? 'qr-code-outline'
                      : 'image-outline'
                }
                size={32}
                color={colors.textMuted}
              />
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: CODE_TYPES }}
              onBarcodeScanned={
                liveCamera && !scanLock ? onBarcodeScanned : undefined
              }
            />
          )}

          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.text} size="large" />
              <Text style={styles.busyText}>{busyLabel}</Text>
            </View>
          ) : null}

          {/* Controls live ON the camera so they never sink under the tab bar */}
          {!showingResult && !modePrompt ? (
            <View style={styles.cameraControls} pointerEvents="box-none">
              {!busy ? (
                <Text style={styles.hintPill}>
                  Point at anything — codes scan live, shutter for the rest
                </Text>
              ) : null}
              <View style={styles.overlayActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => void pickFromLibrary()}
                  disabled={busy}
                >
                  <Ionicons name="images-outline" size={16} color={colors.text} />
                  <Text style={styles.actionBtnText}>Library</Text>
                </Pressable>
                <Pressable
                  style={styles.shutter}
                  onPress={() => void capture()}
                  disabled={busy}
                >
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.spacer} />
              </View>
            </View>
          ) : null}

          {showingResult && hasResultCard ? (
            <View style={styles.cameraControls} pointerEvents="box-none">
              <View style={styles.overlayActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={reset}
                  disabled={busy || saving}
                >
                  <Ionicons name="refresh" size={16} color={colors.text} />
                  <Text style={styles.actionBtnText}>Scan again</Text>
                </Pressable>
                <View style={styles.spacer} />
              </View>
            </View>
          ) : null}
        </Animated.View>

        {modePrompt ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.promptCard}>
            <Text style={styles.promptTitle}>Not sure what this is — pick a mode</Text>
            {classifyReason ? (
              <Text style={styles.promptReason}>{classifyReason}</Text>
            ) : null}
            <View style={styles.promptRow}>
              <ModeChip label="Text" onPress={() => pickMode('ocr')} />
              <ModeChip label="Identify" onPress={() => pickMode('identify')} />
              <ModeChip label="Translate" onPress={() => pickMode('translate')} />
            </View>
            <Pressable style={styles.promptCancel} onPress={reset}>
              <Text style={styles.promptCancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {showingResult ? (
          <Animated.View
            entering={FadeInDown.duration(360).delay(60)}
            style={styles.resultShell}
          >
            <ScrollView
              style={styles.resultScroll}
              contentContainerStyle={styles.resultScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {error && !product && !qrAnalysis && !result ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {product ? (
                <ScanResultCard
                  title={product.name}
                  emoji={productEmoji(product)}
                  category={productCategoryLabel(product)}
                  bullets={productInfoBullets(product)}
                  memoryBanner={memoryHit ? memoryBannerCopy(memoryHit) : null}
                  heroImageUrl={
                    product.imageUrl
                      ? product.imageUrl.replace(/^http:\/\//i, 'https://')
                      : null
                  }
                  footerNote={
                    product.found
                      ? `Via ${productSourceLabel(product.source)}`
                      : error ?? product.summary
                  }
                  actions={[
                    {
                      id: 'save',
                      label: memoryHit
                        ? savedId
                          ? 'Updated'
                          : 'Update memory'
                        : savedId
                          ? 'Saved'
                          : 'Save',
                      icon: 'save-outline',
                      primary: !savedId,
                      done: Boolean(savedId),
                      disabled: saving || Boolean(savedId),
                      onPress: () => void saveScan(),
                    },
                    ...(memoryHit
                      ? [
                          {
                            id: 'compare',
                            label: compareOpen ? 'Hide' : 'Compare',
                            icon: 'swap-horizontal-outline' as const,
                            onPress: () => setCompareOpen((v) => !v),
                          },
                        ]
                      : []),
                    {
                      id: 'ask',
                      label: 'Ask Ei',
                      icon: 'chatbubble-ellipses-outline',
                      onPress: askEiAboutScan,
                    },
                  ]}
                >
                  {compareOpen && memoryHit ? (
                    <View style={styles.compareBox}>
                      <Text style={styles.compareLabel}>Previously saved</Text>
                      <Text style={styles.compareMeta}>
                        First: {relativeAgoSafe(memoryHit.scan.createdAt)} · Seen{' '}
                        {memoryHit.timesSeen}×
                        {memoryHit.scan.locationLabel
                          ? ` · ${memoryHit.scan.locationLabel}`
                          : ''}
                      </Text>
                      <Text style={styles.compareBody} selectable>
                        {memoryHit.scan.text.slice(0, 500)}
                        {memoryHit.scan.text.length > 500 ? '…' : ''}
                      </Text>
                    </View>
                  ) : null}
                </ScanResultCard>
              ) : null}

              {qrAnalysis && !product ? (
                <ScanResultCard
                  title={qrAnalysis.destination}
                  emoji="🔗"
                  category={`QR · ${riskLabel(qrAnalysis.risk)}`}
                  bullets={qrInfoBullets(qrAnalysis)}
                  memoryBanner={memoryHit ? memoryBannerCopy(memoryHit) : null}
                  footerNote={qrAnalysis.kind === 'url' ? qrAnalysis.host ?? undefined : null}
                  actions={[
                    {
                      id: 'save',
                      label: memoryHit
                        ? savedId
                          ? 'Updated'
                          : 'Update memory'
                        : savedId
                          ? 'Saved'
                          : 'Save',
                      icon: 'save-outline',
                      primary: !savedId,
                      done: Boolean(savedId),
                      disabled: saving || Boolean(savedId),
                      onPress: () => void saveScan(),
                    },
                    ...(memoryHit
                      ? [
                          {
                            id: 'compare',
                            label: compareOpen ? 'Hide' : 'Compare',
                            icon: 'swap-horizontal-outline' as const,
                            onPress: () => setCompareOpen((v) => !v),
                          },
                        ]
                      : []),
                    {
                      id: 'ask',
                      label: 'Ask Ei',
                      icon: 'chatbubble-ellipses-outline',
                      onPress: askEiAboutScan,
                    },
                    ...(qrAnalysis.openUrl
                      ? [
                          {
                            id: 'open',
                            label: 'Open',
                            icon: 'open-outline' as const,
                            onPress: () => void openLink(),
                          },
                        ]
                      : []),
                  ]}
                >
                  {compareOpen && memoryHit ? (
                    <View style={styles.compareBox}>
                      <Text style={styles.compareLabel}>Previously saved</Text>
                      <Text style={styles.compareBody} selectable>
                        {memoryHit.scan.text.slice(0, 400)}
                      </Text>
                    </View>
                  ) : null}
                </ScanResultCard>
              ) : null}

              {result && !qrAnalysis && !product ? (
                <ScanResultCard
                  title={titleFromText(result)}
                  emoji={
                    resolvedMode === 'translate'
                      ? '🌐'
                      : resolvedMode === 'identify'
                        ? '🔍'
                        : '📝'
                  }
                  category={
                    resolvedMode === 'ocr'
                      ? 'Text'
                      : resolvedMode === 'translate'
                        ? 'Translation'
                        : 'Identification'
                  }
                  bullets={
                    classifyReason
                      ? [`Ei chose this · ${classifyReason}`, ...textInfoBullets(result)]
                      : textInfoBullets(result)
                  }
                  memoryBanner={memoryHit ? memoryBannerCopy(memoryHit) : null}
                  actions={[
                    {
                      id: 'save',
                      label: memoryHit
                        ? savedId
                          ? 'Updated'
                          : 'Update memory'
                        : savedId
                          ? 'Saved'
                          : 'Save',
                      icon: 'save-outline',
                      primary: !savedId,
                      done: Boolean(savedId),
                      disabled: saving || Boolean(savedId),
                      onPress: () => void saveScan(),
                    },
                    ...(memoryHit
                      ? [
                          {
                            id: 'compare',
                            label: compareOpen ? 'Hide' : 'Compare',
                            icon: 'swap-horizontal-outline' as const,
                            onPress: () => setCompareOpen((v) => !v),
                          },
                        ]
                      : []),
                    {
                      id: 'ask',
                      label: 'Ask Ei',
                      icon: 'chatbubble-ellipses-outline',
                      onPress: askEiAboutScan,
                    },
                  ]}
                >
                  {resolvedMode !== 'ocr' ? (
                    <MarkdownText style={styles.bodyText}>{result}</MarkdownText>
                  ) : result.split(/\r?\n/).length > 5 ? (
                    <Text style={styles.bodyText} selectable>
                      {result}
                    </Text>
                  ) : null}
                  {compareOpen && memoryHit ? (
                    <View style={styles.compareBox}>
                      <Text style={styles.compareLabel}>Previously saved</Text>
                      <Text style={styles.compareBody} selectable>
                        {memoryHit.scan.text.slice(0, 500)}
                      </Text>
                    </View>
                  ) : null}
                </ScanResultCard>
              ) : null}
            </ScrollView>
          </Animated.View>
        ) : !modePrompt ? (
          <Text style={styles.hint}>
            QR and barcodes scan automatically. Everything else uses the shutter — Ei picks text,
            identify, or translate.
          </Text>
        ) : null}
      </View>
    </GradientBackground>
  );
}

function productSourceLabel(source: ProductLookup['source']): string {
  switch (source) {
    case 'openfoodfacts':
      return 'Open Food Facts';
    case 'openbeautyfacts':
      return 'Open Beauty Facts';
    case 'openproductsfacts':
      return 'Open Products Facts';
    case 'openpetfoodfacts':
      return 'Open Pet Food Facts';
    case 'upcitemdb':
      return 'UPCitemdb';
    case 'openfda':
      return 'openFDA';
    case 'openlibrary':
      return 'Open Library';
    case 'googlebooks':
      return 'Google Books';
    case 'gs1-prefix':
      return 'Manufacturer barcode prefix';
    default:
      return 'lookup';
  }
}

function relativeAgoSafe(iso: string): string {
  return relativeAgoLong(iso);
}

function ModeChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.modeChip} hitSlop={4}>
      <Text style={styles.modeChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  topText: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  libraryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  libraryLinkText: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '600',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  previewFrame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.border,
  },
  camera: { flex: 1 },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  busyText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  hintPill: {
    alignSelf: 'center',
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  overlayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(18,18,26,0.88)',
    minWidth: 88,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  spacer: { minWidth: 88 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    minWidth: 88,
  },
  saveBtnDone: { backgroundColor: 'rgba(34,197,94,0.35)' },
  saveBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  promptCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  promptTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  promptReason: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptCancel: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  promptCancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modeChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(139,92,246,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipText: {
    color: colors.accentLight,
    fontSize: 13,
    fontWeight: '700',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  resultShell: {
    flex: 1,
    marginTop: 10,
    minHeight: 0,
  },
  resultScroll: { flex: 1 },
  resultScrollContent: {
    paddingBottom: 8,
    gap: 10,
  },
  errorBox: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  compareBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  compareLabel: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compareMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  compareBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  bodyText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    width: '100%',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  permTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 8,
  },
  permBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  ghostBtn: { marginTop: 10, padding: 10 },
  ghostBtnText: { color: colors.accentLight, fontSize: 13 },
});
