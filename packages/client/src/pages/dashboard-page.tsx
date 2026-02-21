import { useState, useEffect } from 'react';
import { useConnectionStore } from '../stores/connection-store';

interface PlayerStats {
  id: string;
  name: string;
  avatar_url: string | null;
  chips: number;
  total_loaned: number;
  total_pnl: number;
  wins: number;
  losses: number;
  created_at: string;
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface DashboardPageProps {
  onBack: () => void;
}

export function DashboardPage({ onBack }: DashboardPageProps) {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useConnectionStore();

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/players`);
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllStats = async () => {
    if (!confirm('Reset tat ca diem va vi cua moi nguoi choi? Hanh dong nay khong the hoan tac!')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/reset-all-stats`, { method: 'POST' });
      if (res.ok) {
        fetchPlayers();
      }
    } catch (err) {
      console.error('Failed to reset stats:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xoa nguoi choi "${name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/players/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlayers((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete player:', err);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalGames = players.reduce((sum, p) => sum + p.wins + p.losses, 0) / 2;

  return (
    <div className="min-h-[100dvh] bg-[--color-bg] p-3 sm:p-5">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded-xl p-4 sm:p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[--color-gold] text-glow-gold">
                Dashboard
              </h1>
              <p className="text-[--color-text-muted] text-xs mt-1">
                {players.length} nguoi choi • ~{Math.round(totalGames)} van
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={handleResetAllStats}
                  className="bg-[--color-accent] hover:brightness-110 active:brightness-90 text-white font-semibold py-2 px-3 rounded-lg transition-all min-h-[40px] cursor-pointer text-sm"
                >
                  Reset tat ca
                </button>
              )}
              <button
                onClick={fetchPlayers}
                className="bg-[--color-surface-light] hover:brightness-125 border border-[--color-border] text-[--color-text] font-semibold py-2 px-3 rounded-lg transition-all min-h-[40px] cursor-pointer text-sm"
              >
                Lam moi
              </button>
              <button
                onClick={onBack}
                className="bg-[--color-surface-light] hover:brightness-125 border border-[--color-border] text-[--color-text-muted] font-semibold py-2 px-3 rounded-lg transition-all min-h-[40px] cursor-pointer text-sm"
              >
                Quay lai
              </button>
            </div>
          </div>
        </div>

        {/* Player table */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[--color-text-muted]">Dang tai...</div>
          ) : players.length === 0 ? (
            <div className="p-8 text-center text-[--color-text-muted]">Chua co nguoi choi nao</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--color-border] text-[--color-text-muted] text-xs uppercase tracking-wider">
                    <th className="text-left p-3 sm:p-4">#</th>
                    <th className="text-left p-3 sm:p-4">Nguoi choi</th>
                    <th className="text-right p-3 sm:p-4">Vi</th>
                    <th className="text-right p-3 sm:p-4">Loi/Lo</th>
                    <th className="text-right p-3 sm:p-4">Da vay</th>
                    <th className="text-right p-3 sm:p-4">Thang</th>
                    <th className="text-right p-3 sm:p-4">Thua</th>
                    <th className="text-right p-3 sm:p-4">Ti le</th>
                    {isAdmin && <th className="text-right p-3 sm:p-4"></th>}
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => {
                    const total = p.wins + p.losses;
                    const winRate = total > 0 ? Math.round((p.wins / total) * 100) : 0;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-light] transition-colors"
                      >
                        <td className="p-3 sm:p-4 text-[--color-text-muted]">{i + 1}</td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[--color-primary] flex items-center justify-center text-white text-xs font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-[--color-text] font-medium truncate max-w-[120px] sm:max-w-none">
                              {p.name}
                            </span>
                          </div>
                        </td>
                        <td className={`p-3 sm:p-4 text-right font-bold ${p.chips < 0 ? 'text-[--color-accent]' : 'text-[--color-gold]'}`}>
                          {p.chips.toLocaleString()}
                        </td>
                        <td className={`p-3 sm:p-4 text-right font-bold ${p.total_pnl >= 0 ? 'text-green-400' : 'text-[--color-accent]'}`}>
                          {p.total_pnl >= 0 ? '+' : ''}{p.total_pnl.toLocaleString()}
                        </td>
                        <td className="p-3 sm:p-4 text-right text-[--color-text]">
                          {p.total_loaned.toLocaleString()}
                        </td>
                        <td className="p-3 sm:p-4 text-right text-green-400">{p.wins}</td>
                        <td className="p-3 sm:p-4 text-right text-[--color-accent]">{p.losses}</td>
                        <td className="p-3 sm:p-4 text-right text-[--color-text-muted]">
                          {winRate}%
                        </td>
                        {isAdmin && (
                          <td className="p-3 sm:p-4 text-right">
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="text-[--color-accent] hover:brightness-125 text-xs font-medium px-2 py-1 rounded border border-[--color-accent]/30 hover:bg-[--color-accent]/10 transition-all cursor-pointer"
                            >
                              Xoa
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
