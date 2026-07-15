import React, { useState, useEffect } from 'react';
import { Layout, Button, Dropdown, Avatar, Input } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined, CloseOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar, { defaultMenuItems } from './AppSidebar';

const { Header, Content } = Layout;

const LS_AUTH = "imr_admin_authed";
const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || "";
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || "";

function loadAuth() {
  return localStorage.getItem(LS_AUTH) === "true";
}

function saveAuth(v: boolean) {
  localStorage.setItem(LS_AUTH, v ? "true" : "false");
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authed, setAuthed] = useState(loadAuth());
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authed) {
      // Stay on login screen
    }
  }, [authed]);

  // Responsive behavior - detect mobile and collapse sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setMobileMenuOpen(false);
      } else {
        setCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    // Listen for resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      saveAuth(true);
      setAuthed(true);
      setError("");
    } else {
      setError("Username atau password salah!");
    }
  };

  const handleLogout = () => {
    saveAuth(false);
    setAuthed(false);
    setUser("");
    setPass("");
    navigate('/leaderboard');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  // Show login form if not authenticated
  if (!authed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img src="/Assets/logo2.gif" alt="Logo" className="h-20 w-auto object-contain" />
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Admin Login</h2>
            <p className="text-center text-gray-600 mb-8">Silakan login untuk akses admin panel</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  id="admin-email"
                  type="email"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="admin@example.com"
                  size="large"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Input.Password
                  id="admin-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  size="large"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Login
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/leaderboard')}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                ← Kembali ke Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle sidebar item click on mobile (close menu)
  const handleMobileNavigation = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Only render when: desktop OR (mobile AND menu open) */}
      {(!isMobile || mobileMenuOpen) && (
        <div className={`
          ${isMobile ? 'fixed z-50' : ''}
        `}>
          <AppSidebar
            collapsed={isMobile ? false : collapsed}
            menuItems={defaultMenuItems}
            onItemClick={handleMobileNavigation}
          />
          {/* Mobile close button */}
          {isMobile && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-2 z-50"
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                color: '#666',
              }}
            />
          )}
        </div>
      )}

      {/* Main Content */}
      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 256),
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Menu/Collapse Button */}
          <Button
            type="text"
            icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={isMobile ? toggleMobileMenu : () => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 48,
              height: 48,
            }}
          />

          {/* Mobile: Show logo in header */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <img
                src="/Assets/logo.png"
                alt="Logo"
                className="h-8 w-auto object-contain"
              />
              <span className="font-semibold text-gray-900">Admin</span>
            </div>
          )}

          {/* User Menu */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar size="default" icon={<UserOutlined />} className="bg-red-500" />
              <span className="text-gray-700 font-medium hidden sm:block">Admin</span>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: isMobile ? '12px 12px 0' : '24px 24px 0',
            padding: isMobile ? 12 : 24,
            minHeight: 280,
            background: '#f0f2f5',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
