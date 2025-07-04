
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, View, RecapData, ToastMessage } from './types';
import { endOfWeek } from 'date-fns/endOfWeek';
import { endOfMonth } from 'date-fns/endOfMonth';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { isWithinInterval } from 'date-fns/isWithinInterval';
import { getMonth } from 'date-fns/getMonth';
import { getYear } from 'date-fns/getYear';
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { startOfWeek } from 'date-fns/startOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { subMonths } from 'date-fns/subMonths';
import { id as idLocale } from 'date-fns/locale/id';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';


// Type assertion for global libraries from CDN
declare var XLSX: any;
declare var jspdf: any;

// --- UTILITY & EXPORT FUNCTIONS ---
const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const exportToPdf = (title: string, headers: string[], body: any[][], fileName:string) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.text(title, 14, 20);
    (doc as any).autoTable({
        startY: 25,
        head: [headers],
        body: body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 46, 112] }, // sekolah-950 color
    });
    
    doc.save(`${fileName}.pdf`);
};

const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
        case AttendanceStatus.Hadir: return 'bg-green-100 text-green-800';
        case AttendanceStatus.Sakit: return 'bg-yellow-100 text-yellow-800';
        case AttendanceStatus.Izin: return 'bg-blue-100 text-blue-800';
        case AttendanceStatus.Alfa: return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getPresenceStatus = (percentage: number): { text: string; color: string } => {
    if (percentage > 90) return { text: 'Baik', color: 'text-green-600' };
    if (percentage >= 75) return { text: 'Cukup', color: 'text-yellow-600' };
    return { text: 'Perlu Perhatian', color: 'text-red-600' };
};


// --- ICON COMPONENTS ---
const DashboardIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const StudentsIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AttendanceIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="m9 14 2 2 4-4"/></svg>;
const RecapIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18"/><path d="M18.7 8a6 6 0 0 0-6-6"/><path d="M13 13a6 6 0 0 0 6 6"/></svg>;
const PlusIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const EditIcon = ({ className = 'w-4 h-4' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const TrashIcon = ({ className = 'w-4 h-4' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const UploadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const DownloadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const UserCheckIcon = ({ className = 'w-8 h-8' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>;
const UsersIcon = ({ className = 'w-8 h-8' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const PercentIcon = ({ className = 'w-8 h-8' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const BackIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;
const MenuIcon = ({ className = 'w-6 h-6' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const CloseIcon = ({ className = 'w-6 h-6' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const LogoutIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const SearchIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>;
const MailIcon = ({ className = 'w-16 h-16' }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;


// --- REUSABLE UI COMPONENTS ---
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, isLoading = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; className?: string, type?: 'button' | 'submit', disabled?: boolean, isLoading?: boolean }) => {
    const baseClasses = 'px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2 justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = {
        primary: 'bg-sekolah-600 text-white hover:bg-sekolah-700 focus:ring-sekolah-500',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return (
        <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> : children}
        </button>
    );
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md'
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const StudentForm = ({
  onSubmit,
  onCancel,
  initialData,
  showToast
}: {
  onSubmit: (student: Omit<Student, 'id'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Omit<Student, 'id'>;
  showToast: (type: 'success' | 'error', message: string) => void;
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [studentClass, setStudentClass] = useState(initialData?.class || '');
  const [nis, setNis] = useState(initialData?.nis || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentClass) {
        showToast('error', "Nama dan Kelas wajib diisi.");
        return;
    }
    setIsSubmitting(true);
    await onSubmit({ name, class: studentClass, nis: nis, email: email });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nama Siswa</label>
        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" required disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="class" className="block text-sm font-medium text-slate-700">Kelas</label>
        <input type="text" id="class" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" required disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="nis" className="block text-sm font-medium text-slate-700">NIS (Opsional)</label>
        <input type="text" id="nis" value={nis} onChange={(e) => setNis(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email (Opsional)</label>
        <input type="email" id="email" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" disabled={isSubmitting} />
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <Button onClick={onCancel} variant="secondary" type="button" disabled={isSubmitting}>Batal</Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>Simpan</Button>
      </div>
    </form>
  );
};


// --- VIEW COMPONENTS ---

const QuickStudentUploader = ({ onImport, showToast }: { onImport: (students: Omit<Student, 'id'>[]) => Promise<void>, showToast: (type: 'success' | 'error', message: string) => void }) => {
    const [className, setClassName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!className.trim()) {
            showToast('error', 'Silakan masukkan nama kelas terlebih dahulu.');
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                const studentNames = rows
                    .map(row => row[0])
                    .filter(name => typeof name === 'string' && name.trim() !== '')
                    .map(name => String(name).trim());

                if (studentNames.length === 0) {
                    showToast('error', 'Tidak ada nama siswa yang valid ditemukan di file Excel.');
                    return;
                }

                const newStudents: Omit<Student, 'id'>[] = studentNames.map(name => ({
                    name: name,
                    class: className.trim(),
                    nis: '',
                    email: null,
                }));

                await onImport(newStudents);
                showToast('success', `${newStudents.length} siswa berhasil ditambahkan ke kelas "${className.trim()}".`);
                setClassName('');

            } catch (error: any) {
                console.error("Error processing file for class upload:", error);
                showToast('error', `Gagal memproses file: ${error.message}`);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Card>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Tambah Cepat: Siswa per Kelas</h2>
            <p className="text-sm text-slate-600 mb-4">Unggah file Excel (.xlsx) berisi daftar nama siswa untuk menambahkannya ke kelas tertentu secara massal.</p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="class-name-upload" className="block text-sm font-medium text-slate-700">1. Masukkan Nama Kelas</label>
                    <input 
                        type="text" 
                        id="class-name-upload" 
                        value={className} 
                        onChange={(e) => setClassName(e.target.value)} 
                        placeholder="Contoh: 10-A"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"
                        disabled={isUploading}
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700">2. Unggah File Excel</label>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" id="quick-upload-input" />
                     <Button 
                        onClick={() => fileInputRef.current?.click()}
                        variant="secondary"
                        isLoading={isUploading}
                        disabled={isUploading || !className.trim()}
                        className="w-full mt-1"
                     >
                        <UploadIcon />
                        Pilih File & Unggah
                     </Button>
                </div>
                <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded-md">
                    <span className="font-semibold">Format File:</span> Cukup satu kolom berisi nama lengkap siswa, tanpa judul kolom (header).
                </div>
            </div>
        </Card>
    );
};

const DashboardView = ({
    students,
    attendanceRecords,
    onImport,
    showToast,
}: {
    students: Student[];
    attendanceRecords: AttendanceRecord[];
    onImport: (students: Omit<Student, 'id'>[]) => Promise<void>;
    showToast: (type: 'success' | 'error', message: string) => void;
}) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = attendanceRecords.filter(r => r.date === todayStr);

    const presentStudentIds = new Set(todayRecords
        .filter(r => r.status === AttendanceStatus.Hadir)
        .map(r => r.studentId)
    );
    
    const totalStudents = students.length;
    const presentCount = presentStudentIds.size;
    const presencePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    const recentAbsences = todayRecords
        .filter(r => r.status !== AttendanceStatus.Hadir)
        .map(r => ({
            ...r,
            student: students.find(s => s.id === r.studentId)
        }))
        .filter(r => r.student);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-600">Ringkasan kehadiran untuk hari ini, {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: idLocale })}.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="flex items-center gap-4">
                    <div className="p-3 bg-sekolah-100 rounded-full"><UserCheckIcon className="text-sekolah-600"/></div>
                    <div>
                        <p className="text-slate-500">Siswa Hadir Hari Ini</p>
                        <p className="text-3xl font-bold text-slate-800">{presentCount}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="p-3 bg-sekolah-100 rounded-full"><UsersIcon className="text-sekolah-600"/></div>
                    <div>
                        <p className="text-slate-500">Total Siswa</p>
                        <p className="text-3xl font-bold text-slate-800">{totalStudents}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="p-3 bg-sekolah-100 rounded-full"><PercentIcon className="text-sekolah-600"/></div>
                    <div>
                        <p className="text-slate-500">Persentase Kehadiran</p>
                        <p className="text-3xl font-bold text-slate-800">{presencePercentage}%</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Siswa Tidak Hadir Hari Ini</h2>
                    {recentAbsences.length > 0 ? (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2">Nama</th>
                                        <th className="p-2">Kelas</th>
                                        <th className="p-2">Jam Ke-</th>
                                        <th className="p-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAbsences.map(r => (
                                        <tr key={r.id} className="border-b hover:bg-slate-50">
                                            <td className="p-2 font-medium">{r.student?.name}</td>
                                            <td className="p-2">{r.student?.class}</td>
                                            <td className="p-2">{r.lessonHour}</td>
                                            <td className="p-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(r.status)}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-slate-500">Semua siswa hadir hari ini. Kerja bagus!</p>
                    )}
                </Card>
                <QuickStudentUploader onImport={onImport} showToast={showToast} />
            </div>
        </div>
    );
};

const StudentManagementView = ({
    students,
    onAdd,
    onUpdate,
    onDelete,
    onImport,
    onViewDetail,
    showToast,
}: {
    students: Student[];
    onAdd: (student: Omit<Student, 'id'>) => Promise<void>;
    onUpdate: (student: Student) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onImport: (students: Omit<Student, 'id'>[]) => Promise<void>;
    onViewDetail: (id: number) => void;
    showToast: (type: 'success' | 'error', message: string) => void;
}) => {
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'import' | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [importPreview, setImportPreview] = useState<{ students: Omit<Student, 'id'>[]; fileName: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) {
            return students;
        }
        return students.filter(student =>
            student.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
    }, [students, searchQuery]);

    const handleEditClick = (student: Student) => {
        setSelectedStudent(student);
        setModal('edit');
    };

    const handleDeleteClick = (student: Student) => {
        setSelectedStudent(student);
        setModal('delete');
    };
    
    const closeModals = () => {
        if(isSubmitting) return;
        setModal(null);
        setSelectedStudent(null);
        setImportPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const confirmDelete = async () => {
        if (selectedStudent) {
            setIsSubmitting(true);
            try {
                await onDelete(selectedStudent.id);
                showToast('success', `Siswa "${selectedStudent.name}" berhasil dihapus.`);
                closeModals();
            } catch (err: any) {
                showToast('error', `Gagal menghapus: ${err.message}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                
                const newStudents = json.map((row: any) => ({
                    name: String(row.Nama || '').trim(),
                    class: String(row.Kelas || '').trim(),
                    nis: String(row.NIS || '').trim(),
                    email: String(row.Email || '').trim() || null,
                })).filter(s => s.name && s.class);

                if (newStudents.length > 0) {
                    setImportPreview({ students: newStudents, fileName: file.name });
                    setModal('import');
                } else {
                    showToast('error', 'Tidak ada data siswa yang valid ditemukan di file. Pastikan file Excel memiliki kolom "Nama" dan "Kelas".');
                }
            } catch (error: any) {
                console.error("Error parsing Excel file:", error);
                showToast('error', `Gagal memproses file Excel: ${error.message}`);
            } finally {
               if(fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    const handleConfirmImport = async () => {
        if (importPreview) {
            setIsSubmitting(true);
            try {
                await onImport(importPreview.students);
                showToast('success', `${importPreview.students.length} siswa berhasil diimpor.`);
                closeModals();
            } catch (err: any) {
                showToast('error', `Gagal mengimpor: ${err.message}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Manajemen Siswa</h1>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari nama siswa..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 block px-3 py-2 pl-10 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"
                        />
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" id="student-import-input" />
                    <Button onClick={() => document.getElementById('student-import-input')?.click()} variant="secondary"><UploadIcon /> Impor Excel</Button>
                    <Button onClick={() => setModal('add')}><PlusIcon /> Tambah Siswa</Button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-3 font-semibold">Nama</th>
                                <th className="p-3 font-semibold">Kelas</th>
                                <th className="p-3 font-semibold">NIS</th>
                                <th className="p-3 font-semibold">Email</th>
                                <th className="p-3 font-semibold text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-medium text-sekolah-700 cursor-pointer hover:underline" onClick={() => onViewDetail(student.id)}>{student.name}</td>
                                    <td className="p-3">{student.class}</td>
                                    <td className="p-3">{student.nis || '-'}</td>
                                    <td className="p-3 text-slate-500">{student.email || '-'}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEditClick(student)} className="text-blue-600 hover:text-blue-800 p-1 disabled:opacity-50" disabled={isSubmitting}><EditIcon /></button>
                                            <button onClick={() => handleDeleteClick(student)} className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50" disabled={isSubmitting}><TrashIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-6 text-slate-500">
                                       {searchQuery ? `Tidak ada siswa yang cocok dengan pencarian "${searchQuery}".` : "Belum ada data siswa."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModals} title={modal === 'add' ? 'Tambah Siswa Baru' : 'Edit Data Siswa'}>
                <StudentForm 
                    initialData={modal === 'edit' ? selectedStudent! : undefined}
                    onCancel={closeModals}
                    showToast={showToast}
                    onSubmit={async (data) => {
                        try {
                            if(modal === 'add') {
                                await onAdd(data);
                                showToast('success', 'Siswa baru berhasil ditambahkan.');
                            } else if (selectedStudent) {
                                await onUpdate({ id: selectedStudent.id, ...data });
                                showToast('success', 'Data siswa berhasil diperbarui.');
                            }
                            closeModals();
                        } catch (err: any) {
                             showToast('error', `Gagal menyimpan: ${err.message}`);
                        }
                    }}
                />
            </Modal>

            <Modal isOpen={modal === 'delete'} onClose={closeModals} title="Konfirmasi Hapus">
                <p>Anda yakin ingin menghapus data siswa: <span className="font-bold">{selectedStudent?.name}</span>? Tindakan ini akan menghapus semua riwayat absensinya dan tidak dapat diurungkan.</p>
                <div className="flex justify-end gap-4 pt-6">
                    <Button onClick={closeModals} variant="secondary" disabled={isSubmitting}>Batal</Button>
                    <Button onClick={confirmDelete} variant="danger" isLoading={isSubmitting}>Hapus</Button>
                </div>
            </Modal>
            
            <Modal isOpen={modal === 'import'} onClose={closeModals} title={`Preview Impor dari ${importPreview?.fileName}`} maxWidth="max-w-4xl">
                {importPreview && (
                    <div className="space-y-4">
                        <p>Ditemukan <span className="font-bold">{importPreview.students.length}</span> data siswa untuk diimpor. Mohon periksa data di bawah sebelum melanjutkan.</p>
                        <div className="max-h-96 overflow-y-auto border rounded-md">
                           <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-50">
                                    <tr className="border-b">
                                        <th className="p-2 font-semibold">No</th>
                                        <th className="p-2 font-semibold">Nama</th>
                                        <th className="p-2 font-semibold">Kelas</th>
                                        <th className="p-2 font-semibold">NIS</th>
                                        <th className="p-2 font-semibold">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importPreview.students.map((s, index) => (
                                        <tr key={index} className="border-b hover:bg-slate-50">
                                            <td className="p-2">{index + 1}</td>
                                            <td className="p-2">{s.name}</td>
                                            <td className="p-2">{s.class}</td>
                                            <td className="p-2">{s.nis || '-'}</td>
                                            <td className="p-2">{s.email || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                         <div className="flex justify-end gap-4 pt-4">
                            <Button onClick={closeModals} variant="secondary" disabled={isSubmitting}>Batal</Button>
                            <Button onClick={handleConfirmImport} variant="primary" isLoading={isSubmitting}>Konfirmasi & Impor</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const AttendanceView = ({
    students,
    attendanceRecords,
    onSave,
    showToast
}: {
    students: Student[];
    attendanceRecords: AttendanceRecord[];
    onSave: (records: Pick<AttendanceRecord, 'studentId' | 'date' | 'lessonHour' | 'status'>[]) => Promise<void>;
    showToast: (type: 'success' | 'error', message: string) => void;
}) => {
    const classNames = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);
    const [selectedClass, setSelectedClass] = useState<string>(classNames[0] || '');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [lessonHour, setLessonHour] = useState(1);
    const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState(false);

    const studentsInClass = useMemo(() => {
        return students.filter(s => s.class === selectedClass);
    }, [students, selectedClass]);

    useEffect(() => {
        if (classNames.length > 0 && !selectedClass) {
            setSelectedClass(classNames[0]);
        }
    }, [classNames, selectedClass]);

    useEffect(() => {
        const existingRecords = attendanceRecords.filter(r => r.date === selectedDate && r.lessonHour === lessonHour);
        const newAttendance: Record<number, AttendanceStatus> = {};
        studentsInClass.forEach(student => {
            const record = existingRecords.find(r => r.studentId === student.id);
            newAttendance[student.id] = record ? record.status : AttendanceStatus.Hadir;
        });
        setAttendance(newAttendance);
    }, [selectedClass, selectedDate, lessonHour, studentsInClass, attendanceRecords]);

    const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        const recordsToSave = studentsInClass.map(student => ({
            studentId: student.id,
            date: selectedDate,
            lessonHour: lessonHour,
            status: attendance[student.id] || AttendanceStatus.Hadir,
        }));
        
        setIsSaving(true);
        try {
            await onSave(recordsToSave);
            showToast('success', `Absensi untuk kelas ${selectedClass} pada jam ke-${lessonHour} berhasil disimpan.`);
        } catch (error: any) {
            // Error handling is done in the parent `handleSaveClassAttendance` function, which shows a toast.
        } finally {
            setIsSaving(false);
        }
    };
    
    const setAllStudentsStatus = (status: AttendanceStatus) => {
      const newAttendance: Record<number, AttendanceStatus> = {};
      studentsInClass.forEach(student => {
        newAttendance[student.id] = status;
      });
      setAttendance(newAttendance);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Input Absensi Kelas</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b">
                    <div>
                        <label htmlFor="class-select" className="block text-sm font-medium text-slate-700">Kelas</label>
                        <select id="class-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" disabled={!classNames.length}>
                            {classNames.map(c => <option key={c} value={c}>{c}</option>)}
                            {!classNames.length && <option>Belum ada kelas</option>}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date-select" className="block text-sm font-medium text-slate-700">Tanggal</label>
                        <input type="date" id="date-select" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" />
                    </div>
                    <div>
                        <label htmlFor="lesson-hour" className="block text-sm font-medium text-slate-700">Jam Pelajaran Ke-</label>
                        <input type="number" id="lesson-hour" value={lessonHour} onChange={e => setLessonHour(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm font-medium text-slate-700 self-center">Atur Semua:</span>
                    <Button variant="secondary" onClick={() => setAllStudentsStatus(AttendanceStatus.Hadir)} className="py-1 px-3 text-sm">Hadir</Button>
                    <Button variant="secondary" onClick={() => setAllStudentsStatus(AttendanceStatus.Sakit)} className="py-1 px-3 text-sm">Sakit</Button>
                    <Button variant="secondary" onClick={() => setAllStudentsStatus(AttendanceStatus.Izin)} className="py-1 px-3 text-sm">Izin</Button>
                    <Button variant="secondary" onClick={() => setAllStudentsStatus(AttendanceStatus.Alfa)} className="py-1 px-3 text-sm">Alfa</Button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-3 font-semibold">Nama Siswa</th>
                                <th className="p-3 font-semibold text-center">Status Kehadiran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentsInClass.map(student => (
                                <tr key={student.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-medium">{student.name}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                                            {Object.values(AttendanceStatus).map(status => (
                                                <label key={status} className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`status-${student.id}`}
                                                        value={status}
                                                        checked={attendance[student.id] === status}
                                                        onChange={() => handleStatusChange(student.id, status)}
                                                        className="form-radio h-4 w-4 text-sekolah-600 border-slate-300 focus:ring-sekolah-500"
                                                    />
                                                    <span className={`text-sm ${attendance[student.id] === status ? 'font-bold' : ''}`}>{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {studentsInClass.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="text-center p-6 text-slate-500">
                                       {selectedClass ? 'Tidak ada siswa di kelas ini.' : 'Pilih kelas untuk menampilkan siswa.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving || studentsInClass.length === 0}>Simpan Absensi</Button>
                </div>
            </Card>
        </div>
    );
};

const RecapView = ({
    students,
    attendanceRecords,
}: {
    students: Student[];
    attendanceRecords: AttendanceRecord[];
}) => {
    const [filterType, setFilterType] = useState<'monthly' | 'weekly'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [filterClass, setFilterClass] = useState<string>('all');
    
    const classNames = useMemo(() => ['all', ...[...new Set(students.map(s => s.class))].sort()], [students]);

    const recapData: RecapData[] = useMemo(() => {
        const interval = filterType === 'monthly'
            ? { start: startOfMonth(parseISO(selectedMonth)), end: endOfMonth(parseISO(selectedMonth)) }
            : { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) };

        const relevantRecords = attendanceRecords.filter(r => isWithinInterval(parseISO(r.date), interval));
        const filteredStudents = filterClass === 'all' ? students : students.filter(s => s.class === filterClass);

        return filteredStudents.map(student => {
            const studentRecords = relevantRecords.filter(r => r.studentId === student.id);
            const hadir = studentRecords.filter(r => r.status === AttendanceStatus.Hadir).length;
            const sakit = studentRecords.filter(r => r.status === AttendanceStatus.Sakit).length;
            const izin = studentRecords.filter(r => r.status === AttendanceStatus.Izin).length;
            const alfa = studentRecords.filter(r => r.status === AttendanceStatus.Alfa).length;
            const totalHours = hadir + sakit + izin + alfa;
            const presencePercentage = totalHours > 0 ? Math.round((hadir / totalHours) * 100) : 0;

            return {
                studentId: student.id,
                studentName: student.name,
                studentClass: student.class,
                hadir, sakit, izin, alfa,
                totalHours,
                presencePercentage,
            };
        });
    }, [students, attendanceRecords, filterType, selectedMonth, filterClass]);

    const handleExportExcel = () => {
      const dataToExport = recapData.map(d => ({
        'Nama Siswa': d.studentName,
        'Kelas': d.studentClass,
        'Hadir': d.hadir,
        'Sakit': d.sakit,
        'Izin': d.izin,
        'Alfa': d.alfa,
        'Total Jam': d.totalHours,
        'Persentase Kehadiran (%)': d.presencePercentage
      }));
      exportToExcel(dataToExport, `rekap-absensi-${filterClass}-${selectedMonth}`, 'Rekap Absensi');
    };

    const handleExportPdf = () => {
      const headers = ['Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Total', 'Kehadiran (%)'];
      const body = recapData.map(d => [d.studentName, d.studentClass, d.hadir, d.sakit, d.izin, d.alfa, d.totalHours, `${d.presencePercentage}%`]);
      exportToPdf(`Rekap Absensi Kelas ${filterClass} - ${format(parseISO(selectedMonth), 'MMMM yyyy', {locale: idLocale})}`, headers, body, `rekap-absensi-${filterClass}-${selectedMonth}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Rekapitulasi Absensi</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportExcel} variant="secondary"><DownloadIcon /> Excel</Button>
                    <Button onClick={handleExportPdf} variant="secondary"><DownloadIcon /> PDF</Button>
                </div>
            </div>

            <Card>
                <div className="flex flex-wrap gap-4 p-4 border-b">
                    <div className="flex-grow">
                        <label htmlFor="month-select" className="block text-sm font-medium text-slate-700">Bulan</label>
                        <input
                            type="month"
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"
                        />
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="class-filter" className="block text-sm font-medium text-slate-700">Filter Kelas</label>
                        <select
                            id="class-filter"
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"
                        >
                            {classNames.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kelas' : c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-3 font-semibold">Nama Siswa</th>
                                <th className="p-3 font-semibold">Kelas</th>
                                <th className="p-3 font-semibold text-center">Hadir</th>
                                <th className="p-3 font-semibold text-center">Sakit</th>
                                <th className="p-3 font-semibold text-center">Izin</th>
                                <th className="p-3 font-semibold text-center">Alfa</th>
                                <th className="p-3 font-semibold text-center">Total</th>
                                <th className="p-3 font-semibold text-center">Kehadiran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recapData.map(data => (
                                <tr key={data.studentId} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-medium">{data.studentName}</td>
                                    <td className="p-3">{data.studentClass}</td>
                                    <td className="p-3 text-center">{data.hadir}</td>
                                    <td className="p-3 text-center">{data.sakit}</td>
                                    <td className="p-3 text-center">{data.izin}</td>
                                    <td className="p-3 text-center">{data.alfa}</td>
                                    <td className="p-3 text-center font-bold">{data.totalHours}</td>
                                    <td className={`p-3 text-center font-bold ${getPresenceStatus(data.presencePercentage).color}`}>
                                        {data.presencePercentage}%
                                    </td>
                                </tr>
                            ))}
                            {recapData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center p-6 text-slate-500">
                                        Tidak ada data absensi untuk filter yang dipilih.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const StudentDetailView = ({
    student,
    attendanceRecords,
    onBack
}: {
    student: Student | undefined;
    attendanceRecords: AttendanceRecord[];
    onBack: () => void;
}) => {
    if (!student) {
        return <div className="text-center p-8">Siswa tidak ditemukan.</div>;
    }

    const studentRecords = useMemo(() => {
        return attendanceRecords
            .filter(r => r.studentId === student.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendanceRecords, student.id]);
    
    const recapData: Omit<RecapData, 'studentId'|'studentName'|'studentClass'> = useMemo(() => {
        const hadir = studentRecords.filter(r => r.status === AttendanceStatus.Hadir).length;
        const sakit = studentRecords.filter(r => r.status === AttendanceStatus.Sakit).length;
        const izin = studentRecords.filter(r => r.status === AttendanceStatus.Izin).length;
        const alfa = studentRecords.filter(r => r.status === AttendanceStatus.Alfa).length;
        const totalHours = hadir + sakit + izin + alfa;
        const presencePercentage = totalHours > 0 ? Math.round((hadir / totalHours) * 100) : 0;

        return { hadir, sakit, izin, alfa, totalHours, presencePercentage };
    }, [studentRecords]);


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary">
                    <BackIcon />
                    Kembali
                </Button>
                <h1 className="text-3xl font-bold text-slate-800">{student.name}</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Detail Siswa</h2>
                    <div className="space-y-2">
                        <p><span className="font-semibold">Kelas:</span> {student.class}</p>
                        <p><span className="font-semibold">NIS:</span> {student.nis || 'Tidak ada'}</p>
                        <p><span className="font-semibold">Email:</span> {student.email || 'Tidak ada'}</p>
                    </div>
                </Card>
                 <Card>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Ringkasan Kehadiran (Total)</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-500">Hadir</p>
                            <p className="text-2xl font-bold">{recapData.hadir}</p>
                        </div>
                         <div>
                            <p className="text-sm text-slate-500">Sakit</p>
                            <p className="text-2xl font-bold">{recapData.sakit}</p>
                        </div>
                         <div>
                            <p className="text-sm text-slate-500">Izin</p>
                            <p className="text-2xl font-bold">{recapData.izin}</p>
                        </div>
                         <div>
                            <p className="text-sm text-slate-500">Alfa</p>
                            <p className="text-2xl font-bold">{recapData.alfa}</p>
                        </div>
                         <div className="col-span-2">
                            <p className="text-sm text-slate-500">Persentase Kehadiran</p>
                            <p className={`text-2xl font-bold ${getPresenceStatus(recapData.presencePercentage).color}`}>{recapData.presencePercentage}%</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Riwayat Absensi</h2>
                <div className="overflow-x-auto max-h-[30rem]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-3 font-semibold">Tanggal</th>
                                <th className="p-3 font-semibold">Jam Ke-</th>
                                <th className="p-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentRecords.map(record => (
                                <tr key={record.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3">{format(parseISO(record.date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}</td>
                                    <td className="p-3">{record.lessonHour}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {studentRecords.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center p-6 text-slate-500">
                                        Belum ada riwayat absensi untuk siswa ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const AuthView = ({
  showToast,
  onLoginSuccess
}: {
  showToast: (type: 'success' | 'error', message: string) => void;
  onLoginSuccess: () => void;
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authView, setAuthView] = useState<'form' | 'check_email'>('form');

  useEffect(() => {
    let interval: number | undefined;
    if (resendCooldown > 0) {
        interval = window.setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (interval) {
            clearInterval(interval);
        }
    };
  }, [resendCooldown]);
  
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });

    if (error) {
        showToast('error', `Gagal mengirim ulang: ${error.message}`);
    } else {
        showToast('success', `Email verifikasi baru telah dikirim ke ${email}.`);
        setResendCooldown(60);
    }
    setIsResending(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !fullName.trim()) {
        showToast('error', 'Nama Lengkap Guru wajib diisi.');
        return;
    }
    setIsLoading(true);

    const authMethod = mode === 'signup'
      ? supabase.auth.signUp({ 
          email, 
          password,
          options: {
              data: {
                  full_name: fullName.trim()
              }
          }
        })
      : supabase.auth.signInWithPassword({ email, password });

    const { data, error } = await authMethod;

    if (error) {
      showToast('error', error.message);
    } else if (mode === 'signup' && data.user) {
        if(data.user.identities?.length === 0) {
            // User already exists but is not confirmed. Resend email.
            await supabase.auth.resend({ type: 'signup', email: email });
            setAuthView('check_email');
        } else {
            setAuthView('check_email');
            showToast('success', 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
        }
    } else if (mode === 'signin' && data.user) {
      // onLoginSuccess will be called by onAuthStateChange listener
    }
    setIsLoading(false);
  };

  if (authView === 'check_email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full text-center p-8 space-y-6 bg-white shadow-lg rounded-lg">
            <MailIcon className="mx-auto text-sekolah-500 w-24 h-24"/>
            <h1 className="text-3xl font-bold text-slate-800">Verifikasi Email Anda</h1>
            <p className="text-slate-600">
                Kami telah mengirimkan tautan verifikasi ke <span className="font-bold text-slate-800">{email}</span>. Silakan klik tautan tersebut untuk menyelesaikan pendaftaran.
            </p>
            <div className="pt-4 space-y-3">
              <Button
                onClick={handleResendEmail}
                isLoading={isResending}
                disabled={isResending || resendCooldown > 0}
                className="w-full"
              >
                {resendCooldown > 0 ? `Kirim Ulang dalam ${resendCooldown}s` : 'Kirim Ulang Email Verifikasi'}
              </Button>
              <Button
                onClick={() => setAuthView('form')}
                variant="secondary"
                className="w-full"
                disabled={isResending}
              >
                Salah Email? Kembali
              </Button>
            </div>
            <p className="text-sm text-slate-500 !mt-6">
              Tidak menerima email? Cek folder spam Anda atau coba kirim ulang.
            </p>
            <p className="text-sm text-slate-500">
              Halaman ini akan diperbarui secara otomatis setelah verifikasi selesai.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-xl rounded-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Selamat Datang Bapak/Ibu Guru
          </h2>
          <p className="mt-4 text-xl font-semibold text-sekolah-700">
            Madrasah Aliyah Darul Inayah
          </p>
          <p className="mt-8 text-sm text-slate-600">
            {mode === 'signin' ? 'Silakan masuk, atau ' : 'Silakan daftar, atau '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-medium text-sekolah-600 hover:text-sekolah-500"
            >
              {mode === 'signin' ? 'buat akun baru' : 'masuk di sini'}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            {mode === 'signup' && (
              <div>
                <label htmlFor="full-name" className="sr-only">Nama Lengkap Guru</label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500 focus:z-10 sm:text-sm"
                  placeholder="Nama Lengkap Guru"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">Alamat email</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 ${mode === 'signin' ? 'rounded-t-md' : ''} focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500 focus:z-10 sm:text-sm`}
                placeholder="Alamat email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              {mode === 'signin' ? 'Masuk' : 'Daftar'}
            </Button>
          </div>
        </form>
      </div>
      <div className="text-center mt-6 text-slate-500 text-xs max-w-lg px-4">
          <p>Jln. Cipeusing No. 120 Rt. 004 Rw. 004 Ds. Kertawangi Kec. Cisarua Kab. Bandung Barat - Jawa Barat 40551</p>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('name', { ascending: true });
            
            if (studentsError) throw studentsError;
            setStudents(studentsData || []);

            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance_records')
                .select('*');
            
            if (attendanceError) throw attendanceError;
            setAttendanceRecords((attendanceData || []).map(ar => ({
                id: ar.id,
                studentId: ar.student_id,
                date: ar.date,
                lessonHour: ar.lesson_hour,
                status: ar.status as AttendanceStatus
            })));

        } catch (error: any) {
            showToast('error', `Gagal memuat data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchData();
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
             if (_event === 'SIGNED_IN') {
                fetchData();
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchData]);
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setStudents([]);
        setAttendanceRecords([]);
        setCurrentView('dashboard');
    };

    const handleAddStudent = async (student: Omit<Student, 'id'>) => {
        const { data, error } = await supabase.from('students').insert({ 
            name: student.name,
            class: student.class,
            nis: student.nis,
            email: student.email || null,
        }).select().single();
        if (error) throw error;
        if(data) await fetchData();
    };

    const handleUpdateStudent = async (student: Student) => {
        const { error } = await supabase.from('students').update({
            name: student.name,
            class: student.class,
            nis: student.nis,
            email: student.email || null,
        }).eq('id', student.id);
        if (error) throw error;
        await fetchData();
    };
    
    const handleDeleteStudent = async (id: number) => {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    };
    
    const handleImportStudents = async (newStudents: Omit<Student, 'id'>[]) => {
        const payload = newStudents.map(s => ({
            name: s.name,
            class: s.class,
            nis: s.nis,
            email: s.email || null,
        }));
        const { error } = await supabase.from('students').insert(payload);
        if (error) throw error;
        await fetchData();
    };

    const handleSaveClassAttendance = async (records: Pick<AttendanceRecord, 'studentId' | 'date' | 'lessonHour' | 'status'>[]) => {
       // Defensive check on the client-side, though the main logic is in the DB function.
       for (const record of records) {
           if (!record.date || !record.studentId || !record.lessonHour || !record.status) {
               const errorMessage = `Data absensi tidak lengkap. Data: ${JSON.stringify(record)}`;
               showToast('error', errorMessage);
               throw new Error(errorMessage);
           }
       }
       
       try {
            const { error } = await supabase.rpc('save_class_attendance', { records_json: records });
            if (error) {
                // Throw the error so the component can catch it and show the toast
                throw error;
            }
            await fetchData();
        } catch (err: any) {
            console.error('Gagal menyimpan absensi (full error object):', err);
            
            // Extract the most helpful error message
            const errorMessage = err?.details || err?.message || "Terjadi kesalahan yang tidak diketahui saat menyimpan.";
            
            showToast('error', `Gagal menyimpan absensi: ${errorMessage}`);
            // Re-throw to signal failure to the caller if needed
            throw new Error(errorMessage);
        }
    };

    const handleViewChange = (view: View) => {
        setCurrentView(view);
        setIsSidebarOpen(false);
    };
    
    const handleViewDetail = (id: number) => {
        setSelectedStudentId(id);
        setCurrentView('studentDetail');
    };

    const NavLink = ({ view, icon, label }: { view: View; icon: React.ReactElement<{ className?: string }>; label: string; }) => (
        <button
            onClick={() => handleViewChange(view)}
            className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${currentView === view ? 'bg-sekolah-800 text-white' : 'text-slate-300 hover:bg-sekolah-600 hover:text-white'}`}
        >
            {React.cloneElement(icon, { className: 'w-5 h-5 mr-3' })}
            <span className="font-medium">{label}</span>
        </button>
    );

    if (isLoading && !session) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sekolah-600"></div></div>;
    }

    if (!session) {
        return <AuthView showToast={showToast} onLoginSuccess={fetchData} />;
    }
    
    const userFullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];

    const renderView = () => {
        const selectedStudent = students.find(s => s.id === selectedStudentId);

        switch (currentView) {
            case 'dashboard':
                return <DashboardView students={students} attendanceRecords={attendanceRecords} onImport={handleImportStudents} showToast={showToast} />;
            case 'students':
                return <StudentManagementView students={students} onAdd={handleAddStudent} onUpdate={handleUpdateStudent} onDelete={handleDeleteStudent} onImport={handleImportStudents} onViewDetail={handleViewDetail} showToast={showToast} />;
            case 'attendance':
                return <AttendanceView students={students} attendanceRecords={attendanceRecords} onSave={handleSaveClassAttendance} showToast={showToast} />;
            case 'recap':
                return <RecapView students={students} attendanceRecords={attendanceRecords} />;
            case 'studentDetail':
                return <StudentDetailView student={selectedStudent} attendanceRecords={attendanceRecords} onBack={() => handleViewChange('students')} />;
            default:
                return <DashboardView students={students} attendanceRecords={attendanceRecords} onImport={handleImportStudents} showToast={showToast} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar */}
            <aside className={`absolute md:relative z-20 md:z-auto bg-sekolah-900 text-white w-64 p-4 flex flex-col space-y-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
                <div className="flex items-center justify-between">
                     <h1 className="text-2xl font-bold text-white">MA Darul Inayah</h1>
                     <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white p-1">
                        <CloseIcon />
                    </button>
                </div>
                <nav className="flex-grow space-y-2">
                    <NavLink view="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                    <NavLink view="students" icon={<StudentsIcon />} label="Manajemen Siswa" />
                    <NavLink view="attendance" icon={<AttendanceIcon />} label="Input Absensi" />
                    <NavLink view="recap" icon={<RecapIcon />} label="Rekapitulasi" />
                </nav>
                <div className="pt-4 border-t border-sekolah-700">
                    <div className="mb-2">
                      <div className="font-semibold text-white truncate" title={userFullName || ''}>{userFullName}</div>
                      <div className="text-sm text-slate-400 truncate" title={session.user.email || ''}>{session.user.email}</div>
                    </div>
                    <Button onClick={handleLogout} variant="secondary" className="w-full text-sekolah-800"><LogoutIcon/> Logout</Button>
                </div>
            </aside>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                 {/* Top bar for mobile */}
                <header className="md:hidden bg-white shadow-md p-4 flex justify-between items-center">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
                        <MenuIcon />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 capitalize">{currentView.replace('studentDetail', 'Detail Siswa')}</h2>
                    <div></div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-sekolah-600"></div></div>
                    ) : (
                        renderView()
                    )}
                </main>
            </div>
            
             {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 w-full max-w-xs space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`p-4 rounded-md shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
