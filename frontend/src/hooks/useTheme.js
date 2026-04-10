import { useEffect, useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark'
      || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark((d) => !d);

  return { dark, toggle };
}
