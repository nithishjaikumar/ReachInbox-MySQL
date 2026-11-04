import { env } from '../../config/env';

type EmailOptions = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

export const sendResendEmail = async (mailOptions: EmailOptions) => {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mailOptions),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || `Resend API error: ${response.status}`
    );
  }

  return {
    info: result,
    previewUrl: null,
  };
};