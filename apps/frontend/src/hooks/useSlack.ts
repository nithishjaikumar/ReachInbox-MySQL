import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SlackStatus {
  connected: boolean;
  teamName?: string | null;
}

export function useSlack() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ['slack', 'status'],
    queryFn: async () => {
      const res = await api.get<SlackStatus>('/api/slack/status');
      return res.data;
    },
  });

  const connect = () => {
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    }/api/slack/connect`;
  };

  const disconnect = useMutation({
    mutationFn: () => api.post('/api/slack/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['slack', 'status'],
      });
    },
  });

  return {
    ...status,
    connect,
    disconnect: disconnect.mutate,
    isDisconnecting: disconnect.isPending,
  };
}