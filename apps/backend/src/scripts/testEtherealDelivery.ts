/**
 * Script to verify Ethereal SMTP delivery works end-to-end.
 * 
 * Usage: npx tsx src/scripts/testEtherealDelivery.ts
 * 
 * This script:
 * 1. Finds the existing Ethereal sender in the DB
 * 2. Decrypts their SMTP credentials
 * 3. Schedules a test email TO the sender's own Ethereal inbox (required by Ethereal)
 * 4. Prints the Ethereal preview URL
 */

import prisma from '../config/database';
import { decrypt, isEncryptedPayload } from '../utils/encryption';
import { createEtherealTransport, sendEmail } from '../integrations/email/ethereal';

async function main() {
  console.log('🔍 Finding Ethereal sender...');

  const sender = await prisma.sender.findFirst({
    where: {
      etherealHost: 'smtp.ethereal.email',
    },
  });

  if (!sender || !sender.etherealUser || !sender.etherealPass) {
    console.error('❌ No Ethereal sender found. Create one via POST /api/senders with { useEthereal: true }');
    process.exit(1);
  }

  const decryptIfEncrypted = (value: string) =>
    isEncryptedPayload(value) ? decrypt(value) : value;

  const user = decryptIfEncrypted(sender.etherealUser);
  const pass = decryptIfEncrypted(sender.etherealPass);

  console.log(`✅ Found sender: ${sender.name} <${sender.email}>`);
  console.log(`📧 Ethereal inbox: ${user}`);
  console.log('📤 Sending test email...');

  const transport = createEtherealTransport({
    host: sender.etherealHost!,
    port: sender.etherealPort!,
    user,
    pass,
  });

  const result = await sendEmail(transport, {
    from: `"${sender.name}" <${sender.email}>`,
    to: user, // Send to own Ethereal inbox — only valid recipient for Ethereal
    subject: `[ReachInbox Test] Email Delivery Verified - ${new Date().toISOString()}`,
    html: `
      <h2>✅ ReachInbox Ethereal SMTP Delivery Test</h2>
      <p>This email was sent using Nodemailer + Ethereal SMTP.</p>
      <p><strong>Sender:</strong> ${sender.name} &lt;${sender.email}&gt;</p>
      <p><strong>Recipient:</strong> ${user}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p>This confirms the email delivery pipeline is working correctly.</p>
    `,
  });

  console.log('\n✅ EMAIL DELIVERED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log(`📬 Ethereal Preview URL: ${result.previewUrl}`);
  console.log('='.repeat(60));
  console.log('\nOpen the URL above in your browser to see the delivered email.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
