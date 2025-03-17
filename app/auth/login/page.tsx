'use client';

import { useSession, signIn } from 'next-auth/react';

export default function Login(): JSX.Element {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      {!session && !loading && (
        <button
          onClick={() => signIn('google')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Login with Google
        </button>
      )}
      {session && (
        <p className="text-gray-700">
          You are logged in as {session.user?.email}
        </p>
      )}
    </div>
  );
}

