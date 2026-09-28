import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanPhoneNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, fromPhone, senderName, text, whatsappMessageId, status } = body;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const activeAccount = await prisma.whatsAppAccount.findFirst({
      where: { status: 'ACTIVE' },
    });

    const phoneNumberId = activeAccount?.phoneNumberId || 'meta_phone_primary_555';

    if (action === 'simulate_incoming') {
      const cleanPhone = cleanPhoneNumber(fromPhone || '919876543210');
      const wamid = `wamid.HBgL${Date.now()}SIMULATED${Math.random().toString(36).substring(2, 7)}`;

      const mockMetaPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'meta_entry_simulated',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: activeAccount?.phoneNumber || '+1 555-019-2834',
                    phone_number_id: phoneNumberId,
                  },
                  contacts: [
                    {
                      profile: {
                        name: senderName || 'Test Customer',
                      },
                      wa_id: cleanPhone,
                    },
                  ],
                  messages: [
                    {
                      from: cleanPhone,
                      id: wamid,
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      text: {
                        body: text || 'Hello! Testing the WhatsApp CRM.',
                      },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const webhookRes = await fetch(`${appUrl}/api/webhook/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockMetaPayload),
      });

      const resData = await webhookRes.json();
      return NextResponse.json({
        success: true,
        message: 'Simulated incoming message sent through webhook processor',
        wamid,
        fromPhone: cleanPhone,
        webhookResponse: resData,
      });
    }

    if (action === 'simulate_status') {
      const targetWamid = whatsappMessageId;
      if (!targetWamid) {
        return NextResponse.json({ error: 'whatsappMessageId is required for status simulation' }, { status: 400 });
      }

      const mockStatusPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'meta_status_simulated',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: activeAccount?.phoneNumber || '+1 555-019-2834',
                    phone_number_id: phoneNumberId,
                  },
                  statuses: [
                    {
                      id: targetWamid,
                      status: status || 'read',
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      recipient_id: fromPhone || '919876543210',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const webhookRes = await fetch(`${appUrl}/api/webhook/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockStatusPayload),
      });

      const resData = await webhookRes.json();
      return NextResponse.json({
        success: true,
        message: `Simulated status [${status || 'read'}] processed`,
        webhookResponse: resData,
      });
    }

    return NextResponse.json({ error: 'Unknown simulation action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[Simulator Error]', error);
    const msg = error instanceof Error ? error.message : 'Simulator error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
