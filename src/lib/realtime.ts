// In-memory Real-time Event Bus for Server-Sent Events (SSE)
import { EventEmitter } from 'events';

// Global singleton event emitter across Next.js reloads
declare global {
  // eslint-disable-next-line no-var
  var crmEventBus: EventEmitter | undefined;
}

export const crmEventBus = globalThis.crmEventBus || new EventEmitter();
crmEventBus.setMaxListeners(100);

if (process.env.NODE_ENV !== 'production') {
  globalThis.crmEventBus = crmEventBus;
}

export type CrmEventType = 
  | 'message:new' 
  | 'message:status' 
  | 'conversation:update' 
  | 'customer:update'
  | 'whatsapp:status';

export interface CrmEventPayload {
  type: CrmEventType;
  data: unknown;
  timestamp: string;
}

export function broadcastCrmEvent(type: CrmEventType, data: unknown) {
  const payload: CrmEventPayload = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
  crmEventBus.emit('crm_update', payload);
}
