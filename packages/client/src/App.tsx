import { Background } from './components/Background';
import { Table } from './components/Table';
import { useRoom } from './net/useRoom';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <div className="w-full">{children}</div>
    </main>
  );
}

export default function App() {
  const { status, error, state, sessionId, send } = useRoom();

  return (
    <>
      <Background />
      {status === 'connecting' && (
        <Centered>
          <p className="text-center font-hand text-2xl text-cream/80">Settling in by the fire…</p>
        </Centered>
      )}

      {status === 'error' && (
        <Centered>
          <p className="text-center font-hand text-2xl text-danger">
            {error ?? 'Connection failed'}
          </p>
        </Centered>
      )}

      {status === 'connected' && state && <Table state={state} sessionId={sessionId} send={send} />}
    </>
  );
}
