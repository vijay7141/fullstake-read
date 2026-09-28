import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting WhatsApp CRM database seed...');

  // 1. Seed Admin User
  const passwordHash = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      name: 'CRM Administrator',
      role: 'ADMIN',
    },
    create: {
      email: 'admin@example.com',
      name: 'CRM Administrator',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created/updated:', admin.email);

  // 2. Seed WhatsApp Accounts (Demonstrating multiple numbers and replacement)
  // Old Support Line (e.g., deprecated or replaced number)
  const oldAccount = await prisma.whatsAppAccount.upsert({
    where: { phoneNumberId: 'meta_phone_old_9111' },
    update: {},
    create: {
      displayName: 'Old Support Line (Replaced)',
      phoneNumber: '+91 11 1111 1111',
      phoneNumberId: 'meta_phone_old_9111',
      businessAccountId: 'meta_waba_101',
      status: 'INACTIVE',
      isDefault: false,
      qualityRating: 'GREEN',
    },
  });

  // Current Active WhatsApp Number
  const primaryAccount = await prisma.whatsAppAccount.upsert({
    where: { phoneNumberId: 'meta_phone_primary_555' },
    update: { isDefault: true, status: 'ACTIVE' },
    create: {
      displayName: 'Primary Business Line',
      phoneNumber: '+1 (555) 019-2834',
      phoneNumberId: 'meta_phone_primary_555',
      businessAccountId: 'meta_waba_101',
      status: 'ACTIVE',
      isDefault: true,
      qualityRating: 'GREEN',
    },
  });

  // New Support Line
  const newAccount = await prisma.whatsAppAccount.upsert({
    where: { phoneNumberId: 'meta_phone_new_9122' },
    update: {},
    create: {
      displayName: 'New Support Desk',
      phoneNumber: '+91 22 2222 2222',
      phoneNumberId: 'meta_phone_new_9122',
      businessAccountId: 'meta_waba_101',
      status: 'ACTIVE',
      isDefault: false,
      qualityRating: 'GREEN',
    },
  });
  console.log('✅ WhatsApp Accounts seeded (Primary, Old line, New line)');

  // 3. Seed Customers & Conversations
  // Customer 1: Rahul Sharma (demonstrates history preservation across number replacement)
  const rahul = await prisma.customer.upsert({
    where: { phoneNumber: '919876543210' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      phoneNumber: '919876543210',
      formattedPhone: '+91 98765 43210',
      notes: 'Interested in annual enterprise plan with multi-agent support.',
      tags: 'Enterprise, Qualified Lead',
    },
  });

  const rahulConv = await prisma.conversation.upsert({
    where: { id: 'conv-rahul-sharma' },
    update: {
      whatsappAccountId: newAccount.id, // currently connected to new line
      lastMessageText: 'Sure, I will help you with that.',
      lastMessageDirection: 'OUTGOING',
      unreadCount: 0,
    },
    create: {
      id: 'conv-rahul-sharma',
      customerId: rahul.id,
      whatsappAccountId: newAccount.id,
      status: 'OPEN',
      lastMessageText: 'Sure, I will help you with that.',
      lastMessageDirection: 'OUTGOING',
      unreadCount: 0,
    },
  });

  // Check if messages already exist
  const existingRahulMsgs = await prisma.message.count({
    where: { conversationId: rahulConv.id },
  });

  if (existingRahulMsgs === 0) {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Old messages sent via OLD WhatsApp Account (+91 11 1111 1111)
    await prisma.message.createMany({
      data: [
        {
          whatsappMessageId: 'wamid.HBgLMTEwMDAwMDAwMQ==',
          conversationId: rahulConv.id,
          customerId: rahul.id,
          whatsappAccountId: oldAccount.id, // linked to old number
          direction: 'INCOMING',
          messageType: 'text',
          text: 'Hello',
          status: 'READ',
          timestamp: twoDaysAgo,
        },
        {
          whatsappMessageId: 'wamid.HBgLMTEwMDAwMDAwMg==',
          conversationId: rahulConv.id,
          customerId: rahul.id,
          whatsappAccountId: oldAccount.id,
          direction: 'OUTGOING',
          messageType: 'text',
          text: 'Hi Rahul, how can I help you?',
          status: 'READ',
          timestamp: new Date(twoDaysAgo.getTime() + 5 * 60 * 1000),
        },
        // New messages sent via NEW WhatsApp Account (+91 22 2222 2222)
        {
          whatsappMessageId: 'wamid.HBgLMTEwMDAwMDAwMw==',
          conversationId: rahulConv.id,
          customerId: rahul.id,
          whatsappAccountId: newAccount.id, // linked to new number
          direction: 'INCOMING',
          messageType: 'text',
          text: 'I want to know the price.',
          status: 'READ',
          timestamp: tenMinAgo,
        },
        {
          whatsappMessageId: 'wamid.HBgLMTEwMDAwMDAwNA==',
          conversationId: rahulConv.id,
          customerId: rahul.id,
          whatsappAccountId: newAccount.id,
          direction: 'OUTGOING',
          messageType: 'text',
          text: 'Sure, I will help you with that.',
          status: 'DELIVERED',
          timestamp: twoMinAgo,
        },
      ],
    });
  }

  // Customer 2: Sarah Jenkins (Active customer with unread message)
  const sarah = await prisma.customer.upsert({
    where: { phoneNumber: '14155552671' },
    update: {},
    create: {
      name: 'Sarah Jenkins',
      phoneNumber: '14155552671',
      formattedPhone: '+1 (415) 555-2671',
      notes: 'Requested product catalog for summer collection.',
      tags: 'VIP, Retail',
    },
  });

  const sarahConv = await prisma.conversation.upsert({
    where: { id: 'conv-sarah-jenkins' },
    update: {
      whatsappAccountId: primaryAccount.id,
      lastMessageText: 'Can you confirm if expedited shipping is available to California?',
      lastMessageDirection: 'INCOMING',
      unreadCount: 1,
    },
    create: {
      id: 'conv-sarah-jenkins',
      customerId: sarah.id,
      whatsappAccountId: primaryAccount.id,
      status: 'OPEN',
      lastMessageText: 'Can you confirm if expedited shipping is available to California?',
      lastMessageDirection: 'INCOMING',
      unreadCount: 1,
    },
  });

  const existingSarahMsgs = await prisma.message.count({
    where: { conversationId: sarahConv.id },
  });

  if (existingSarahMsgs === 0) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.message.create({
      data: {
        whatsappMessageId: 'wamid.HBgLMjIwMDAwMDAwMQ==',
        conversationId: sarahConv.id,
        customerId: sarah.id,
        whatsappAccountId: primaryAccount.id,
        direction: 'INCOMING',
        messageType: 'text',
        text: 'Can you confirm if expedited shipping is available to California?',
        status: 'DELIVERED',
        timestamp: fiveMinAgo,
      },
    });
  }

  // Customer 3: Alex Rivera
  const alex = await prisma.customer.upsert({
    where: { phoneNumber: '447911123456' },
    update: {},
    create: {
      name: 'Alex Rivera',
      phoneNumber: '447911123456',
      formattedPhone: '+44 7911 123456',
      notes: 'API integration developer.',
      tags: 'Developer, Partner',
    },
  });

  const alexConv = await prisma.conversation.upsert({
    where: { id: 'conv-alex-rivera' },
    update: {
      whatsappAccountId: primaryAccount.id,
      lastMessageText: 'Thanks for the API docs, everything is working smoothly!',
      lastMessageDirection: 'INCOMING',
      unreadCount: 0,
    },
    create: {
      id: 'conv-alex-rivera',
      customerId: alex.id,
      whatsappAccountId: primaryAccount.id,
      status: 'RESOLVED',
      lastMessageText: 'Thanks for the API docs, everything is working smoothly!',
      lastMessageDirection: 'INCOMING',
      unreadCount: 0,
    },
  });

  const existingAlexMsgs = await prisma.message.count({
    where: { conversationId: alexConv.id },
  });

  if (existingAlexMsgs === 0) {
    await prisma.message.create({
      data: {
        whatsappMessageId: 'wamid.HBgLMzMwMDAwMDAwMQ==',
        conversationId: alexConv.id,
        customerId: alex.id,
        whatsappAccountId: primaryAccount.id,
        direction: 'INCOMING',
        messageType: 'text',
        text: 'Thanks for the API docs, everything is working smoothly!',
        status: 'READ',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    });
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
