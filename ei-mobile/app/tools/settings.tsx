import { Redirect } from 'expo-router';

/** Legacy route — feature flags now live under Settings → Portfolio feature flags. */
export default function SettingsToolRedirect() {
  return <Redirect href="/tools/feature-flags" />;
}
