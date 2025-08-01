import React from 'react';
import { User } from '../types.ts';
import { Bell, LogOut } from 'lucide-react';
import Button from './ui/Button.tsx';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="flex items-center justify-between h-20 px-6 bg-white border-b">
      <h1 className="text-2xl font-semibold text-gray-800">Selamat Datang, {user.name}</h1>
      <div className="flex items-center space-x-4">
        <button 
          className="p-2 rounded-full hover:bg-gray-100 relative disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled 
          title="Notifikasi akan datang di versi berikutnya"
        >
            <Bell className="h-6 w-6 text-gray-400" />
            {/* <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span> */}
        </button>
        <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
                {user.name.charAt(0)}
            </div>
            <div className="text-right">
                <p className="font-semibold text-gray-700">{user.name}</p>
                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
            </div>
        </div>
        <Button onClick={onLogout} variant="secondary" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
        </Button>
      </div>
    </header>
  );
};

export default Header;