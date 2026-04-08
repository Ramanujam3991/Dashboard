import React, { useState, useEffect, useRef } from 'react';

interface TickDisplay {
  ticker: string;
  price: number;
  changePct: number;
  timestamp: string;
}

const App = () => {
  const [ticks, setTicks] = useState<TickDisplay[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up subscription on unmount.
    return () => {
      if (subIdRef.current !== null) {
        window.api.unsubscribe(subIdRef.current);
      }
    };
  }, []);

  const handleSubscribe = () => {
    const id = window.api.subscribe<TickDisplay>(
      'stream:priceTicks',
      { ticker: 'AAPL' },
      (event) => {
        setTicks((prev) => [event.data, ...prev].slice(0, 10));
      },
    );
    subIdRef.current = id;
    setIsSubscribed(true);
  };

  const handleUnsubscribe = () => {
    if (subIdRef.current !== null) {
      window.api.unsubscribe(subIdRef.current);
      subIdRef.current = null;
    }
    setIsSubscribed(false);
    setTicks([]);
  };

  const handleInvokeTest = async () => {
    const res = await window.api.invoke('security:getOverview', {
      ticker: 'AAPL',
      clientId: 'test',
    });
    console.log('IPC invoke res:', res);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-lg space-y-md">
      <div className="p-xl bg-surface border border-border rounded-lg shadow-lg w-full max-w-xl">
        <h1 className="text-3xl font-sans font-bold text-text-primary mb-sm">
          IPC / Streaming Test
        </h1>

        {/* T1.2 invoke test */}
        <div className="mb-md">
          <button
            onClick={handleInvokeTest}
            className="px-lg py-sm bg-accent text-text-primary rounded-md hover:bg-surface-hover transition-colors"
          >
            Test invoke (T1.2)
          </button>
        </div>

        {/* T1.3 streaming test */}
        <div className="flex space-x-md mb-md">
          <button
            onClick={handleSubscribe}
            disabled={isSubscribed}
            className="px-lg py-sm bg-semantic-up text-background rounded-md font-bold disabled:opacity-40 transition-opacity"
          >
            Subscribe stream
          </button>
          <button
            onClick={handleUnsubscribe}
            disabled={!isSubscribed}
            className="px-lg py-sm bg-semantic-down text-text-primary rounded-md font-bold disabled:opacity-40 transition-opacity"
          >
            Unsubscribe
          </button>
        </div>

        {/* Live tick feed */}
        <div className="space-y-sm">
          {ticks.length === 0 && (
            <p className="text-text-muted font-mono text-sm">
              No ticks yet — click Subscribe stream
            </p>
          )}
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-sm bg-background rounded-md border border-border"
            >
              <span className="font-mono text-text-secondary text-sm">
                {tick.timestamp.slice(11, 19)}
              </span>
              <span className="font-mono text-text-primary font-bold">{tick.ticker}</span>
              <span className="font-mono text-text-primary">${tick.price.toFixed(2)}</span>
              <span
                className={`font-mono font-bold text-sm ${tick.changePct >= 0 ? 'text-semantic-up' : 'text-semantic-down'}`}
              >
                {tick.changePct >= 0 ? '+' : ''}
                {tick.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
