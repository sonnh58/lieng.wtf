import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConnectionState {
  connected: boolean;
  playerId: string | null;
  playerName: string | null;
  avatarUrl: string | null;
  authMethod: 'name' | 'google' | null;
  isAdmin: boolean;
  /** Cached Google JWT for silent re-auth on reconnect */
  googleCredential: string | null;
  setConnected: (connected: boolean) => void;
  setPlayerId: (playerId: string) => void;
  setPlayerName: (name: string) => void;
  setAvatarUrl: (url: string | null) => void;
  setAuthMethod: (method: 'name' | 'google') => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setGoogleCredential: (credential: string | null) => void;
  clearConnection: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      connected: false,
      playerId: null,
      playerName: null,
      avatarUrl: null,
      authMethod: null,
      isAdmin: false,
      googleCredential: null,
      setConnected: (connected) => set({ connected }),
      setPlayerId: (playerId) => set({ playerId }),
      setPlayerName: (name) => set({ playerName: name || null }),
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      setAuthMethod: (method) => set({ authMethod: method }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setGoogleCredential: (credential) => set({ googleCredential: credential }),
      clearConnection: () => set({ connected: false, playerId: null, playerName: null, avatarUrl: null, authMethod: null, isAdmin: false, googleCredential: null }),
    }),
    {
      name: 'lieng-connection',
      partialize: (state) => ({
        playerName: state.playerName,
        playerId: state.playerId,
        avatarUrl: state.avatarUrl,
        authMethod: state.authMethod,
        isAdmin: state.isAdmin,
        googleCredential: state.googleCredential,
      }),
    }
  )
);
