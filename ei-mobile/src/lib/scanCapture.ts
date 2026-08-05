import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

/** Small JPEG data URL suitable for embedding in life_dashboard payload. */
export async function compressScanImage(uri: string): Promise<string | null> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 720 } }],
      {
        compress: 0.42,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    const b64 =
      manipulated.base64 ??
      (await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      }));
    if (!b64) return null;
    // Soft cap ~180KB base64 to avoid blowing up dashboard JSON.
    if (b64.length > 240_000) return null;
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

export type ScanLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

export async function captureScanLocation(): Promise<ScanLocation | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;
    let label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = places[0];
      if (p) {
        const city = p.city || p.subregion || p.district || p.name;
        const area = p.region || p.country;
        if (city && area && city !== area) label = `${city}, ${area}`;
        else if (city) label = city;
        else if (area) label = area;
      }
    } catch {
      /* keep coords label */
    }
    return { label, latitude, longitude };
  } catch {
    return null;
  }
}
