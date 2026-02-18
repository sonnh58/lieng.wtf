import { useState, useEffect } from 'react';
import { useConnectionStore } from './stores/connection-store';
import { useRoomStore } from './stores/room-store';
import { PlayerNameInput } from './components/player-name-input';
import { LobbyPage } from './pages/lobby-page';
import { GamePage } from './pages/game-page';
import { DashboardPage } from './pages/dashboard-page';
import { useSocketEvents } from './hooks/use-socket-events';
import { ConnectionStatus } from './components/connection-status';
import { ToastContainer } from './components/toast-notification';

type AppView = 'name-input' | 'lobby' | 'game' | 'dashboard';

export function App() {
  const { playerName } = useConnectionStore();
  const { currentRoom } = useRoomStore();
  const [view, setView] = useState<AppView>('name-input');

  // Initialize socket events
  useSocketEvents();

  // Determine initial view based on stored player name and URL hash
  useEffect(() => {
    if (playerName) {
      // If URL has #/room/xxx, go straight to lobby (room:join will navigate to game)
      setView('lobby');
    } else {
      setView('name-input');
    }
  }, [playerName]);

  // Navigate to game when room joined
  useEffect(() => {
    if (currentRoom && view === 'lobby') {
      setView('game');
    } else if (!currentRoom && view === 'game') {
      setView('lobby');
    }
  }, [currentRoom, view]);

  const handleNameSet = () => {
    setView('lobby');
  };

  const handleEnterGame = () => {
    setView('game');
  };

  const handleLeaveGame = () => {
    setView('lobby');
  };

  let content: React.ReactNode;
  switch (view) {
    case 'name-input':
      content = <PlayerNameInput onNameSet={handleNameSet} />;
      break;
    case 'lobby':
      content = <LobbyPage onEnterGame={handleEnterGame} onDashboard={() => setView('dashboard')} />;
      break;
    case 'game':
      content = <GamePage onLeaveGame={handleLeaveGame} />;
      break;
    case 'dashboard':
      content = <DashboardPage onBack={() => setView('lobby')} />;
      break;
    default:
      content = null;
  }

  return (
    <>
      <ConnectionStatus />
      {content}
      <ToastContainer />
    </>
  );
}
