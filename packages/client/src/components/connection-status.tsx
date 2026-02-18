import { useConnectionStore } from '../stores/connection-store';

export function ConnectionStatus() {
  const { connected } = useConnectionStore();

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-1.5 text-[10px]">
      <div
        className={`w-2 h-2 rounded-full ${
          connected
            ? 'bg-[--color-success] shadow-[0_0_6px_rgba(34,197,94,0.6)]'
            : 'bg-[--color-accent] shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse'
        }`}
      />
      <span className="text-[--color-text-muted]">
        {connected ? 'Online' : 'Connecting...'}
      </span>
    </div>
  );
}
