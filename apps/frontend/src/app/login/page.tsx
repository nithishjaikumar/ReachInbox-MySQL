'use client';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${apiUrl.replace(/\/$/, '')}/api/auth/google`;
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-[400px] border border-gray-200 rounded-xl p-8 bg-white shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to ReachInbox</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to manage your email campaigns.</p>
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-md py-3 font-medium transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="w-5 h-5" />
          Continue with Google
        </button>
        <p className="text-xs text-center text-gray-500 mt-5">
          Google OAuth must be configured by the application administrator before sign-in is available.
        </p>
      </section>
    </main>
  );
}
