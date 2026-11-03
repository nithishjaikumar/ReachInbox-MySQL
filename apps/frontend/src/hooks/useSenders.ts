import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface Sender {
  id: string;
  name: string;
  email: string;
}

export function useSenders() {
  return useQuery({
    queryKey: ['senders'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Sender[] }>(
        '/api/senders'
      );
      return res.data.data;
    },
  });
}

export function useCreateSender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      useEthereal: boolean;
    }) => {
      const res = await api.post('/api/senders', data);
      return res.data;
    },

    onSuccess: () => {
      toast.success('Sender added successfully!');
      queryClient.invalidateQueries({
        queryKey: ['senders'],
      });
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 'Failed to add sender'
      );
    },
  });
}