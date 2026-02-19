import { useEffect } from 'react';
import { connectSocket, getSocket } from '../socket/socket-client';
import { useConnectionStore } from '../stores/connection-store';
import { useRoomStore } from '../stores/room-store';
import { useGameStore } from '../stores/game-store';
import type { Room, Card, GamePhase } from '@lieng/shared';
import { showToast } from '../components/toast-notification';

export function useSocketEvents() {
  const { playerName, playerId: storedPlayerId, setConnected, setPlayerId, setPlayerName, setAvatarUrl, setIsAdmin } = useConnectionStore();
  const { setRooms, setCurrentRoom, updateRoom } = useRoomStore();
  const { setMyCards, updateGameState, setPhase, setCurrentTurn, setTurnTimeLeft, setShowdownResults, setWalletStats } = useGameStore();

  useEffect(() => {
    if (!playerName) return;

    let socket = getSocket();
    if (!socket) {
      socket = connectSocket();
    }

    const onConnect = () => {
      setConnected(true);

      // Try reconnect if we have a stored playerId (e.g. after F5)
      if (storedPlayerId) {
        socket!.emit('player:reconnect', { playerId: storedPlayerId });
      } else {
        // Fresh connection — register name
        socket!.emit('player:set-name', { name: playerName });

        // Auto-rejoin room from URL hash (e.g. #/room/abc123)
        const pendingRoomId = useRoomStore.getState().pendingRoomId;
        if (pendingRoomId) {
          socket!.emit('room:join', { roomId: pendingRoomId });
        }
      }
      socket!.emit('room:list');
      socket!.emit('wallet:get');
    };

    const onDisconnect = () => setConnected(false);

    // Reconnect failed — server expired our session, re-register
    const onReconnectFailed = () => {
      const { authMethod } = useConnectionStore.getState();
      useConnectionStore.getState().setPlayerId('');
      useConnectionStore.getState().setIsAdmin(false);
      useRoomStore.getState().setCurrentRoom(null);

      if (authMethod === 'google') {
        // Google users must re-authenticate to restore isAdmin and identity
        // Clear auth so login screen shows again
        useConnectionStore.getState().clearConnection();
        useConnectionStore.getState().setPlayerName('');
      } else {
        socket!.emit('player:set-name', { name: playerName });

        // Try rejoin room from URL hash after re-registering
        const pendingRoomId = useRoomStore.getState().pendingRoomId;
        if (pendingRoomId) {
          socket!.emit('room:join', { roomId: pendingRoomId });
        }
      }
    };

    // Room events
    const onRoomList = (rooms: Room[]) => setRooms(rooms);
    const onRoomJoined = ({ room, playerId }: { room: Room; playerId: string }) => {
      setPlayerId(playerId);
      setCurrentRoom(room);
      // Clear stale game state from previous room
      useGameStore.getState().setShowdownResults(null);
      useGameStore.getState().setMyCards([]);
      useGameStore.getState().setPhase('WAITING' as any);
    };
    const onRoomUpdated = ({ room }: { room: Room }) => updateRoom(room);
    const onRoomError = ({ message }: { message: string }) => showToast(message, 'error');

    // Game events
    const onDealt = ({ cards }: { cards: Card[] }) => {
      setMyCards(cards);
      // New round started — clear showdown results
      useGameStore.getState().setShowdownResults(null);
    };
    const onGameState = (state: any) => {
      updateGameState({
        phase: state.phase,
        pot: state.pot,
        currentBet: state.currentBet,
        players: state.players,
        dealerIndex: state.dealerIndex,
        round: state.round,
      });
      if (state.currentPlayer) setCurrentTurn(state.currentPlayer);
    };
    const onGamePhase = ({ phase }: { phase: GamePhase }) => {
      setPhase(phase);
      if (phase === 'DEALING') {
        // New round starting — hide showdown results immediately
        useGameStore.getState().setShowdownResults(null);
      }
      if (phase === 'WAITING') {
        setMyCards([]);
      }
    };
    const onTurn = ({ playerId, timeLeft }: { playerId: string; timeLeft: number }) => {
      setCurrentTurn(playerId);
      setTurnTimeLeft(timeLeft);
    };
    const onShowdown = ({ winners, hands, payouts }: any) => {
      setShowdownResults({ winners, hands, payouts });
    };
    const onGameError = ({ message }: { message: string }) => showToast(message, 'error');

    // Ready state
    const onReadyState = ({ readyPlayers }: { readyPlayers: string[] }) => {
      useGameStore.getState().setReadyPlayers(readyPlayers);
    };

    // Wallet events
    const onWalletStats = (stats: any) => setWalletStats({
      walletBalance: stats.walletBalance ?? stats.balance ?? 0,
      totalLoaned: stats.totalLoaned ?? 0,
      totalPnl: stats.totalPnl ?? 0,
    });
    const onChipsGranted = ({ amount }: { amount: number }) => showToast(`Da nhan ${amount} chips!`, 'success');

    // Google auth events
    const onGoogleAuthSuccess = ({ playerId, name, avatarUrl, isAdmin }: { playerId: string; name: string; avatarUrl: string | null; isAdmin?: boolean }) => {
      setPlayerId(playerId);
      setPlayerName(name);
      if (avatarUrl) setAvatarUrl(avatarUrl);
      if (isAdmin) setIsAdmin(true);

      // Fetch wallet balance
      socket!.emit('wallet:get');

      // Auto-rejoin room from URL hash
      const pendingRoomId = useRoomStore.getState().pendingRoomId;
      if (pendingRoomId) {
        socket!.emit('room:join', { roomId: pendingRoomId });
      }
    };
    const onGoogleAuthError = ({ message }: { message: string }) => showToast(message, 'error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('player:reconnect-failed', onReconnectFailed);
    socket.on('room:list', onRoomList);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:error', onRoomError);
    socket.on('game:dealt', onDealt);
    socket.on('game:state', onGameState);
    socket.on('game:phase', onGamePhase);
    socket.on('game:turn', onTurn);
    socket.on('game:showdown', onShowdown);
    socket.on('game:error', onGameError);
    socket.on('player:google-auth-success', onGoogleAuthSuccess);
    socket.on('player:google-auth-error', onGoogleAuthError);
    socket.on('wallet:stats', onWalletStats);
    socket.on('wallet:chips-granted', onChipsGranted);
    socket.on('game:ready-state', onReadyState);

    // If already connected, trigger manually
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket!.off('connect', onConnect);
      socket!.off('disconnect', onDisconnect);
      socket!.off('player:reconnect-failed', onReconnectFailed);
      socket!.off('room:list', onRoomList);
      socket!.off('room:joined', onRoomJoined);
      socket!.off('room:updated', onRoomUpdated);
      socket!.off('room:error', onRoomError);
      socket!.off('game:dealt', onDealt);
      socket!.off('game:state', onGameState);
      socket!.off('game:phase', onGamePhase);
      socket!.off('game:turn', onTurn);
      socket!.off('game:showdown', onShowdown);
      socket!.off('game:error', onGameError);
      socket!.off('player:google-auth-success', onGoogleAuthSuccess);
      socket!.off('player:google-auth-error', onGoogleAuthError);
      socket!.off('wallet:stats', onWalletStats);
      socket!.off('wallet:chips-granted', onChipsGranted);
      socket!.off('game:ready-state', onReadyState);
    };
  }, [playerName]);
}
