import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { MarkdownText } from '@/src/components/ui/MarkdownText';
import { adminApi } from '@/src/lib/adminApi';
import { colors, radius } from '@/src/theme/colors';

type VisionMode = 'identify' | 'translate';

/** Shrink photos so Edge Function + Gemini vision stay under size limits. */
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

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<VisionMode>('identify');
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async (uri: string, nextMode: VisionMode) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setPreviewUri(uri);
    try {
      const base64 = await prepareVisionImage(uri);
      const { reply } = await adminApi.eiVision({
        imageBase64: `data:image/jpeg;base64,${base64}`,
        mode: nextMode,
      });
      setResult(reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vision failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const capture = async () => {
    if (!cameraRef.current || busy) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo captured');
      await analyse(photo.uri, mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture');
    }
  };

  const pickFromLibrary = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.55,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    await analyse(picked.assets[0].uri, mode);
  };

  const reset = () => {
    setPreviewUri(null);
    setResult(null);
    setError(null);
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
            Ei uses the camera to identify objects and translate text in photos.
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

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}>
        <Text style={styles.title}>Camera</Text>
        <Text style={styles.subtitle}>Identify objects · translate text</Text>

        <View style={styles.modeRow}>
          <ModeChip
            label="Identify"
            active={mode === 'identify'}
            onPress={() => setMode('identify')}
          />
          <ModeChip
            label="Translate"
            active={mode === 'translate'}
            onPress={() => setMode('translate')}
          />
        </View>

        <View style={styles.previewFrame}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          )}
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.text} size="large" />
              <Text style={styles.busyText}>
                {mode === 'translate' ? 'Reading text…' : 'Identifying…'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {previewUri ? (
            <Pressable style={styles.secondaryBtn} onPress={reset} disabled={busy}>
              <Ionicons name="refresh" size={18} color={colors.text} />
              <Text style={styles.secondaryText}>Retake</Text>
            </Pressable>
          ) : (
            <>
              <Pressable style={styles.secondaryBtn} onPress={() => void pickFromLibrary()} disabled={busy}>
                <Ionicons name="images-outline" size={18} color={colors.text} />
                <Text style={styles.secondaryText}>Library</Text>
              </Pressable>
              <Pressable style={styles.shutter} onPress={() => void capture()} disabled={busy}>
                <View style={styles.shutterInner} />
              </Pressable>
              <View style={styles.spacer} />
            </>
          )}
        </View>

        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
          {error ? (
            <Card>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}
          {result ? (
            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>
                {mode === 'translate' ? 'Translation' : 'Identification'}
              </Text>
              <MarkdownText style={styles.resultText}>{result}</MarkdownText>
            </Card>
          ) : (
            <Text style={styles.hint}>
              Point at an object or foreign text, then tap the shutter.
            </Text>
          )}
        </ScrollView>
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
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  modeChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: colors.accentLight,
  },
  previewFrame: {
    height: 340,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.border,
  },
  camera: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  busyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    minWidth: 96,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  spacer: { minWidth: 96 },
  resultScroll: { flex: 1, marginTop: 16 },
  resultContent: { paddingBottom: 24, gap: 10 },
  resultCard: { gap: 8 },
  resultLabel: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resultText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  primaryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  ghostBtn: {
    marginTop: 10,
    padding: 10,
  },
  ghostBtnText: {
    color: colors.accentLight,
    fontSize: 13,
  },
});
