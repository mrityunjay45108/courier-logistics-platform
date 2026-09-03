import { EventEmitter } from 'events';

class TrackingEventEmitter extends EventEmitter {}

export const trackingPublisher = new TrackingEventEmitter();
// Increase listener limit for concurrent tracking streams
trackingPublisher.setMaxListeners(100);

export const TRACKING_EVENT = 'tracking:update';
