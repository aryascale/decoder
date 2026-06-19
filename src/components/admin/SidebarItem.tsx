import React from 'react';

interface SidebarItemProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  hasChildren?: boolean;
  isOpen?: boolean;
  isSubmenu?: boolean;
}

export default function SidebarItem({
  label,
  icon,
  active,
  collapsed,
  onClick,
  hasChildren = false,
  isOpen = false,
  isSubmenu = false,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full flex items-center transition-all duration-200
        ${active ? 'bg-[#f9f7fc]' : 'hover:bg-[#f9f7fc]'}
        ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}
        ${isSubmenu ? 'py-2 text-sm' : 'py-3'}
        rounded-r-2xl
      `}
    >
      {/* Active indicator line */}
      <div
        className={`
          absolute left-0 w-[3px] h-8 rounded-full transition-all
          ${active ? 'bg-rose-400' : 'bg-transparent group-hover:bg-rose-400'}
        `}
      />

      {/* Icon */}
      <div className={`${active ? 'text-rose-500' : 'text-gray-600'} flex-shrink-0`}>
        {icon}
      </div>

      {/* Label - hide when collapsed */}
      {!collapsed && (
        <span
          className={`transition-all ${
            active ? 'text-rose-500 font-semibold' : 'text-gray-700'
          }`}
        >
          {label}
        </span>
      )}

      {/* Arrow for submenu - only when not collapsed */}
      {hasChildren && !collapsed && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 ml-auto transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      )}
    </button>
  );
}
