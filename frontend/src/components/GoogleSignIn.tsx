import { useEffect, useRef, useState } from 'react';
import { googleClientId } from '../lib/google';

type GoogleAccounts = { id: {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
} };
declare global { interface Window { google?: { accounts: GoogleAccounts } } }

export default function GoogleSignIn({ onCredential, disabled }: { onCredential: (credential: string) => void; disabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  callback.current = onCredential;

  useEffect(() => {
    if (!host.current) return;
    let disposed = false;
    let renderedWidth = 0;
    const render = () => {
      if (disposed || !host.current || !window.google) return;
      const width = Math.floor(Math.min(host.current.clientWidth, 400));
      if (width < 1 || width === renderedWidth) return;
      renderedWidth = width;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: (response) => callback.current(response.credential) });
      host.current.replaceChildren();
      window.google.accounts.id.renderButton(host.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width });
    };
    const observer = new ResizeObserver(render);
    observer.observe(host.current);
    if (window.google) render();
    else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = render;
      script.onerror = () => setFailed(true);
      document.head.appendChild(script);
    }
    return () => { disposed = true; observer.disconnect(); };
  }, []);

  return <div className={`min-w-0 w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
    <div ref={host} className="flex min-h-11 w-full min-w-0 justify-center overflow-hidden" />
    {failed && <p className="mt-2 text-center text-sm text-rose-700">Google sign-in could not load. Please try again.</p>}
  </div>;
}
