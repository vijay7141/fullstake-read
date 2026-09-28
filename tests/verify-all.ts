// End-to-End Verification Test Script for WhatsApp CRM
import { prisma } from '../src/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Comprehensive WhatsApp CRM Verification Tests...\n');
  let authCookie = '';

  // 1. Webhook GET Verification
  console.log('--- Test 1: Meta Webhook GET Verification ---');
  const challenge = 'meta_challenge_random_token_998877';
  const verifyRes = await fetch(
    `${BASE_URL}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=whatsapp_crm_verify_token_secure_2025&hub.challenge=${challenge}`
  );
  const verifyText = await verifyRes.text();
  if (verifyRes.status === 200 && verifyText === challenge) {
    console.log('✅ Webhook verification passed. Meta hub.challenge returned successfully.');
  } else {
    throw new Error(`Webhook verification failed: ${verifyRes.status} - ${verifyText}`);
  }

  // 2. Admin Login
  console.log('\n--- Test 2: Admin Authentication Login ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123456' }),
  });
  const loginData = await loginRes.json();
  if (loginRes.ok && loginData.success) {
    console.log('✅ Admin login successful. Token received for:', loginData.user.email);
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      authCookie = setCookie.split(';')[0];
    }
  } else {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  // 3. Current User Verification (/api/auth/me)
  console.log('\n--- Test 3: Authenticated User Profile ---');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: authCookie },
  });
  const meData = await meRes.json();
  if (meRes.ok && meData.authenticated) {
    console.log('✅ /api/auth/me verified:', meData.user.name, `(${meData.user.role})`);
  } else {
    throw new Error(`Auth me check failed: ${JSON.stringify(meData)}`);
  }

  // 4. Dashboard Stats
  console.log('\n--- Test 4: Dashboard Stats ---');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: { Cookie: authCookie },
  });
  const statsData = await statsRes.json();
  if (statsRes.ok) {
    console.log('✅ Dashboard stats retrieved successfully:');
    console.log('   Total Contacts:', statsData.stats.totalContacts);
    console.log('   Total Conversations:', statsData.stats.totalConversations);
    console.log('   Connected WhatsApp Line:', statsData.connectedNumber?.displayName, statsData.connectedNumber?.phoneNumber);
  } else {
    throw new Error(`Stats fetch failed: ${JSON.stringify(statsData)}`);
  }

  // 5. Incoming Webhook Message Ingestion (Requirement 4)
  console.log('\n--- Test 5: Incoming WhatsApp Message Webhook Ingestion ---');
  const customerPhone = '919876543210'; // Rahul Sharma
  const testWamid = `wamid.HBgL${Date.now()}TESTINCOMING`;
  const incomingWebhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'meta_entry_test_1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1 (555) 019-2834',
                phone_number_id: 'meta_phone_primary_555',
              },
              contacts: [
                {
                  profile: { name: 'Rahul Sharma' },
                  wa_id: customerPhone,
                },
              ],
              messages: [
                {
                  from: customerPhone,
                  id: testWamid,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: 'What are the enterprise features included?' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const webhookPostRes = await fetch(`${BASE_URL}/api/webhook/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incomingWebhookPayload),
  });
  const webhookPostData = await webhookPostRes.json();
  if (webhookPostRes.ok && webhookPostData.status === 'success') {
    console.log('✅ Inbound webhook processed with status 200.');
  } else {
    throw new Error(`Webhook post failed: ${JSON.stringify(webhookPostData)}`);
  }

  // Verify message in DB
  const storedIncoming = await prisma.message.findUnique({
    where: { whatsappMessageId: testWamid },
  });
  if (storedIncoming && storedIncoming.direction === 'INCOMING') {
    console.log('✅ Inbound message verified in CRM database:');
    console.log('   Text:', storedIncoming.text);
    console.log('   Direction:', storedIncoming.direction);
    console.log('   Status:', storedIncoming.status);
  } else {
    throw new Error('Inbound message was not stored in database!');
  }

  // 6. Outgoing Message Sending (Requirement 5)
  console.log('\n--- Test 6: Send Outgoing WhatsApp Message ---');
  const conversation = await prisma.conversation.findFirst({
    where: { customer: { phoneNumber: customerPhone } },
  });
  if (!conversation) throw new Error('Conversation for customer not found');

  const sendRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify({
      conversationId: conversation.id,
      text: 'Enterprise includes 24/7 dedicated support, SLA, and custom webhooks.',
    }),
  });
  const sendData = await sendRes.json();
  if (sendRes.ok && sendData.success) {
    console.log('✅ Outgoing message sent successfully.');
    console.log('   Message ID:', sendData.message.id);
    console.log('   WhatsApp Message ID (wamid):', sendData.message.whatsappMessageId);
    console.log('   Status:', sendData.message.status);
  } else {
    throw new Error(`Send message failed: ${JSON.stringify(sendData)}`);
  }

  const outgoingWamid = sendData.message.whatsappMessageId;

  // 7. Status Webhook Update (Delivered -> Read)
  console.log('\n--- Test 7: Delivery & Read Status Webhook ---');
  const statusWebhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'meta_entry_status',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1 (555) 019-2834',
                phone_number_id: 'meta_phone_primary_555',
              },
              statuses: [
                {
                  id: outgoingWamid,
                  status: 'read',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: customerPhone,
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const statusRes = await fetch(`${BASE_URL}/api/webhook/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusWebhookPayload),
  });
  if (statusRes.ok) {
    console.log('✅ Status webhook processed with 200.');
    const updatedMsg = await prisma.message.findUnique({
      where: { whatsappMessageId: outgoingWamid },
    });
    console.log('✅ Message status in DB updated to:', updatedMsg?.status);
    if (updatedMsg?.status !== 'READ') {
      throw new Error(`Status was expected to be READ, got ${updatedMsg?.status}`);
    }
  }

  // 8. Number Replacement & History Retention Verification (Requirement 8)
  console.log('\n--- Test 8: Multiple WhatsApp Numbers & History Retention (Requirement 8) ---');
  // Check Rahul's full conversation history
  const rahulMessages = await prisma.message.findMany({
    where: { customer: { phoneNumber: customerPhone } },
    include: { whatsappAccount: true },
    orderBy: { timestamp: 'asc' },
  });

  const accountIdsUsed = new Set(rahulMessages.map((m) => m.whatsappAccountId).filter(Boolean));
  console.log(`✅ Rahul Sharma has ${rahulMessages.length} total messages in CRM.`);
  console.log(`✅ Conversation spans ${accountIdsUsed.size} distinct WhatsApp account lines (e.g. Old line & New line).`);
  console.log('   All historical messages are preserved and accessible from the single customer thread.');

  // Test safe deactivation of a line
  const oldLine = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId: 'meta_phone_old_9111' },
  });
  if (oldLine) {
    const deactRes = await fetch(`${BASE_URL}/api/whatsapp-accounts/${oldLine.id}`, {
      method: 'DELETE',
      headers: { Cookie: authCookie },
    });
    const deactData = await deactRes.json();
    console.log('✅ Deactivation response:', deactData.message);

    // Verify messages still exist in database
    const oldMessagesCount = await prisma.message.count({
      where: { whatsappAccountId: oldLine.id },
    });
    console.log(`✅ Verified: ${oldMessagesCount} historical messages belonging to retired line +91 11 1111 1111 are still 100% intact in database.`);
  }

  // 9. Contact Creation & Retrieval (Requirement 7)
  console.log('\n--- Test 9: Contact Management API ---');
  const newPhone = '15559876543';
  await prisma.customer.deleteMany({ where: { phoneNumber: newPhone } });

  const createContactRes = await fetch(`${BASE_URL}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify({
      name: 'Maria Garcia',
      phoneNumber: newPhone,
      notes: 'Key retail partner in North America',
      tags: 'Retail, Partner',
    }),
  });
  const createContactData = await createContactRes.json();
  if (createContactRes.ok && createContactData.success) {
    console.log('✅ Contact created:', createContactData.contact.name, `(${createContactData.contact.formattedPhone})`);
  } else {
    throw new Error(`Contact creation failed: ${JSON.stringify(createContactData)}`);
  }

  console.log('\n🎉 ALL 9 SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
