import { EventEmitter } from 'events';

class SiftEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitSyncStarted(data) {
    this.emit('sync:started', { type: 'sync:started', timestamp: new Date().toISOString(), ...data });
  }

  emitSyncCompleted(data) {
    this.emit('sync:completed', { type: 'sync:completed', timestamp: new Date().toISOString(), ...data });
  }

  emitSyncFailed(data) {
    this.emit('sync:failed', { type: 'sync:failed', timestamp: new Date().toISOString(), ...data });
  }

  emitPipelineStarted(data) {
    this.emit('pipeline:started', { type: 'pipeline:started', timestamp: new Date().toISOString(), ...data });
  }

  emitPipelineProgress(data) {
    this.emit('pipeline:progress', { type: 'pipeline:progress', timestamp: new Date().toISOString(), ...data });
  }

  emitPipelineCompleted(data) {
    this.emit('pipeline:completed', { type: 'pipeline:completed', timestamp: new Date().toISOString(), ...data });
  }

  emitSignalsIngested(data) {
    this.emit('signals:ingested', { type: 'signals:ingested', timestamp: new Date().toISOString(), ...data });
  }

  emitReviewCreated(data) {
    this.emit('review:created', { type: 'review:created', timestamp: new Date().toISOString(), ...data });
  }
}

export const eventBus = new SiftEventBus();
