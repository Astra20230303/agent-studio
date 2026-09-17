import { useEffect, useState } from 'react';
import type { DesktopState } from './domain';

export function useTheme(preference: DesktopState['theme']): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const changed = () => setSystemDark(media.matches);
    changed(); media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  const theme = preference === 'system' ? systemDark ? 'dark' : 'light' : preference;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  return theme;
}
