import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<{ user: User }>('/api/auth/me');
      return res.data.user;
    },
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/api/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data,
    error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}