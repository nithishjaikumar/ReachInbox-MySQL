import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface Sender {
  id: string;
  name: string;
  email: string;
}

export interface Campaign {
  id: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  totalRecipients: number;
}

export interface Email {
  id: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'scheduled' | 'sent' | 'failed' | 'processing' | 'cancelled';
  scheduledAt: string;
  sentAt?: string | null;
  attempts: number;
  bullJobId?: string | null;
  idempotencyKey: string;
  errorMessage?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
  campaign?: Campaign;
}

export function useScheduledEmails(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['emails', 'scheduled', page, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Email[]; total: number }>(
        `/api/emails/scheduled?page=${page}&limit=${limit}`
      );
      return res.data;
    },
  });
}

export function useSentEmails(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['emails', 'sent', page, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Email[]; total: number }>(
        `/api/emails/sent?page=${page}&limit=${limit}`
      );
      return res.data;
    },
  });
}

export function useSearchEmails(query: string, status?: string) {
  return useQuery({
    queryKey: ['emails', 'search', query, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (status) params.set('status', status);
      const res = await api.get<{ success: boolean; data: Email[]; total: number }>(
        `/api/emails/search?${params.toString()}`
      );
      return res.data;
    },
    enabled: (query?.length || 0) > 0 || !!status,
  });
}

export function useEmailDetail(id: string) {
  return useQuery({
    queryKey: ['emails', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Email }>(`/api/emails/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useScheduleEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      senderId: string;
      recipients: string[];
      subject: string;
      body: string;
      startTime: string;
      delayBetweenEmails: number;
      hourlyLimit: number;
    }) => {
      const res = await api.post('/api/emails/schedule', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Emails scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to schedule emails');
    }
  });
}

export function useCancelEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/emails/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Email cancelled');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: () => {
      toast.error('Failed to cancel email');
    }
  });
}
