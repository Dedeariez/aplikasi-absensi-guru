
import React from 'react';
import { Home, Users, BarChart2, FileText, Settings } from 'lucide-react';

type View = 'dashboard' | 'students' | 'reports' | 'logs' | 'settings';

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'students', label: 'Siswa & Absensi', icon: Users },
        { id: 'reports', label: 'Laporan', icon: BarChart2 },
        { id: 'logs', label: 'Riwayat Aksi', icon: FileText },
        { id: 'settings', label: 'Pengaturan', icon: Settings },
    ];

    const NavLink: React.FC<{item: typeof navItems[0]}> = ({ item }) => {
        const isActive = currentView === item.id;
        return (
            <li key={item.id}>
                <button
                    onClick={() => setCurrentView(item.id as View)}
                    className={`flex items-center p-3 my-1 rounded-lg w-full text-left transition-colors
                        ${isActive 
                            ? 'bg-primary-600 text-white shadow-md' 
                            : 'text-gray-600 hover:bg-primary-100 hover:text-primary-800'
                        }`}
                >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="font-medium">{item.label}</span>
                </button>
            </li>
        );
    };

    return (
        <div className="w-64 bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-center h-20 border-b">
                <h1 className="text-2xl font-bold text-primary-700">Darul Inayah</h1>
            </div>
            <nav className="flex-1 px-4 py-4">
                <ul>
                    {navItems.map(item => <NavLink key={item.id} item={item} />)}
                </ul>
            </nav>
            <div className="px-4 py-4 border-t">
                <p className="text-xs text-gray-500 text-center">© 2024 Madrasah Aliyah Darul Inayah</p>
            </div>
        </div>
    );
};

export default Sidebar;
