
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
import type { Session, Provider } from '@supabase/supabase-js';


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
        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500" disabled={isSubmitting} />
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
                    email: '',
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    email: String(row.Email || '').trim(),
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
                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary"><UploadIcon /> Impor Excel</Button>
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
                            {students.map(student => (
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
                             {students.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-6 text-slate-500">Belum ada data siswa.</td>
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

const ClassAttendanceView = ({
    students,
    attendanceRecords,
    onSave,
    showToast,
}: {
    students: Student[];
    attendanceRecords: AttendanceRecord[];
    onSave: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<boolean>;
    showToast: (type: 'success' | 'error', message: string) => void;
}) => {
    const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);
    
    const [selectedClass, setSelectedClass] = useState<string>(uniqueClasses[0] || '');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedHour, setSelectedHour] = useState<number>(1);
    const [attendanceData, setAttendanceData] = useState<Map<number, AttendanceStatus>>(new Map());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const studentsInClass = useMemo(() => {
        return students
            .filter(s => s.class === selectedClass)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, selectedClass]);

    useEffect(() => {
        const newAttendanceData = new Map<number, AttendanceStatus>();
        const existingRecordsForFilter = attendanceRecords.filter(
            r => r.date === selectedDate && r.lessonHour === selectedHour
        );
        
        studentsInClass.forEach(student => {
            const existingRecord = existingRecordsForFilter.find(r => r.studentId === student.id);
            newAttendanceData.set(student.id, existingRecord ? existingRecord.status : AttendanceStatus.Hadir);
        });
        setAttendanceData(newAttendanceData);
    }, [studentsInClass, attendanceRecords, selectedDate, selectedHour]);

    const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
        setAttendanceData(prev => new Map(prev).set(studentId, status));
    };

    const handleMarkAllPresent = () => {
        const newAttendanceData = new Map<number, AttendanceStatus>();
        studentsInClass.forEach(student => {
            newAttendanceData.set(student.id, AttendanceStatus.Hadir);
        });
        setAttendanceData(newAttendanceData);
    };

    const handleSave = async () => {
        if (studentsInClass.length === 0) {
            showToast('error', 'Tidak ada siswa di kelas ini untuk diabsen.');
            return;
        }
        
        setIsSubmitting(true);
        const recordsToSave: Omit<AttendanceRecord, 'id'>[] = [];
        attendanceData.forEach((status, studentId) => {
            recordsToSave.push({
                studentId: studentId,
                date: selectedDate,
                lessonHour: selectedHour,
                status: status,
            });
        });

        const success = await onSave(recordsToSave);
        setIsSubmitting(false);

        if (success) {
            showToast('success', `Absensi untuk kelas ${selectedClass} berhasil disimpan!`);
        } else {
             showToast('error', 'Gagal menyimpan absensi. Silakan coba lagi.');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Absensi Kelas</h1>
            <Card>
                <div className="flex flex-wrap gap-4 items-end p-4 border-b">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Kelas</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={isSubmitting || uniqueClasses.length === 0} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500">
                           {uniqueClasses.length > 0 ? (
                               uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)
                           ) : (
                               <option>Belum ada kelas</option>
                           )}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Tanggal</label>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Jam Ke-</label>
                        <input type="number" value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))} min="1" disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"/>
                    </div>
                    <div className="flex-grow"></div>
                     <Button onClick={handleMarkAllPresent} variant="secondary" disabled={isSubmitting || studentsInClass.length === 0}>
                        Tandai Semua Hadir
                    </Button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                            <tr className="border-b">
                                <th className="p-3 font-semibold">Nama Siswa</th>
                                <th className="p-3 font-semibold text-center w-[300px]">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentsInClass.length > 0 ? studentsInClass.map(student => (
                                <tr key={student.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-medium">{student.name}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex justify-center gap-1 sm:gap-2">
                                            {Object.values(AttendanceStatus).map(status => (
                                                <button 
                                                    key={status} 
                                                    onClick={() => handleStatusChange(student.id, status)}
                                                    disabled={isSubmitting}
                                                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all font-semibold ${attendanceData.get(student.id) === status ? 'ring-2 ring-sekolah-500 shadow' : 'opacity-60 hover:opacity-100'} ${getStatusColor(status)}`}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={2} className="text-center p-8 text-slate-500">
                                        Pilih kelas untuk memulai absensi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 {studentsInClass.length > 0 && (
                    <div className="p-4 border-t flex flex-col items-center">
                       <Button onClick={handleSave} variant="primary" isLoading={isSubmitting} className="w-full max-w-xs">
                           Simpan Absensi Kelas {selectedClass}
                       </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

const RecapView = ({ students, attendanceRecords, onViewDetail }: { students: Student[]; attendanceRecords: AttendanceRecord[]; onViewDetail: (id: number) => void; }) => {
    type Period = 'daily' | 'weekly' | 'monthly' | 'last_month';
    const [period, setPeriod] = useState<Period>('monthly');
    const [filterDate, setFilterDate] = useState(new Date());
    const [filterClass, setFilterClass] = useState<string>('all');
    
    const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);

    const recapData = useMemo(() => {
        let startDate: Date, endDate: Date;
        const now = filterDate;
        switch(period) {
            case 'daily':
                startDate = endDate = now;
                break;
            case 'weekly':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'last_month':
                const lastMonthDate = subMonths(now, 1);
                startDate = startOfMonth(lastMonthDate);
                endDate = endOfMonth(lastMonthDate);
                break;
            case 'monthly':
            default:
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
        }

        const filteredStudents = filterClass === 'all' ? students : students.filter(s => s.class === filterClass);
        const recordsInPeriod = attendanceRecords.filter(r => isWithinInterval(parseISO(r.date), { start: startDate, end: endDate }));
        
        return filteredStudents.map(student => {
            const studentRecords = recordsInPeriod.filter(r => r.studentId === student.id);
            const counts = studentRecords.reduce((acc, record) => {
                acc[record.status] = (acc[record.status] || 0) + 1;
                return acc;
            }, {} as Record<AttendanceStatus, number>);

            const hadir = counts.Hadir || 0;
            const totalHoursInPeriod = studentRecords.length; // Total lessons recorded for this student in period
            const presencePercentage = totalHoursInPeriod > 0 ? Math.round((hadir / totalHoursInPeriod) * 100) : 0;
            
            return {
                studentId: student.id,
                studentName: student.name,
                studentClass: student.class,
                hadir: hadir,
                sakit: counts.Sakit || 0,
                izin: counts.Izin || 0,
                alfa: counts.Alfa || 0,
                totalHours: totalHoursInPeriod,
                presencePercentage,
            };
        }).sort((a,b) => a.studentName.localeCompare(b.studentName));
    }, [students, attendanceRecords, period, filterDate, filterClass]);

    const handleExportExcel = () => {
        const dataToExport = recapData.map(d => ({
            'Nama Siswa': d.studentName,
            'Kelas': d.studentClass,
            'Hadir (Jam)': d.hadir,
            'Sakit (Jam)': d.sakit,
            'Izin (Jam)': d.izin,
            'Alfa (Jam)': d.alfa,
            'Total Jam': d.totalHours,
            'Persentase Hadir (%)': d.presencePercentage,
            'Status': getPresenceStatus(d.presencePercentage).text,
        }));
        exportToExcel(dataToExport, `Rekap_Kehadiran_${period}_${format(filterDate, 'yyyy-MM-dd')}`, 'Rekap');
    };

    const handleExportPdf = () => {
        const title = `Rekap Kehadiran - Periode ${period} (${format(filterDate, 'MMMM yyyy')})`;
        const headers = ['Nama', 'Kelas', 'H', 'S', 'I', 'A', 'Total', '%', 'Status'];
        const body = recapData.map(d => [
            d.studentName,
            d.studentClass,
            d.hadir,
            d.sakit,
            d.izin,
            d.alfa,
            d.totalHours,
            `${d.presencePercentage}%`,
            getPresenceStatus(d.presencePercentage).text,
        ]);
        exportToPdf(title, headers, body, `Rekap_Kehadiran_${period}_${format(filterDate, 'yyyy-MM-dd')}`);
    };
    
    const getPeriodLabel = () => {
        switch(period){
            case 'daily': return `Tanggal: ${format(filterDate, 'd MMM yyyy')}`;
            case 'weekly': return `Pekan: ${format(startOfWeek(filterDate, {weekStartsOn: 1}), 'd MMM')} - ${format(endOfWeek(filterDate, {weekStartsOn: 1}), 'd MMM yyyy')}`;
            case 'last_month': return `Bulan: ${format(subMonths(new Date(), 1), 'MMMM yyyy')}`;
            case 'monthly': return `Bulan: ${format(filterDate, 'MMMM yyyy')}`;
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Rekap Kehadiran</h1>
            
            <Card>
                <div className="flex flex-wrap gap-4 items-end p-4 border-b">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Periode</label>
                         <select value={period} onChange={e => { setPeriod(e.target.value as Period); if(e.target.value !== 'last_month') setFilterDate(new Date()) }} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500">
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly">Bulanan</option>
                            <option value="last_month">Bulan Lalu</option>
                        </select>
                    </div>
                    {period === 'daily' && (
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Tanggal</label>
                            <input type="date" value={format(filterDate, 'yyyy-MM-dd')} onChange={e => setFilterDate(parseISO(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"/>
                         </div>
                    )}
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Kelas</label>
                         <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500">
                            <option value="all">Semua Kelas</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex-grow"></div>
                    <div className="flex gap-2">
                        <Button onClick={handleExportExcel} variant="secondary"><DownloadIcon/> Excel</Button>
                        <Button onClick={handleExportPdf} variant="secondary"><DownloadIcon/> PDF</Button>
                    </div>
                </div>
                <p className="text-sm text-slate-500 p-4">{getPeriodLabel()}</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 font-semibold">Nama Siswa</th>
                                <th className="p-3 font-semibold">Kelas</th>
                                <th className="p-3 font-semibold text-center" title="Hadir">H</th>
                                <th className="p-3 font-semibold text-center" title="Sakit">S</th>
                                <th className="p-3 font-semibold text-center" title="Izin">I</th>
                                <th className="p-3 font-semibold text-center" title="Alfa">A</th>
                                <th className="p-3 font-semibold text-center" title="Total Jam Pelajaran">Total</th>
                                <th className="p-3 font-semibold text-center" title="Persentase Kehadiran">% Hadir</th>
                                <th className="p-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recapData.map(d => {
                                const status = getPresenceStatus(d.presencePercentage);
                                return (
                                <tr key={d.studentId} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-medium text-sekolah-700 cursor-pointer hover:underline" onClick={() => onViewDetail(d.studentId)}>{d.studentName}</td>
                                    <td className="p-3">{d.studentClass}</td>
                                    <td className="p-3 text-center text-green-600">{d.hadir}</td>
                                    <td className="p-3 text-center text-yellow-600">{d.sakit}</td>
                                    <td className="p-3 text-center text-blue-600">{d.izin}</td>
                                    <td className="p-3 text-center text-red-600">{d.alfa}</td>
                                    <td className="p-3 text-center font-medium">{d.totalHours}</td>
                                    <td className="p-3 text-center font-bold">{d.presencePercentage}%</td>
                                    <td className={`p-3 font-semibold ${status.color}`}>{status.text}</td>
                                </tr>
                            )})}
                            {recapData.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center p-6 text-slate-500">Tidak ada data untuk ditampilkan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const StudentDetailView = ({ student, records, onBack }: { student: Student; records: AttendanceRecord[]; onBack: () => void }) => {
    const summary = useMemo(() => {
        const counts = records.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {} as Record<AttendanceStatus, number>);
        const total = records.length;
        return {
            hadir: counts.Hadir || 0,
            sakit: counts.Sakit || 0,
            izin: counts.Izin || 0,
            alfa: counts.Alfa || 0,
            total,
            presencePercentage: total > 0 ? Math.round(((counts.Hadir || 0) / total) * 100) : 0,
        };
    }, [records]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary" className="px-3 py-2"><BackIcon/></Button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{student.name}</h1>
                    <p className="text-slate-600">
                        {student.class}
                        {student.nis && ` | NIS: ${student.nis}`}
                        {student.email && ` | Email: ${student.email}`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="text-center"><p className="text-2xl font-bold">{summary.hadir}</p><p className="text-slate-500">Hadir</p></Card>
                <Card className="text-center"><p className="text-2xl font-bold">{summary.sakit}</p><p className="text-slate-500">Sakit</p></Card>
                <Card className="text-center"><p className="text-2xl font-bold">{summary.izin}</p><p className="text-slate-500">Izin</p></Card>
                <Card className="text-center"><p className="text-2xl font-bold">{summary.alfa}</p><p className="text-slate-500">Alfa</p></Card>
                <Card className="text-center bg-sekolah-50"><p className="text-2xl font-bold text-sekolah-700">{summary.presencePercentage}%</p><p className="text-sekolah-600">Kehadiran</p></Card>
            </div>
            
            <Card>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Riwayat Kehadiran</h2>
                <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="border-b bg-slate-50 sticky top-0">
                            <tr className="border-b">
                                <th className="p-2">Tanggal</th>
                                <th className="p-2">Jam Ke-</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                             {records.sort((a,b) => b.date.localeCompare(a.date) || b.lessonHour - a.lessonHour).map(r => (
                                <tr key={r.id} className="border-b hover:bg-slate-50">
                                    <td className="p-2">{format(parseISO(r.date), 'd MMM yyyy')}</td>
                                    <td className="p-2">{r.lessonHour}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(r.status)}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                             {records.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center p-6 text-slate-500">Belum ada riwayat kehadiran.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}

const ToastContainer = ({ toasts, onDismiss }: { toasts: ToastMessage[], onDismiss: (id: number) => void }) => {
    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-full max-w-sm space-y-3">
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className={`flex items-center justify-between p-4 rounded-md shadow-lg text-white animate-fade-in-up ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                >
                    <p className="font-semibold">{toast.message}</p>
                    <button onClick={() => onDismiss(toast.id)} className="ml-4 text-xl leading-none">&times;</button>
                </div>
            ))}
        </div>
    );
};

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => (
    <header className="bg-white shadow-sm md:hidden p-4 flex items-center">
        <button onClick={onMenuClick} className="text-slate-600 hover:text-sekolah-700">
            <MenuIcon />
        </button>
        <h1 className="text-lg font-bold text-sekolah-800 ml-4">Absensi Guru</h1>
    </header>
);

const AuthView = ({ showToast }: { showToast: (type: 'success' | 'error', message: string) => void }) => {
    const [authView, setAuthView] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (authView === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast('success', 'Berhasil masuk!');
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showToast('success', 'Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi.');
            }
        } catch (error: any) {
            showToast('error', error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md mx-auto p-8">
                <div className="bg-white shadow-lg rounded-lg p-8">
                    <h2 className="text-2xl font-bold text-center text-sekolah-800 mb-2">
                        {authView === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
                    </h2>
                    <p className="text-center text-slate-500 mb-6">
                        {authView === 'login' ? 'Masuk untuk melanjutkan' : 'Daftar untuk mulai mengelola absensi'}
                    </p>
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-slate-700">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sekolah-500 focus:border-sekolah-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                            {authView === 'login' ? 'Masuk' : 'Daftar'}
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-sm">
                        {authView === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                        <button
                            onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
                            className="font-medium text-sekolah-600 hover:text-sekolah-500"
                        >
                            {authView === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
                        </button>
                    </p>
                </div>
                 <p className="text-center text-xs text-slate-400 mt-6">&copy; {new Date().getFullYear()} Aplikasi Absensi Guru</p>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
const MainApp = ({ session }: { session: Session }) => {
    const [view, setView] = useState<View>('dashboard');
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const showToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const dismissToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('name', { ascending: true });
            if (studentsError) throw studentsError;

            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance_records')
                .select('*');
            if (attendanceError) throw attendanceError;

            setStudents(studentsData || []);
            const mappedAttendanceRecords: AttendanceRecord[] = (attendanceData || []).map(r => ({
                id: r.id,
                studentId: r.student_id,
                date: r.date,
                lessonHour: r.lesson_hour,
                status: r.status as AttendanceStatus,
            }));
            setAttendanceRecords(mappedAttendanceRecords);
        } catch (err: any) {
            console.error("Error fetching data:", err);
            let errorMessage = "Terjadi kesalahan yang tidak diketahui.";
            if (err && err.message) {
                errorMessage = err.message;
                if (err.message.includes("violates row-level security policy")) {
                    errorMessage += " (Kebijakan Keamanan Tingkat Baris (RLS) mungkin belum diatur. Silakan periksa pengaturan Policies di dashboard Supabase Anda.)";
                }
            } else {
                errorMessage = JSON.stringify(err);
            }
            setError(`Gagal memuat data: ${errorMessage}. Pastikan koneksi dan konfigurasi Supabase sudah benar.`);
            showToast('error', `Gagal memuat data. Periksa konsol untuk detail.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
        const { data, error } = await supabase.from('students').insert([studentData]).select().single();
        if (error) throw new Error(error.message);
        if (data) {
           setStudents(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        }
    };

    const handleUpdateStudent = async (updatedStudent: Student) => {
        const { id, ...updateData } = updatedStudent;
        const { data, error } = await supabase.from('students').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        if(data) {
            setStudents(prev => prev.map(s => s.id === data.id ? data : s));
        }
    };

    const handleDeleteStudent = async (id: number) => {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw new Error(error.message);
        setStudents(prev => prev.filter(s => s.id !== id));
        setAttendanceRecords(prev => prev.filter(r => r.studentId !== id));
    };
    
    const handleImportStudents = async (newStudents: Omit<Student, 'id'>[]) => {
        const { error } = await supabase.from('students').insert(newStudents);
        if (error) {
            throw new Error(error.message);
        }
        await fetchData(); // Refresh all data
    };

    const handleSaveClassAttendance = async (records: Omit<AttendanceRecord, 'id'>[]): Promise<boolean> => {
        try {
            const recordsToUpsert = records.map(r => ({
                student_id: r.studentId,
                date: r.date,
                lesson_hour: r.lessonHour,
                status: r.status,
            }));

            const { data, error } = await supabase.from('attendance_records').upsert(recordsToUpsert, { onConflict: 'student_id,date,lesson_hour,user_id' }).select();
            if (error || !data) throw error || new Error('Data tidak kembali setelah upsert.');

            const newRecords: AttendanceRecord[] = data.map(r => ({
                id: r.id,
                studentId: r.student_id,
                date: r.date,
                lessonHour: r.lesson_hour,
                status: r.status as AttendanceStatus,
            }));

            setAttendanceRecords(prev => {
                const updatedRecords = [...prev];
                const newRecordsMap = new Map(newRecords.map(r => [`${r.studentId}-${r.date}-${r.lessonHour}`, r]));
                newRecordsMap.forEach((newRecord, key) => {
                    const existingIndex = updatedRecords.findIndex(r => `${r.studentId}-${r.date}-${r.lessonHour}` === key);
                    if (existingIndex > -1) {
                        updatedRecords[existingIndex] = newRecord;
                    } else {
                        updatedRecords.push(newRecord);
                    }
                });
                return updatedRecords;
            });
            return true;
        } catch (err: any) {
            console.error("Gagal menyimpan absensi:", err)
            return false;
        }
    };


    const handleViewStudentDetail = (id: number) => {
        setSelectedStudentId(id);
        setView('studentDetail');
    }
    
    const changeView = (newView: View) => {
        setView(newView);
        setSidebarOpen(false);
    }
    
    const handleLogout = async () => {
        showToast('success', 'Anda telah keluar.');
        await supabase.auth.signOut();
    }

    const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
    const selectedStudentRecords = useMemo(() => attendanceRecords.filter(r => r.studentId === selectedStudentId), [attendanceRecords, selectedStudentId]);

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <DashboardView students={students} attendanceRecords={attendanceRecords} onImport={handleImportStudents} showToast={showToast} />;
            case 'students':
                return <StudentManagementView students={students} onAdd={handleAddStudent} onUpdate={handleUpdateStudent} onDelete={handleDeleteStudent} onImport={handleImportStudents} onViewDetail={handleViewStudentDetail} showToast={showToast} />;
            case 'attendance':
                return <ClassAttendanceView students={students} attendanceRecords={attendanceRecords} onSave={handleSaveClassAttendance} showToast={showToast} />;
            case 'recap':
                return <RecapView students={students} attendanceRecords={attendanceRecords} onViewDetail={handleViewStudentDetail} />;
            case 'studentDetail':
                if (selectedStudent) {
                    return <StudentDetailView student={selectedStudent} records={selectedStudentRecords} onBack={() => changeView('students')} />;
                }
                 changeView('students'); // Go back if student not found
                return null;
            default:
                return <DashboardView students={students} attendanceRecords={attendanceRecords} onImport={handleImportStudents} showToast={showToast} />;
        }
    };
    
    const NavLink = ({ targetView, icon, label }: { targetView: View; icon: React.ReactNode; label: string }) => (
         <button onClick={() => changeView(targetView)} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full text-left ${view === targetView ? 'bg-sekolah-700 text-white' : 'text-sekolah-100 hover:bg-sekolah-600 hover:text-white'}`}>
            {icon}
            {label}
        </button>
    );
    
    const SidebarContent = () => (
        <>
            <div className="text-center py-4 mb-4">
                <h1 className="text-xl font-bold">Absensi Guru</h1>
                <p className="text-xs text-sekolah-200">Versi 3.0 (Multi-User)</p>
            </div>
            <p className="px-3 text-xs text-sekolah-300 truncate mb-4" title={session.user.email}>{session.user.email}</p>
        </>
    );

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sekolah-600"></div>
                    <p className="text-xl font-semibold text-slate-600">Memuat data Anda...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-red-50 p-4">
                <div className="text-center max-w-lg">
                    <h2 className="text-2xl font-bold text-red-700">Terjadi Kesalahan</h2>
                    <p className="text-red-600 mt-2 bg-red-100 p-3 rounded-md">{error}</p>

                    <Button onClick={fetchData} className="mt-6">
                        Coba Lagi
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-40 transform transition-transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <div className="absolute inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)}></div>
                 <aside className="relative w-64 bg-sekolah-800 text-white flex-col p-4 h-full flex">
                    <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-sekolah-200 hover:text-white">
                        <CloseIcon />
                    </button>
                    <SidebarContent />
                    <nav className="flex flex-col gap-2 flex-grow">
                       <NavLink targetView="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                       <NavLink targetView="students" icon={<StudentsIcon />} label="Manajemen Siswa" />
                       <NavLink targetView="attendance" icon={<AttendanceIcon />} label="Absensi Kelas" />
                       <NavLink targetView="recap" icon={<RecapIcon />} label="Rekap Kehadiran" />
                    </nav>
                     <Button onClick={handleLogout} variant="danger" className="w-full mt-4">
                        <LogoutIcon /> Keluar
                    </Button>
                </aside>
            </div>
            
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-sekolah-800 text-white flex-col p-4 hidden md:flex">
                <SidebarContent />
                <nav className="flex flex-col gap-2 flex-grow">
                   <NavLink targetView="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                   <NavLink targetView="students" icon={<StudentsIcon />} label="Manajemen Siswa" />
                   <NavLink targetView="attendance" icon={<AttendanceIcon />} label="Absensi Kelas" />
                   <NavLink targetView="recap" icon={<RecapIcon />} label="Rekap Kehadiran" />
                </nav>
                 <Button onClick={handleLogout} variant="danger" className="w-full mt-4">
                    <LogoutIcon /> Keluar
                 </Button>
            </aside>
            
            <div className="flex flex-col flex-1">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {renderView()}
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setAuthLoading(false);
        };
        
        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);
    
    const showToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const dismissToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (authLoading) {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sekolah-600"></div>
                    <p className="text-xl font-semibold text-slate-600">Memeriksa sesi...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {!session ? <AuthView showToast={showToast} /> : <MainApp key={session.user.id} session={session} />}
        </>
    )
}
