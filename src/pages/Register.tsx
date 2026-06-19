import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { message, Input, Button } from 'antd';
import Navbar from '../components/Navbar';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) return;
    if (password !== confirmPassword) {
      message.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      if (res.ok) {
        message.success('Registered successfully');
        await refreshUser();
        navigate('/');
      } else {
        const data = await res.json();
        message.error(data.error || 'Registration failed');
      }
    } catch (err) {
      message.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const registerWithGoogle = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch('/api/auth-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        });
        if (res.ok) {
          message.success('Registered with Google successfully');
          await refreshUser();
          navigate('/');
        } else {
          const data = await res.json();
          message.error(data.error || 'Google registration failed');
        }
      } catch (err) {
        message.error('An error occurred during Google registration');
      }
    },
    onError: () => message.error('Google Login Failed'),
  });

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-white flex flex-col items-center pt-32 pb-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="w-full max-w-[500px] text-center mb-8">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Create Your Lumpat Account</h1>
        <p className="text-[15px] text-gray-600">
          One Lumpat Account is all you need to access all race events. <br/>
          Already have an account? <Link to="/login" className="text-[#0070c9] hover:underline">Sign In ↗</Link>
        </p>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-[500px]">
        <form onSubmit={handleRegister} className="space-y-6">
          
          <div className="space-y-4">
            <Input 
              size="large"
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="rounded-lg py-3 px-4 border-gray-300 hover:border-gray-400 focus:border-[#0070c9] focus:shadow-none text-[17px]"
            />
            
            <Input 
              size="large"
              placeholder="name@example.com" 
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

            <Input.Password
              size="large"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="rounded-lg py-3 px-4 border-gray-300 hover:border-gray-400 focus:border-[#0070c9] focus:shadow-none text-[17px]"
            />
          </div>

          <div className="pt-6 border-t border-gray-200 mt-8">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className="w-full h-12 bg-[#0070c9] hover:bg-[#005cb2] border-none rounded-lg text-[17px] font-normal shadow-none transition-colors"
            >
              Continue
            </Button>
          </div>

        </form>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-[13px] text-gray-500 mb-4">Or sign up with your provider</p>
          <button
            type="button"
            onClick={() => registerWithGoogle()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
