
import React from 'react';
import { Users, BarChart, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';
import Card from './ui/Card.tsx';
import { AuditLog } from '../types.ts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';


const StatCard: React.FC<{icon: React.ReactNode, title: string, value: string, color: string}> = ({icon, title, value, color}) => (
    <Card>
        <div className="flex items-center">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div className="ml-4">
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    </Card>
);


const HomeDashboard: React.FC<{ auditLogs: AuditLog[], studentCount: number }> = ({ auditLogs, studentCount }) => {
    const recentLogs = auditLogs.slice(0, 5);
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Utama</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Users className="h-6 w-6 text-white"/>} title="Total Siswa Aktif" value={studentCount.toString()} color="bg-blue-500" />
                <StatCard icon={<CheckCircle className="h-6 w-6 text-white"/>} title="Kehadiran Hari Ini" value="95.2%" color="bg-primary-500" />
                <StatCard icon={<BarChart className="h-6 w-6 text-white"/>} title="Rata-rata Bulanan" value="92.8%" color="bg-yellow-500" />
                <StatCard icon={<AlertTriangle className="h-6 w-6 text-white"/>} title="Perlu Perhatian" value="3 Siswa" color="bg-red-500" />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Ringkasan Kehadiran Mingguan</h2>
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">Grafik Kehadiran Akan Tampil di Sini</p>
                    </div>
                </Card>
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Notifikasi</h2>
                         <ul className="space-y-3">
                            <li className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-1 flex-shrink-0"/>
                                <div>
                                    <p className="font-semibold text-red-800">Kehadiran Rendah</p>
                                    <p className="text-sm text-red-700">Siswa <span className="font-bold">Budi Santoso</span> memiliki kehadiran di bawah 75% minggu ini.</p>
                                </div>
                            </li>
                            <li className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                 <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-1 flex-shrink-0"/>
                                 <div>
                                    <p className="font-semibold text-yellow-800">Laporan Belum Lengkap</p>
                                    <p className="text-sm text-yellow-700">Laporan bulan Mei belum diselesaikan.</p>
                                 </div>
                            </li>
                         </ul>
                    </Card>
                     <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h2>
                        <ul className="space-y-4">
                            {recentLogs.map(log => (
                                <li key={log.id} className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <span className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                            <UserCheck className="h-5 w-5 text-primary-600" />
                                        </span>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">{log.user_name}</span> {log.details.toLowerCase()}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {format(log.timestamp, "d MMM, HH:mm", { locale: id })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HomeDashboard;