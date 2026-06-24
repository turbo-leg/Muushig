import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lobby, type LobbyPlayer } from '../components/Lobby';

const players: LobbyPlayer[] = [
  { id: 'host1', username: 'Golden Falcon', isReady: false },
  { id: 'guest2', username: 'Azure Wolf', isReady: true },
];

function renderLobby(overrides: Partial<React.ComponentProps<typeof Lobby>> = {}) {
  const onReady = vi.fn();
  const onStart = vi.fn();
  render(
    <Lobby
      players={players}
      hostId="host1"
      sessionId="host1"
      maxPlayers={5}
      onReady={onReady}
      onStart={onStart}
      {...overrides}
    />,
  );
  return { onReady, onStart };
}

describe('Lobby', () => {
  test('lists players with host badge and ready state', () => {
    renderLobby();
    expect(screen.getByText('Golden Falcon')).toBeInTheDocument();
    expect(screen.getByText('Azure Wolf')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  test('host start button is disabled until everyone is ready', () => {
    renderLobby(); // host (host1) is not ready
    expect(screen.getByRole('button', { name: /waiting for all ready/i })).toBeDisabled();
  });

  test('host start button enables when all players are ready', () => {
    renderLobby({
      players: players.map((p) => ({ ...p, isReady: true })),
    });
    expect(screen.getByRole('button', { name: /start game/i })).toBeEnabled();
  });

  test('non-host sees a waiting message instead of a start button', () => {
    renderLobby({ sessionId: 'guest2' });
    expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument();
  });

  test('ready button fires onReady', async () => {
    const { onReady } = renderLobby();
    await userEvent.click(screen.getByRole('button', { name: /ready up/i }));
    expect(onReady).toHaveBeenCalledOnce();
  });
});
