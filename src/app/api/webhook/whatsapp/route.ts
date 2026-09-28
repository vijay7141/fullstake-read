import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastCrmEvent } from '@/lib/realtime';
import { cleanPhoneNumber, formatPhoneNumber, verifyWebhookSignature } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'whatsapp_crm_verify_token_secure_2025';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook Verification] Verified successfully with Meta challenge.');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Webhook Verification Failed] Token mismatch or invalid mode', { mode, token });
  return NextResponse.json({ error: 'Forbidden: Verification token mismatch' }, { status: 403 });
}

interface MetaWebhookContact {
  profile?: { name?: string };
  wa_id?: string;
}

interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  image?: { caption?: string };
  document?: { filename?: string };
  video?: { caption?: string };
  location?: { latitude?: number; longitude?: number };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}

interface MetaWebhookStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code?: number; message?: string; title?: string }>;
}

interface MetaWebhookChangeValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: MetaWebhookContact[];
  messages?: MetaWebhookMessage[];
  statuses?: MetaWebhookStatus[];
}

interface MetaWebhookChange {
  field: string;
  value?: MetaWebhookChangeValue;
}

interface MetaWebhookEntry {
  id?: string;
  changes?: MetaWebhookChange[];
}

interface MetaWebhookPayload {
  object?: string;
  entry?: MetaWebhookEntry[];
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';

    if (appSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.warn('[Webhook Signature Invalid] Dropping untrusted request');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    let payload: MetaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored', reason: 'Not a whatsapp_business_account' }, { status: 200 });
    }

    const entries = payload.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value) continue;

        const metadata = value.metadata;
        const receivingPhoneNumberId = metadata?.phone_number_id;

        let whatsappAccount = null;
        if (receivingPhoneNumberId) {
          whatsappAccount = await prisma.whatsAppAccount.findUnique({
            where: { phoneNumberId: receivingPhoneNumberId },
          });
        }
        if (!whatsappAccount) {
          whatsappAccount = (await prisma.whatsAppAccount.findFirst({
            where: { isDefault: true, status: 'ACTIVE' },
          })) || (await prisma.whatsAppAccount.findFirst({
            where: { status: 'ACTIVE' },
          }));
        }

        if (value.messages && Array.isArray(value.messages)) {
          const contacts = value.contacts || [];

          for (const msg of value.messages) {
            const rawSenderPhone = msg.from;
            const cleanPhone = cleanPhoneNumber(rawSenderPhone);
            const wamid = msg.id;

            try {
              await prisma.webhookEvent.upsert({
                where: { eventId: wamid },
                update: { processed: true },
                create: {
                  eventId: wamid,
                  eventType: 'messages',
                  payload: JSON.stringify(msg),
                  processed: true,
                },
              });
            } catch {
              // ignore duplicate key
            }

            const existingMsg = await prisma.message.findUnique({
              where: { whatsappMessageId: wamid },
            });
            if (existingMsg) {
              console.log(`[Webhook] Duplicate message ${wamid} ignored.`);
              continue;
            }

            const contactInfo = contacts.find((c: MetaWebhookContact) => c.wa_id === rawSenderPhone || c.wa_id === cleanPhone);
            const profileName = contactInfo?.profile?.name;

            const customer = await prisma.customer.upsert({
              where: { phoneNumber: cleanPhone },
              update: {
                ...(profileName ? { name: profileName } : {}),
                formattedPhone: formatPhoneNumber(cleanPhone),
              },
              create: {
                phoneNumber: cleanPhone,
                name: profileName || `Customer +${cleanPhone}`,
                formattedPhone: formatPhoneNumber(cleanPhone),
              },
            });

            let conversation = await prisma.conversation.findFirst({
              where: { customerId: customer.id },
            });

            let messageText = '';
            let mediaUrl: string | undefined;
            let mediaType: string | undefined;

            if (msg.type === 'text') {
              messageText = msg.text?.body || '';
            } else if (msg.type === 'image') {
              messageText = msg.image?.caption || '[Image received]';
              mediaType = 'image';
            } else if (msg.type === 'document') {
              messageText = msg.document?.filename || '[Document received]';
              mediaType = 'document';
            } else if (msg.type === 'audio' || msg.type === 'voice') {
              messageText = '[Voice message received]';
              mediaType = 'audio';
            } else if (msg.type === 'video') {
              messageText = msg.video?.caption || '[Video received]';
              mediaType = 'video';
            } else if (msg.type === 'location') {
              messageText = `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
              mediaType = 'location';
            } else if (msg.type === 'interactive') {
              messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive Response]';
            } else {
              messageText = `[${msg.type || 'message'}]`;
            }

            const msgTimestamp = msg.timestamp
              ? new Date(Number(msg.timestamp) * 1000)
              : new Date();

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  customerId: customer.id,
                  whatsappAccountId: whatsappAccount?.id,
                  status: 'OPEN',
                  lastMessageAt: msgTimestamp,
                  lastMessageText: messageText,
                  lastMessageDirection: 'INCOMING',
                  unreadCount: 1,
                },
              });
            } else {
              conversation = await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  ...(whatsappAccount?.id ? { whatsappAccount: { connect: { id: whatsappAccount.id } } } : {}),
                  lastMessageAt: msgTimestamp,
                  lastMessageText: messageText,
                  lastMessageDirection: 'INCOMING',
                  unreadCount: { increment: 1 },
                  status: 'OPEN',
                },
              });
            }

            const newMessage = await prisma.message.create({
              data: {
                whatsappMessageId: wamid,
                conversationId: conversation.id,
                customerId: customer.id,
                whatsappAccountId: whatsappAccount?.id,
                direction: 'INCOMING',
                messageType: msg.type || 'text',
                text: messageText,
                mediaUrl,
                mediaType,
                status: 'DELIVERED',
                timestamp: msgTimestamp,
                rawPayload: JSON.stringify(msg),
              },
            });

            console.log(`[Webhook] Stored incoming message from ${cleanPhone}: "${messageText}"`);

            broadcastCrmEvent('message:new', {
              message: newMessage,
              conversation,
              customer,
              whatsappAccount,
            });
            broadcastCrmEvent('conversation:update', {
              conversationId: conversation.id,
              customerId: customer.id,
              lastMessageText: messageText,
              lastMessageAt: msgTimestamp,
              unreadCount: conversation.unreadCount,
            });
          }
        }

        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const metaStatus = (statusObj.status || '').toLowerCase();
            const errors = statusObj.errors;

            let mappedStatus = 'SENT';
            if (metaStatus === 'sent') mappedStatus = 'SENT';
            else if (metaStatus === 'delivered') mappedStatus = 'DELIVERED';
            else if (metaStatus === 'read') mappedStatus = 'READ';
            else if (metaStatus === 'failed') mappedStatus = 'FAILED';

            const targetMsg = await prisma.message.findUnique({
              where: { whatsappMessageId: wamid },
            });

            if (targetMsg) {
              const updated = await prisma.message.update({
                where: { id: targetMsg.id },
                data: {
                  status: mappedStatus,
                  errorCode: errors?.[0]?.code ? String(errors[0].code) : undefined,
                  errorMessage: errors?.[0]?.message || errors?.[0]?.title || undefined,
                },
              });

              console.log(`[Webhook] Updated status for message ${wamid} to ${mappedStatus}`);

              broadcastCrmEvent('message:status', {
                messageId: updated.id,
                whatsappMessageId: wamid,
                conversationId: updated.conversationId,
                status: mappedStatus,
                errorCode: updated.errorCode,
                errorMessage: updated.errorMessage,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Webhook Processing Error]', error);
    const msg = error instanceof Error ? error.message : 'Unknown webhook error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
