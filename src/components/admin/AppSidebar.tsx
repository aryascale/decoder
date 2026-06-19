import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import SidebarItem from './SidebarItem';
import HomeIcon from './icons/HomeIcon';
import EventsIcon from './icons/EventsIcon';

const { Sider } = Layout;

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
}

interface AppSidebarProps {
  collapsed: boolean;
  menuItems: MenuItem[];
  onItemClick?: () => void;
}

export default function AppSidebar({ collapsed, menuItems, onItemClick }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Determine active key based on current location
  const activeKey = useMemo(() => {
    const pathname = location.pathname;

    // Sort menu items by path length (longest first) for better matching
    const sortedItems = [...menuItems].sort((a, b) => {
      const aLen = a.path?.length || 0;
      const bLen = b.path?.length || 0;
      return bLen - aLen;
    });

    // Try exact match first
    for (const item of sortedItems) {
      if (item.path === pathname) {
        return item.key;
      }
    }

    // Try prefix match for routes with parameters
    for (const item of sortedItems) {
      if (item.path && pathname.startsWith(item.path) && pathname.length > item.path.length) {
        return item.key;
      }
    }

    return '';
  }, [location.pathname, menuItems]);

  const handleMenuClick = ({ key }: { key: string }) => {
    const findMenuItem = (items: MenuItem[], targetKey: string): MenuItem | null => {
      for (const item of items) {
        if (item.key === targetKey) return item;
        if (item.children) {
          const found = findMenuItem(item.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };

    const item = findMenuItem(menuItems, key);

    if (item?.children) {
      // Toggle submenu
      setOpenKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    } else if (item?.path) {
      // Navigate to path
      navigate(item.path);
      // Notify parent (for mobile menu close)
      onItemClick?.();
    }
  };

  const renderMenuItems = (items: MenuItem[], isSubmenu = false): React.ReactNode => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = activeKey === item.key;
      const isOpen = openKeys.includes(item.key);

      return (
        <div key={item.key}>
          <SidebarItem
            label={item.label}
            icon={item.icon}
            active={isActive}
            collapsed={collapsed}
            onClick={() => handleMenuClick({ key: item.key })}
            hasChildren={hasChildren}
            isOpen={isOpen}
            isSubmenu={isSubmenu}
          />

          {/* Render submenu children */}
          {hasChildren && !collapsed && isOpen && item.children && (
            <div className="ml-4 mt-1 space-y-1">
              {renderMenuItems(item.children, true)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      width={256}
      trigger={null}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
      }}
      className="transition-all duration-300"
    >
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <img
            src="/Assets/logo2.gif"
            alt="Lumpat Logo"
            className={`flex-shrink-0 object-contain ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
          />
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-gray-900">Lumpat</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="p-4 space-y-1">
        {renderMenuItems(menuItems)}
      </div>
    </Sider>
  );
}

// Export default menu items for use in AdminLayout
export const defaultMenuItems: MenuItem[] = [
  {
    key: 'events',
    label: 'Events',
    icon: <EventsIcon />,
    path: '/admin/events',
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    path: '/admin/payments',
  },
  {
    key: 'tickets',
    label: 'Tickets',
    icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    path: '/admin/tickets',
  },
  {
    key: 'activity-logs',
    label: 'Activity Logs',
    icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    path: '/admin/activity-logs',
  },
];
