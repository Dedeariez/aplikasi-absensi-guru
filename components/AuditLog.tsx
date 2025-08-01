
import React from 'react';
import { AuditLog as AuditLogType } from '../types.ts';
import Card from './ui/Card.tsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface AuditLogProps {
    logs: AuditLogType[];
}

const AuditLog: React.FC<AuditLogProps> = ({ logs }) => {
    const getActionChipColor = (action: string) => {
        switch (action) {
            case 'ABSENSI': return 'bg-blue-100 text-blue-800';
            case 'IMPOR DATA': return 'bg-green-100 text-green-800';
            case 'EDIT SISWA': return 'bg-yellow-100 text-yellow-800';
            case 'TAMBAH SISWA': return 'bg-indigo-100 text-indigo-800';
            case 'HAPUS SISWA': return 'bg-pink-100 text-pink-800';
            case 'PERINGATAN': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Riwayat Aksi (Audit Log)</h1>
            <Card>
                {logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>Belum ada aktivitas yang tercatat.</p>
                    </div>
                ) : (
                <div className="flow-root">
                    <ul role="list" className="-mb-8">
                        {logs.map((log, logIdx) => (
                            <li key={log.id}>
                                <div className="relative pb-8">
                                    {logIdx !== logs.length - 1 ? (
                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                    ) : null}
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center ring-8 ring-white">
                                                <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    <span className="font-medium text-gray-900">{log.user_name || 'Sistem'}</span> - {log.details}
                                                </p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time dateTime={log.timestamp.toISOString()}>
                                                    {format(log.timestamp, "d MMM yyyy, HH:mm", { locale: id })}
                                                </time>
                                                <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionChipColor(log.action)}`}>
                                                    {log.action}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                )}
            </Card>
        </div>
    );
};

export default AuditLog;