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
  type BarcodeType,
} from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
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
import { Card } from '@/src/components/ui/Card';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { MarkdownText } from '@/src/components/ui/MarkdownText';
import { adminApi } from '@/src/lib/adminApi';
import {
  analyseQrPayload,
  riskLabel,
  type QrAnalysis,
} from '@/src/lib/qrAnalysis';
import { normalizeOcrText } from '@/src/lib/ocrText';
import {
  isProductBarcodeType,
  lookupProductBarcode,
  productKindLabel,
  productToScanText,
  type ProductLookup,
} from '@/src/lib/productLookup';
import { captureScanLocation, compressScanImage } from '@/src/lib/scanCapture';
import type { LifeScan } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type VisionMode = 'ocr' | 'code' | 'identify' | 'translate';

const MAX_SCANS = 100;

const CODE_TYPES: BarcodeType[] = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'itf14',
  'codabar',
];

async function prepareVisionImage(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  if (manipulated.base64) return manipulated.base64;
  return FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function titleFromText(text: string): string {
  const line =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && l !== '(no text found)') ?? 'Scan';
  return line.length > 48 ? `${line.slice(0, 47)}…` : line;
}

function riskColor(risk: QrAnalysis['risk']) {
  if (risk === 'high') return colors.danger;
  if (risk === 'medium') return colors.warning;
  if (risk === 'low') return colors.success;
  return colors.textMuted;
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const scanLockRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<VisionMode>('ocr');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [qrAnalysis, setQrAnalysis] = useState<QrAnalysis | null>(null);
  const [product, setProduct] = useState<ProductLookup | null>(null);
  const [scanLock, setScanLock] = useState(false);
  const [resultSource, setResultSource] = useState<'camera' | 'library'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const showingResult = Boolean(result || error || qrAnalysis || product);

  // Large finder when idle; compact strip once results land.
  const compactPreviewH = 128;
  const idlePreviewH = Math.round(
    Math.min(
      Math.max(windowHeight - (insets.top + insets.bottom + 250), 340),
      windowHeight * 0.62
    )
  );
  const previewHeight = useSharedValue(idlePreviewH);

  useEffect(() => {
    previewHeight.value = withTiming(showingResult ? compactPreviewH : idlePreviewH, {
      duration: 440,
      easing: Easing.out(Easing.cubic),
    });
  }, [showingResult, idlePreviewH, compactPreviewH, previewHeight]);

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
  };

  const switchMode = (next: VisionMode) => {
    setMode(next);
    reset();
  };

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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = await grabStill();
    setQrAnalysis(analyseQrPayload(payload));
    setProduct(null);
    setResult(null);
    setError(null);
    await finishWithStill(uri);
  };

  const applyProductBarcode = async (code: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanLock(true);
    setBusy(true);
    setError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = await grabStill();
    try {
      const found = await lookupProductBarcode(code);
      setProduct(found);
      setQrAnalysis(null);
      setResult(null);
      if (!found.found) {
        setError(`No product found for ${code}. You can still Save the barcode.`);
      }
      await finishWithStill(uri);
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
    }
  };

  const onBarcodeScanned = (scan: BarcodeScanningResult) => {
    // Only live-scan in Code mode so Scan/Identify/Translate stay shutter-driven.
    if (mode !== 'code' || scanLockRef.current || busy || previewUri) return;
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
    // Fallback: treat unknown payloads as QR/text analysis
    void applyQr(data);
  };

  const analyse = useCallback(
    async (uri: string, nextMode: VisionMode, source: 'camera' | 'library') => {
      if (nextMode === 'code') return;
      setBusy(true);
      setError(null);
      setResult(null);
      setQrAnalysis(null);
      setProduct(null);
      setSavedId(null);
      setPreviewUri(uri);
      setResultSource(source);
      try {
        const base64 = await prepareVisionImage(uri);
        const { reply } = await adminApi.eiVision({
          imageBase64: `data:image/jpeg;base64,${base64}`,
          mode: nextMode === 'ocr' ? 'ocr' : nextMode,
        });
        const cleaned =
          nextMode === 'ocr' ? normalizeOcrText(reply) : reply.trim();
        setResult(cleaned);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Vision failed');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const capture = async () => {
    if (!cameraRef.current || busy || mode === 'code') return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo captured');
      await analyse(photo.uri, mode, 'camera');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture');
    }
  };

  const pickFromLibrary = async () => {
    if (mode === 'code') {
      Alert.alert(
        'Code scan',
        'Point the live camera at a QR or product barcode — it scans automatically.'
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.55,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    await analyse(picked.assets[0].uri, mode, 'library');
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

    setSaving(true);
    setError(null);
    try {
      const dash = await adminApi.lifeDashboard();
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
      const id = `scan_${Date.now()}`;
      const entry: LifeScan = {
        id,
        title: product
          ? product.name.slice(0, 48)
          : qrAnalysis
            ? `QR · ${qrAnalysis.destination.slice(0, 40)}`
            : titleFromText(text),
        text,
        createdAt: new Date().toISOString(),
        source: resultSource,
        mode: product
          ? 'barcode'
          : qrAnalysis
            ? 'qr'
            : mode === 'identify' || mode === 'translate'
              ? mode
              : 'ocr',
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
      const next = [entry, ...existing].slice(0, MAX_SCANS);
      await adminApi.saveLifeDashboard({
        payload: { ...dash.payload, scans: next },
      });
      setSavedId(id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save scan');
    } finally {
      setSaving(false);
    }
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
            Ei uses the camera to scan text, QR codes, product barcodes, identify objects, and
            translate.
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
    mode === 'code'
      ? 'Looking up product…'
      : mode === 'ocr'
        ? 'Scanning text…'
        : mode === 'translate'
          ? 'Reading text…'
          : 'Identifying…';

  const hasResultCard = Boolean(qrAnalysis || product || result);

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 6,
            paddingBottom: Math.max(insets.bottom, 8) + 88,
          },
        ]}
      >
        {/* Header — fixed, always visible */}
        <View style={styles.topRow}>
          <View style={styles.topText}>
            <Text style={styles.title}>Camera</Text>
            <Text style={styles.subtitle}>Text · codes · identify · translate</Text>
          </View>
          <Pressable style={styles.libraryLink} onPress={() => router.push('/tools/scans')}>
            <Ionicons name="folder-open-outline" size={15} color={colors.accentLight} />
            <Text style={styles.libraryLinkText}>Scans</Text>
          </Pressable>
        </View>

        {/* Mode chips — plain row (no horizontal ScrollView) so they never collapse */}
        <View style={styles.modeRow}>
          <ModeChip label="Scan" active={mode === 'ocr'} onPress={() => switchMode('ocr')} />
          <ModeChip label="Code" active={mode === 'code'} onPress={() => switchMode('code')} />
          <ModeChip
            label="Identify"
            active={mode === 'identify'}
            onPress={() => switchMode('identify')}
          />
          <ModeChip
            label="Translate"
            active={mode === 'translate'}
            onPress={() => switchMode('translate')}
          />
        </View>

        {/* Camera / preview — large when idle, animates compact when results appear */}
        <Animated.View style={[styles.previewFrame, previewAnimStyle]}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : showingResult ? (
            <View style={styles.previewPlaceholder}>
              <Ionicons
                name={product ? 'barcode-outline' : qrAnalysis ? 'qr-code-outline' : 'image-outline'}
                size={32}
                color={colors.textMuted}
              />
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={
                mode === 'code' ? { barcodeTypes: CODE_TYPES } : undefined
              }
              onBarcodeScanned={
                mode === 'code' && !scanLock && !previewUri ? onBarcodeScanned : undefined
              }
            />
          )}
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.text} size="large" />
              <Text style={styles.busyText}>{busyLabel}</Text>
            </View>
          ) : null}
          {!showingResult && !busy ? (
            <View style={styles.hintOverlay} pointerEvents="none">
              <Text style={styles.hintPill}>
                {mode === 'code'
                  ? 'Align QR or barcode — toys, TCG, books, food & more'
                  : mode === 'ocr'
                    ? 'Point at text, then tap shutter'
                    : mode === 'translate'
                      ? 'Point at foreign text, then tap shutter'
                      : 'Point at an object, then tap shutter'}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          {showingResult && hasResultCard ? (
            <>
              <Pressable style={styles.actionBtn} onPress={reset} disabled={busy || saving}>
                <Ionicons name="refresh" size={16} color={colors.text} />
                <Text style={styles.actionBtnText}>
                  {mode === 'code' ? 'Scan again' : 'Retake'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, savedId ? styles.saveBtnDone : null]}
                onPress={() => void saveScan()}
                disabled={saving || Boolean(savedId)}
              >
                {saving ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Ionicons
                    name={savedId ? 'checkmark-circle' : 'save-outline'}
                    size={16}
                    color={colors.text}
                  />
                )}
                <Text style={styles.saveBtnText}>{savedId ? 'Saved' : 'Save'}</Text>
              </Pressable>
            </>
          ) : mode === 'code' ? (
            <Text style={styles.liveHint}>Live code scanning — no shutter</Text>
          ) : (
            <>
              <Pressable
                style={styles.actionBtn}
                onPress={() => void pickFromLibrary()}
                disabled={busy}
              >
                <Ionicons name="images-outline" size={16} color={colors.text} />
                <Text style={styles.actionBtnText}>Library</Text>
              </Pressable>
              <Pressable style={styles.shutter} onPress={() => void capture()} disabled={busy}>
                <View style={styles.shutterInner} />
              </Pressable>
              <View style={styles.spacer} />
            </>
          )}
        </View>

        {/* Results — slide in under the compacted camera */}
        {showingResult ? (
          <Animated.View
            entering={FadeInDown.duration(380).delay(80)}
            style={styles.resultShell}
          >
            <ScrollView
              style={styles.resultScroll}
              contentContainerStyle={styles.resultScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
          {error && !product ? (
            <Card style={styles.resultCard}>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}

          {product ? (
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>{productKindLabel(product.kind)}</Text>
                {savedId ? (
                  <Pressable onPress={() => router.push('/tools/scans')}>
                    <Text style={styles.viewScans}>View in Tools →</Text>
                  </Pressable>
                ) : null}
              </View>

              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : null}

              <Text style={styles.productName} selectable>
                {product.name}
              </Text>
              {product.authors ? (
                <Text style={styles.metaText}>Author(s): {product.authors}</Text>
              ) : null}
              {product.brand ? (
                <Text style={styles.metaText}>
                  {product.kind === 'book' || product.kind === 'manga'
                    ? `Publisher: ${product.brand}`
                    : `Brand: ${product.brand}`}
                </Text>
              ) : null}
              {product.quantity ? (
                <Text style={styles.metaText}>
                  {product.kind === 'book' || product.kind === 'manga'
                    ? `Details: ${product.quantity}`
                    : `Size / pack: ${product.quantity}`}
                </Text>
              ) : null}
              <Text style={styles.metaText}>Barcode: {product.barcode}</Text>

              {product.description ? (
                <>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.metaText}>{product.description}</Text>
                </>
              ) : null}

              {product.categories ? (
                <>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <Text style={styles.metaText}>{product.categories}</Text>
                </>
              ) : null}

              {product.kind === 'medicine' ? (
                <>
                  {product.activeIngredients ? (
                    <>
                      <Text style={styles.sectionTitle}>Active ingredients</Text>
                      <Text style={styles.bodyText} selectable>
                        {product.activeIngredients}
                      </Text>
                    </>
                  ) : null}
                  {product.dosageForm ? (
                    <Text style={styles.metaText}>Form: {product.dosageForm}</Text>
                  ) : null}
                  {product.route ? (
                    <Text style={styles.metaText}>Route: {product.route}</Text>
                  ) : null}
                  {product.warnings ? (
                    <Text style={styles.errorText}>{product.warnings}</Text>
                  ) : null}
                </>
              ) : null}

              {(product.nutriscore || product.nova != null) && (
                <View style={styles.badgeRow}>
                  {product.nutriscore ? (
                    <View style={styles.infoBadge}>
                      <Text style={styles.infoBadgeText}>Nutri-Score {product.nutriscore}</Text>
                    </View>
                  ) : null}
                  {product.nova != null ? (
                    <View style={styles.infoBadge}>
                      <Text style={styles.infoBadgeText}>NOVA {product.nova}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {product.allergens ? (
                <>
                  <Text style={styles.sectionTitle}>Allergens</Text>
                  <Text style={styles.metaText}>{product.allergens}</Text>
                </>
              ) : null}

              {product.ingredients ? (
                <>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  <Text style={styles.bodyText} selectable>
                    {product.ingredients}
                  </Text>
                </>
              ) : null}

              {product.nutrition.length ? (
                <>
                  <Text style={styles.sectionTitle}>Nutrition (per 100g)</Text>
                  {product.nutrition.map((row) => (
                    <View key={row.label} style={styles.nutriRow}>
                      <Text style={styles.nutriLabel}>{row.label}</Text>
                      <Text style={styles.nutriValue}>
                        {row.per100g}
                        {row.perServing ? ` · serving ${row.perServing}` : ''}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              {!product.found ? (
                <Text style={styles.errorText}>{error ?? product.summary}</Text>
              ) : (
                <Text style={styles.sourceNote}>
                  Via{' '}
                  {product.source === 'openfoodfacts'
                    ? 'Open Food Facts'
                    : product.source === 'openbeautyfacts'
                      ? 'Open Beauty Facts'
                      : product.source === 'openproductsfacts'
                        ? 'Open Products Facts'
                        : product.source === 'openpetfoodfacts'
                          ? 'Open Pet Food Facts'
                          : product.source === 'upcitemdb'
                            ? 'UPCitemdb'
                            : product.source === 'openfda'
                              ? 'openFDA (NDC)'
                              : product.source === 'openlibrary'
                                ? 'Open Library'
                                : product.source === 'googlebooks'
                                  ? 'Google Books'
                                  : product.source === 'gs1-prefix'
                                    ? 'Manufacturer barcode prefix'
                                    : 'lookup'}
                </Text>
              )}
            </Card>
          ) : null}

          {qrAnalysis ? (
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>QR analysis</Text>
                {savedId ? (
                  <Pressable onPress={() => router.push('/tools/scans')}>
                    <Text style={styles.viewScans}>View in Tools →</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.riskBadge, { borderColor: riskColor(qrAnalysis.risk) }]}>
                <Text style={[styles.riskText, { color: riskColor(qrAnalysis.risk) }]}>
                  {riskLabel(qrAnalysis.risk)}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Destination</Text>
              <Text style={styles.bodyText} selectable>
                {qrAnalysis.destination}
              </Text>

              <Text style={styles.sectionTitle}>Summary</Text>
              <Text style={styles.metaText}>{qrAnalysis.summary}</Text>

              <Text style={styles.sectionTitle}>Brand match</Text>
              <Text style={styles.metaText}>
                {qrAnalysis.officialHints.length
                  ? `Recognized: ${qrAnalysis.officialHints.join(', ')}`
                  : 'No brand match in Ei’s list — common for campaign URLs, and not automatically unsafe.'}
              </Text>

              <Text style={styles.sectionTitle}>Safety notes</Text>
              {qrAnalysis.riskReasons.map((reason) => (
                <Text key={reason} style={styles.bullet}>
                  • {reason}
                </Text>
              ))}

              <Text style={styles.sectionTitle}>Raw payload</Text>
              <Text style={styles.rawText} selectable>
                {qrAnalysis.raw}
              </Text>

              {qrAnalysis.openUrl ? (
                <Pressable style={styles.openBtn} onPress={() => void openLink()}>
                  <Ionicons name="open-outline" size={18} color={colors.text} />
                  <Text style={styles.openBtnText}>Open link</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {result && !qrAnalysis && !product ? (
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>
                  {mode === 'ocr'
                    ? 'OCR text'
                    : mode === 'translate'
                      ? 'Translation'
                      : 'Identification'}
                </Text>
                {savedId ? (
                  <Pressable onPress={() => router.push('/tools/scans')}>
                    <Text style={styles.viewScans}>View in Tools →</Text>
                  </Pressable>
                ) : null}
              </View>
              {mode === 'ocr' ? (
                <Text style={styles.bodyText} selectable>
                  {result}
                </Text>
              ) : (
                <MarkdownText style={styles.bodyText}>{result}</MarkdownText>
              )}
            </Card>
          ) : null}
            </ScrollView>
          </Animated.View>
        ) : (
          <Text style={styles.hint}>
            Choose a mode above. Code looks up QR, barcodes, toys, Pokémon/TCG, books, manga, food,
            meds, and more.
          </Text>
        )}
      </View>
    </GradientBackground>
  );
}

function ModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeChip, active && styles.modeChipActive]}
      hitSlop={4}
    >
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    height: 34,
  },
  modeChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139,92,246,0.22)',
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  modeChipTextActive: {
    color: colors.accentLight,
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
  hintOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: 'center',
  },
  hintPill: {
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    minHeight: 44,
  },
  liveHint: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
  },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.surfaceElevated,
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
  resultShell: {
    flex: 1,
    marginTop: 10,
    minHeight: 0,
  },
  resultScroll: {
    flex: 1,
  },
  resultScrollContent: {
    paddingBottom: 16,
    gap: 10,
  },
  resultCard: {
    gap: 4,
    width: '100%',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  resultLabel: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  viewScans: { color: colors.accentLight, fontSize: 12, fontWeight: '600' },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    backgroundColor: '#111',
    marginBottom: 6,
  },
  productName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 2,
  },
  bodyText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    width: '100%',
  },
  sectionTitle: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  bullet: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  rawText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'SpaceMono',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  infoBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  infoBadgeText: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  nutriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nutriLabel: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  nutriValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sourceNote: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 11,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  openBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  openBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
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
