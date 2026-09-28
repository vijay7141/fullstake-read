import { NextRequest } from 'next/server';
import { crmEventBus, CrmEventPayload } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const initial = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initial));

      const onEvent = (payload: CrmEventPayload) => {
        if (isClosed) return;
        try {
          const data = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          console.error('[SSE Error sending payload]', e);
        }
      };

      crmEventBus.on('crm_update', onEvent);

      const interval = setInterval(() => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        crmEventBus.off('crm_update', onEvent);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
