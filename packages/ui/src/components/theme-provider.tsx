'use client';

import * as React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = 'shesa.theme';

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function resolveSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function readStoredTheme(defaultTheme: ThemeMode): ThemeMode {
  if (typeof window === 'undefined') return defaultTheme;
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? defaultTheme;
}

/**
 * Inline pre-hydration script: MUST run in `<head>` before the first paint
 * so the browser sees `<html class="dark">` and never renders the light
 * theme first. Keep in sync with `THEME_STORAGE_KEY` / `resolveSystem` above.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
}) {
  // useState initializer reads storage synchronously so first render already
  // matches what the pre-hydration script wrote to <html>. Prevents the
  // effect-driven applyTheme('light') → applyTheme('dark') round-trip that
  // used to cause the flash on refresh/navigation.
  const [theme, setThemeState] = React.useState<ThemeMode>(() => readStoredTheme(defaultTheme));
  const [resolved, setResolved] = React.useState<'light' | 'dark'>(() =>
    theme === 'system' ? resolveSystem() : theme,
  );

  React.useEffect(() => {
    const r = theme === 'system' ? resolveSystem() : theme;
    setResolved(r);
    applyTheme(r);

    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = media.matches ? 'dark' : 'light';
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = React.useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}
