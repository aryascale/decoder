import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { message, Input, Button } from 'antd';
import Navbar from '../components/Navbar';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (codeResponse: any) => {
    try {
      const res = await fetch('/api/auth-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeResponse.code }),
      });
      if (res.ok) {
        message.success('Logged in with Google successfully');
        await refreshUser();
        navigate('/');
      } else {
        const data = await res.json();
        message.error(data.error || 'Google login failed');
      }
    } catch (err) {
      message.error('An error occurred during Google login');
    }
  };

  const loginWithGoogle = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: handleGoogleSuccess,
    onError: () => message.error('Google Login Failed'),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        message.success('Logged in successfully');
        await refreshUser();
        navigate('/');
      } else {
        const data = await res.json();
        message.error(data.error || 'Login failed');
      }
    } catch (err) {
      message.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-white flex flex-col items-center pt-32 pb-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="w-full max-w-[400px] text-center mb-8">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Sign In to Lumpat</h1>
        <p className="text-[15px] text-gray-600">
          Sign in to manage your race events. <br/>
        </p>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-[400px]">
        <form onSubmit={handleLogin} className="space-y-6">
          
          <div className="space-y-4">
            <Input 
              size="large"
              placeholder="Email address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-lg py-3 px-4 border-gray-300 hover:border-gray-400 focus:border-[#0070c9] focus:shadow-none text-[17px]"
            />

            <Input.Password
              size="large"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="rounded-lg py-3 px-4 border-gray-300 hover:border-gray-400 focus:border-[#0070c9] focus:shadow-none text-[17px]"
            />
          </div>

          <div className="flex justify-center mt-2">
            <a href="#" className="text-[13px] text-[#0070c9] hover:underline">
              Forgotten your password?
            </a>
          </div>

          <div className="pt-6 border-t border-gray-200 mt-6">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className="w-full h-12 bg-[#0070c9] hover:bg-[#005cb2] border-none rounded-lg text-[17px] font-normal shadow-none transition-colors"
            >
              Sign In
            </Button>
          </div>

        </form>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-[13px] text-gray-500 mb-4">Or sign in with your provider</p>
          <button
            type="button"
            onClick={() => loginWithGoogle()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[13px] text-gray-800">
            Don't have a Lumpat Account? <Link to="/register" className="text-[#0070c9] hover:underline">Create yours now.</Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
