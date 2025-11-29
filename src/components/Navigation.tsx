import React from 'react';
import { NavigationTab, User } from '../types';
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Archive,
  LogOut
} from 'lucide-react';

interface NavigationProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  user: User;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
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
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <nav className="md:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Staff Management</h1>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs font-medium text-gray-800">
                {user.role === 'admin' ? 'Admin' : user.location}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Navigation;