import prisma from '../config/database';
import nodemailer from 'nodemailer';
import { AppError } from '../utils/errors';
import { encrypt } from '../utils/encryption';

const publicSenderSelect = { id: true, name: true, email: true, active: true, createdAt: true } as const;

export class SenderService {
  async getSenders(userId: string) {
    return prisma.sender.findMany({ where: { userId }, select: publicSenderSelect, orderBy: { createdAt: 'desc' } });
  }

  async createSender(userId: string, data: { name: string; email: string; useEthereal?: boolean }) {
    const email = data.email.trim().toLowerCase();
    if (data.useEthereal === false) {
      throw new AppError('Custom SMTP credentials are not supported yet. Enable the Ethereal test sender for demo delivery.', 400);
    }
    const testAccount = await nodemailer.createTestAccount();
    const sender = await prisma.sender.create({
      data: {
        userId,
        name: data.name.trim(),
        email,
        // SMTP credentials are encrypted at rest and never returned by the API.
        etherealUser: encrypt(testAccount.user),
        etherealPass: encrypt(testAccount.pass),
        etherealHost: testAccount.smtp.host,
        etherealPort: testAccount.smtp.port,
      },
      select: publicSenderSelect,
    });
    return sender;
  }

  async getSenderById(id: string, userId: string) {
    const sender = await prisma.sender.findFirst({ where: { id, userId }, select: publicSenderSelect });
    if (!sender) throw new AppError('Sender not found', 404);
    return sender;
  }
}

export const senderService = new SenderService();
