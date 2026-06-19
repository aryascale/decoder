import React, { useState, useEffect } from 'react';
import { Layout, Button, Input } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;

const LS_CHECKPOINT_AUTH = "imr_checkpoint_authed";
const CHECKPOINT_USER = "checkpoint@lumpat.com";
const CHECKPOINT_PASS = "checkpoint123";

function loadAuth() {
  return localStorage.getItem(LS_CHECKPOINT_AUTH) === "true";
}

function saveAuth(v: boolean) {
  localStorage.setItem(LS_CHECKPOINT_AUTH, v ? "true" : "false");
}

export default function CheckpointLayout() {
  const [authed, setAuthed] = useState(loadAuth());
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Show login form if not authenticated
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#111] rounded-2xl shadow-lg p-8 border border-[#333]">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="p-2 bg-[#FFD700] rounded-none text-black font-extrabold font-mono text-xl tracking-tighter">
                LUMPAT
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-2">Lumpat Chrono Time IZT</h2>
            <p className="text-center text-gray-400 mb-8">Masuk untuk akses panel pencatat waktu BIB</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (user === CHECKPOINT_USER && pass === CHECKPOINT_PASS) {
                saveAuth(true);
                setAuthed(true);
                setError("");
              } else {
                setError("Username atau password checkpoint salah!");
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="checkpoint-email" className="block text-sm font-medium text-gray-300 mb-2">Email Checkpoint</label>
                <Input
                  id="checkpoint-email"
                  type="email"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="checkpoint@lumpat.com"
                  size="large"
                  className="bg-black text-white border-[#333] hover:border-[#FFD700] focus:border-[#FFD700]"
                  required
                />
              </div>

              <div>
                <label htmlFor="checkpoint-password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <Input.Password
                  id="checkpoint-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  size="large"
                  className="bg-black text-white border-[#333] hover:border-[#FFD700] focus:border-[#FFD700]"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full bg-[#FFD700] text-black font-bold hover:bg-white border-none rounded-none"
              >
                Login Checkpoint
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-white text-sm transition"
              >
                ← Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    saveAuth(false);
    setAuthed(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-sans text-[#E0E0E0]">
      {/* Top Header overlay for logout within checkpoint layout */}
      <div className="bg-[#111] border-b border-[#222] py-2 px-6 flex justify-end items-center sticky top-0 z-50">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition"
        >
          <LogoutOutlined />
          LOGOUT
        </button>
      </div>
      <Outlet />
    </div>
  );
}
