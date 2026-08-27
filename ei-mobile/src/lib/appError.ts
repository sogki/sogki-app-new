import { Alert } from 'react-native';

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

/** Consistent Alert for tool / mutation failures. */
export function showAppError(title: string, err: unknown, fallback?: string) {
  Alert.alert(title, errorMessage(err, fallback));
}
