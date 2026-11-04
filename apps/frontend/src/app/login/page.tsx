'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleGoogleLogin = () => {
    const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    const base = rawBaseUrl
      ? rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
      : '';
    window.location.href = `${base}/api/auth/google`;
  };

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    switch (error) {
      case 'google_auth_failed':
        return 'Google authentication was not completed. Please try again.';
      case 'access_denied':
        return 'Access was denied. Please approve the permissions to continue.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const errorMessage = getErrorMessage(errorParam);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-[400px] border border-gray-200 rounded-xl p-8 bg-white shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to ReachInbox</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to manage your email campaigns.</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg text-center">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-md py-3 font-medium transition-colors"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>

        <p className="text-xs text-center text-gray-500 mt-5">
          Sign in with your authorized Google account.
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] p-8 text-center text-gray-500">
            Loading...
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
