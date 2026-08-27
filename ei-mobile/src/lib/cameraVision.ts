import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { BarcodeType } from 'expo-camera';

export type VisionMode = 'ocr' | 'identify' | 'translate';

export const MAX_SCANS = 100;
export const CLASSIFY_MIN = 0.55;

export const CODE_TYPES: BarcodeType[] = [
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

export async function prepareVisionImage(uri: string): Promise<string> {
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

export function titleFromText(text: string): string {
  const line =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && l !== '(no text found)') ?? 'Scan';
  return line.length > 48 ? `${line.slice(0, 47)}…` : line;
}
