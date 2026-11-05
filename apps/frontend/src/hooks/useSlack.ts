import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SlackStatus {
  connected: boolean;
  teamName?: string | null;
  configured?: boolean;
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
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
    const prefix = raw ? raw.replace(/\/+$/, '').replace(/\/api$/, '') : '';
    window.location.href = `${prefix}/api/slack/connect`;
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
