import nodemailer from 'nodemailer';
import { env } from '../../config/env';

export const createEtherealTransport = (config?: { host: string, port: number, user: string, pass: string }) => {
  return nodemailer.createTransport({
    host: config?.host || env.ETHEREAL_HOST,
    port: config?.port || env.ETHEREAL_PORT,
    secure: false,
    auth: {
      user: config?.user || env.ETHEREAL_USER,
      pass: config?.pass || env.ETHEREAL_PASSWORD,
    },
  });
};

export const sendEmail = async (transport: nodemailer.Transporter, mailOptions: { from: string, to: string, subject: string, html: string }) => {
  const info = await transport.sendMail(mailOptions);
  return {
    info,
    previewUrl: nodemailer.getTestMessageUrl(info) as string | null,
  };
};
