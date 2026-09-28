import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalContacts,
      totalConversations,
      unreadConversationsAggregate,
      messagesTodayCount,
      incomingTodayCount,
      outgoingTodayCount,
      activeAccount,
      totalNumbersCount,
      recentConversations,
      recentWebhookEvents,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.conversation.aggregate({
        _sum: { unreadCount: true },
      }),
      prisma.message.count({
        where: { timestamp: { gte: startOfToday } },
      }),
      prisma.message.count({
        where: { timestamp: { gte: startOfToday }, direction: 'INCOMING' },
      }),
      prisma.message.count({
        where: { timestamp: { gte: startOfToday }, direction: 'OUTGOING' },
      }),
      prisma.whatsAppAccount.findFirst({
        where: { isDefault: true, status: 'ACTIVE' },
      }) || prisma.whatsAppAccount.findFirst({
        where: { status: 'ACTIVE' },
      }),
      prisma.whatsAppAccount.count(),
      prisma.conversation.findMany({
        take: 5,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          customer: true,
          whatsappAccount: {
            select: { displayName: true, phoneNumber: true },
          },
        },
      }),
      prisma.webhookEvent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalUnreadMessages = unreadConversationsAggregate._sum.unreadCount || 0;

    const hasLiveToken = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      !process.env.WHATSAPP_ACCESS_TOKEN.startsWith('EAAG...') &&
      process.env.WHATSAPP_ACCESS_TOKEN.length > 20
    );

    return NextResponse.json({
      stats: {
        totalContacts,
        totalConversations,
        totalUnreadMessages,
        messagesToday: {
          total: messagesTodayCount,
          incoming: incomingTodayCount,
          outgoing: outgoingTodayCount,
        },
      },
      connectedNumber: activeAccount
        ? {
            id: activeAccount.id,
            displayName: activeAccount.displayName,
            phoneNumber: activeAccount.phoneNumber,
            phoneNumberId: activeAccount.phoneNumberId,
            qualityRating: activeAccount.qualityRating || 'GREEN',
            status: activeAccount.status,
            isDefault: activeAccount.isDefault,
          }
        : null,
      totalNumbersCount,
      systemStatus: {
        metaApiMode: hasLiveToken ? 'LIVE_CLOUD_API' : 'SIMULATION_READY',
        webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'Configured' : 'Default',
        hasAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
        webhookEventsLogged: recentWebhookEvents.length,
      },
      recentConversations,
      recentWebhookEvents,
    });
  } catch (error: unknown) {
    console.error('[Dashboard Stats Error]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
