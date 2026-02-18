import { useState, useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connection-store';
import { getSocket, connectSocket } from '../socket/socket-client';

interface PlayerNameInputProps {
  onNameSet: () => void;
}

declare global {
  interface Window { google?: any; }
}

export function PlayerNameInput({ onNameSet }: PlayerNameInputProps) {
  const { playerName, setPlayerName, setAuthMethod } = useConnectionStore();
  const [name, setName] = useState(playerName || '');
  const [error, setError] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Sign-In button
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return false;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: Math.max(googleBtnRef.current.offsetWidth, 280),
        text: 'signin_with',
        shape: 'pill',
      });
      return true;
    };

    // GSI script may not be loaded yet — poll until both script and ref are ready
    const interval = setInterval(() => {
      if (initGoogle()) clearInterval(interval);
    }, 200);
    // Also try immediately
    initGoogle();
    return () => clearInterval(interval);
  }, []);

  const handleGoogleResponse = (response: { credential: string }) => {
    // Decode JWT payload to get name for immediate UI update
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      setPlayerName(payload.name || payload.email);
      setAuthMethod('google');
    } catch { /* socket handler will set name */ }

    // Send credential to server via socket
    let socket = getSocket();
    if (!socket) {
      socket = connectSocket('google-pending');
    }

    const sendAuth = () => {
      socket!.emit('player:google-auth', { credential: response.credential });
      socket!.emit('room:list');
    };

    if (socket.connected) {
      sendAuth();
    } else {
      socket.once('connect', sendAuth);
    }

    onNameSet();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Vui long nhap ten');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Ten phai co it nhat 2 ky tu');
      return;
    }
    if (trimmedName.length > 20) {
      setError('Ten khong duoc dai qua 20 ky tu');
      return;
    }

    setPlayerName(trimmedName);
    setAuthMethod('name');
    onNameSet();
  };

  const skipLogin = import.meta.env.VITE_SKIP_LOGIN === 'true';

  return (
    <div className="min-h-[100dvh] bg-[--color-bg] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-[--color-gold] text-glow-gold tracking-wider">
            LIENG
          </h1>
          <p className="text-[--color-text-muted] text-sm mt-2 tracking-widest uppercase">
            Ba Cay - Card Game
          </p>
        </div>

        {/* Card */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded-2xl p-6 sm:p-8 glow-primary">
          {/* Name input (shown when VITE_SKIP_LOGIN=true to bypass Google) */}
          {skipLogin && (
            <>
              <form onSubmit={handleSubmit}>
                <label htmlFor="playerName" className="block text-sm font-medium text-[--color-text-muted] mb-2">
                  Ten nguoi choi
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="Nhap ten cua ban"
                  className="w-full px-4 py-3 bg-[--color-bg] text-[--color-text] rounded-xl border border-[--color-border] focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary] text-base transition-colors"
                  autoFocus
                />
                {error && <p className="text-[--color-accent] text-sm mt-2">{error}</p>}

                <button
                  type="submit"
                  className="w-full mt-6 bg-[--color-primary] hover:brightness-110 active:brightness-90 text-white font-bold py-3.5 px-6 rounded-xl transition-all min-h-[48px] cursor-pointer"
                >
                  VAO GAME
                </button>
              </form>

            </>
          )}

          {/* Google Sign-In button (hidden when VITE_SKIP_LOGIN=true) */}
          {!skipLogin && (
            <>
              <div ref={googleBtnRef} className="w-full flex justify-center" />
              <p className="text-[--color-text-muted] text-xs text-center mt-3">
                Dang nhap bang tai khoan @goonus.io
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
