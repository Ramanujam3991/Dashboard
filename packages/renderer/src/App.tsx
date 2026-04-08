import React from 'react';

const App = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-lg space-y-md">
      <div className="p-xl bg-surface border border-border rounded-lg shadow-lg">
        <h1 className="text-3xl font-sans font-bold text-text-primary mb-sm">
          Theme & Tailwind Verification
        </h1>
        <p className="text-text-secondary mb-md">
          This text is{' '}
          <code className="font-mono bg-background px-2 py-1 rounded text-text-muted">
            text-text-secondary
          </code>{' '}
          on a{' '}
          <code className="font-mono bg-background px-2 py-1 rounded text-text-muted">
            bg-surface
          </code>{' '}
          card.
        </p>
        <div className="flex space-x-md">
          <button
            onClick={async () => {
              const res = await window.api.invoke('security:getOverview', {
                ticker: 'AAPL',
              });
              console.log('IPC Res:', res);
            }}
            className="px-lg py-sm bg-accent text-text-primary rounded-md hover:bg-surface-hover transition-colors"
          >
            Test IPC
          </button>
          <div className="px-lg py-sm bg-semantic-up text-background rounded-md font-bold">
            Up Signal
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
