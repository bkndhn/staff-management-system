import React, { useState } from 'react';
import { NavigationTab, User } from '../types';
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Archive,
  LogOut,
  AlertTriangle
} from 'lucide-react';

interface NavigationProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  user: User;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const getAvailableTabs = () => {
    if (user.role === 'admin') {
      return [
        { id: 'Dashboard' as NavigationTab, label: 'Dashboard', icon: BarChart3 },
        { id: 'Staff Management' as NavigationTab, label: 'Staff', icon: Users },
        { id: 'Attendance' as NavigationTab, label: 'Attendance', icon: Calendar },
        { id: 'Salary Management' as NavigationTab, label: 'Salary', icon: DollarSign },
        { id: 'Part-Time Staff' as NavigationTab, label: 'Part-Time', icon: Clock },
        { id: 'Old Staff Records' as NavigationTab, label: 'Archive', icon: Archive },
      ];
    } else {
      // Manager role - limited access
      return [
        { id: 'Dashboard' as NavigationTab, label: 'Dashboard', icon: BarChart3 },
        { id: 'Attendance' as NavigationTab, label: 'Attendance', icon: Calendar },
        { id: 'Part-Time Staff' as NavigationTab, label: 'Part-Time', icon: Clock },
      ];
    }
  };

  const tabs = getAvailableTabs();

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-50">
        <div className="navigation-container flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Staff Management System</h1>
            <div className="navigation-tabs flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`navigation-tab flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800">
                {user.role === 'admin' ? 'Administrator' : `${user.location} Manager`}
              </div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Top Bar - Enhanced */}
      <nav className="md:hidden sticky top-0 z-50 px-4 py-3"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)'
        }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Staff Management
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-700">
                {user.role === 'admin' ? 'Admin' : user.location}
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="p-2.5 text-gray-500 hover:text-red-500 rounded-xl transition-all duration-200 active:scale-90"
              style={{
                background: 'rgba(239, 68, 68, 0.08)'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Premium Glassmorphism Design */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-padding"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.08)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
        }}
      >
        <div
          className="flex justify-around items-end px-1 pt-2"
          style={{ minHeight: '64px' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center relative px-1 py-2 rounded-2xl transition-all duration-300 flex-1"
                style={{
                  minWidth: '48px',
                  maxWidth: '72px',
                  transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                {/* Active indicator background */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                      animation: 'pulse-glow 2s ease-in-out infinite'
                    }}
                  />
                )}

                {/* Icon container with glow effect */}
                <div
                  className="relative z-10 flex items-center justify-center mb-1"
                  style={{
                    filter: isActive ? 'drop-shadow(0 2px 8px rgba(255, 255, 255, 0.4))' : 'none'
                  }}
                >
                  <Icon
                    size={22}
                    className={`transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    style={{
                      strokeWidth: isActive ? 2.5 : 2
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className={`relative z-10 text-[10px] font-semibold tracking-tight transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  style={{
                    textShadow: isActive ? '0 1px 4px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CSS Animation for active tab glow */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          }
          50% {
            box-shadow: 0 4px 28px rgba(102, 126, 234, 0.6);
          }
        }
      `}</style>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Confirm Logout</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to logout from the Staff Management System?</p>
            <div className="flex gap-3">
              <button
                onClick={handleLogoutCancel}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(Navigation);