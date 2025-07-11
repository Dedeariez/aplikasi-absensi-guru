
import React, { useState, useEffect } from 'react';
import { Profile, UserRole, AuditLogEntry } from '../types';
import { supabase, getAuditLogs } from '../services/supabaseService';
import TeacherView from './TeacherView';
import ParentView from './ParentView';
import Spinner from './ui/Spinner';

interface DashboardProps {
  profile: Profile;
}

const ActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const initialLogs = await getAuditLogs();
            setLogs(initialLogs);
            setLoading(false);
        };
        fetchLogs();

        const channel = supabase
            .channel('public:audit_log')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
                console.log('New log received!', payload);
                setLogs(currentLogs => [payload.new as AuditLogEntry, ...currentLogs]);
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Connected to audit log channel!');
                }
                 if (err) {
                    console.error('Subscription error:', err);
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, []);

    const timeSince = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " tahun lalu";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " bulan lalu";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " hari lalu";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " jam lalu";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " menit lalu";
        return Math.floor(seconds) + " detik lalu";
    }

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Log Aktivitas Terbaru</h3>
            <div className="bg-white rounded-xl shadow-md p-4 max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-40"><Spinner /></div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {logs.map((log) => (
                            <li key={log.id} className="py-3">
                                <p className="text-sm text-gray-700">{log.action}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Oleh <span className="font-medium">{log.user_email}</span> - {timeSince(log.created_at)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ profile }) => {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Selamat Datang, {profile.full_name}!</h1>
          <p className="text-lg text-gray-600">Anda login sebagai <span className="font-semibold capitalize">{profile.role}</span>.</p>
        </div>

        {profile.role === UserRole.TEACHER && <TeacherView profile={profile} />}
        {profile.role === UserRole.PARENT && <ParentView profile={profile} />}
        
        <ActivityLog />
      </div>
    </div>
  );
};

export default Dashboard;