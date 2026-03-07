import { eventBus } from '../events/eventBus.js';

const EVENT_TYPES = [
  'sync:started', 'sync:completed', 'sync:failed',
  'pipeline:started', 'pipeline:progress', 'pipeline:completed',
  'signals:ingested', 'review:created',
];

export function sseHandler(req, res) {
  const orgId = req.orgId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  const listener = (event) => {
    if (event.orgId && event.orgId !== orgId) return;
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  for (const type of EVENT_TYPES) {
    eventBus.on(type, listener);
  }

  req.on('close', () => {
    clearInterval(heartbeat);
    for (const type of EVENT_TYPES) {
      eventBus.off(type, listener);
    }
  });
}
