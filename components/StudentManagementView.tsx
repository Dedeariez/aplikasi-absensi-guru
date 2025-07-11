import React, { useState } from 'react';
import readXlsxFile from 'read-excel-file';
import { Profile, Student } from '../types';
import { uploadStudents, addStudent, updateStudent, addAuditLog } from '../services/supabaseService';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

// Student Form Modal
const StudentModal: React.FC<{
    student: Partial<Student> | null;
    onClose: () => void;
    onSave: (studentData: Omit<Student, 'id'> | (Partial<Omit<Student, 'id'>> & { id: string })) => void;
}> = ({ student, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        full_name: student?.full_name || '',
        grade: student?.grade || 10,
        gender: student?.gender || 'L',
        nisn: student?.nisn || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const studentData = {
            ...formData,
            grade: parseInt(String(formData.grade), 10),
            gender: formData.gender as 'L' | 'P',
            class_letter: (formData.gender === 'L' ? 'A' : 'B') as 'A' | 'B'
        };
        
        if (student?.id) {
            onSave({ ...studentData, id: student.id });
        } else {
            onSave(studentData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <Card className="w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">{student?.id ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">Nama Lengkap</label>
                        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                           <label className="block text-gray-700 font-bold mb-2">Kelas</label>
                            <select name="grade" value={formData.grade} onChange={handleChange} className="w-full p-2 border rounded-md">
                                <option value={10}>10</option>
                                <option value={11}>11</option>
                                <option value={12}>12</option>
                            </select>
                        </div>
                         <div>
                           <label className="block text-gray-700 font-bold mb-2">Jenis Kelamin</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded-md">
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">NISN (Opsional)</label>
                        <input type="text" name="nisn" value={formData.nisn} onChange={handleChange} className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                        <Button type="submit">Simpan</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


const StudentManagementView: React.FC<{ profile: Profile; students: Student[]; onDataChanged: () => void }> = ({ profile, students, onDataChanged }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setMessage('Memproses file...');
        setError('');

        try {
            const rows = await readXlsxFile(file);
            const header = rows[0].map(cell => String(cell).toLowerCase().trim());
            const requiredHeaders = ['nama', 'kelas', 'jenis kelamin'];
            if (!requiredHeaders.every(h => header.includes(h))) {
                throw new Error('Header kolom tidak sesuai. Pastikan ada kolom "nama", "kelas", dan "jenis kelamin".');
            }

            const nameIndex = header.indexOf('nama');
            const gradeIndex = header.indexOf('kelas');
            const genderIndex = header.indexOf('jenis kelamin');
            const nisnIndex = header.indexOf('nisn');

            const newStudents = rows.slice(1).map(row => {
                const fullName = row[nameIndex]?.toString();
                const grade = row[gradeIndex]?.toString();
                const gender = row[genderIndex]?.toString().toUpperCase().charAt(0);
                const nisn = nisnIndex !== -1 ? row[nisnIndex]?.toString() : undefined;

                if (!fullName || !grade || !['L', 'P'].includes(gender)) return null;

                return {
                    full_name: fullName,
                    grade: parseInt(grade, 10),
                    gender: gender as 'L' | 'P',
                    class_letter: (gender === 'L' ? 'A' : 'B') as 'A' | 'B',
                    nisn: nisn || undefined,
                };
            }).filter(Boolean) as Omit<Student, 'id'>[];

            if (newStudents.length === 0) throw new Error("Tidak ada data siswa yang valid ditemukan di dalam file.");

            await uploadStudents(newStudents);
            await addAuditLog(`Mengunggah ${newStudents.length} data siswa baru dari file ${file.name}.`, profile.email);
            
            setMessage(`${newStudents.length} data siswa berhasil diunggah.`);
            onDataChanged();
        } catch (err: any) {
            setError(err.message || 'Gagal memproses file.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleSaveStudent = async (studentData: Omit<Student, 'id'> | (Partial<Omit<Student, 'id'>> & { id: string })) => {
        try {
            if ('id' in studentData) {
                const { id, ...updates } = studentData;
                await updateStudent(id, updates);
                await addAuditLog(`Memperbarui data siswa: ${updates.full_name || editingStudent?.full_name}`, profile.email);
                setMessage("Data siswa berhasil diperbarui.");
            } else {
                await addStudent(studentData);
                await addAuditLog(`Menambahkan siswa baru: ${studentData.full_name}`, profile.email);
                setMessage("Siswa baru berhasil ditambahkan.");
            }
            onDataChanged();
            closeModal();
        } catch (err: any) {
            setError("Gagal menyimpan data siswa: " + err.message);
        }
    }

    const openModalForEdit = (student: Student) => {
        setEditingStudent(student);
        setIsModalOpen(true);
    };

    const openModalForNew = () => {
        setEditingStudent(null);
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingStudent(null);
    }

    return (
        <div className="space-y-6">
            {isModalOpen && <StudentModal student={editingStudent} onClose={closeModal} onSave={handleSaveStudent} />}
            
            {/* Mass Upload Section */}
            <Card>
                <h3 className="text-lg font-bold mb-2">Manajemen Siswa</h3>
                <p className="text-sm text-gray-600 mb-4">Tambah, edit, atau unggah data siswa secara massal.</p>
                 {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                 {message && <p className="mb-4 text-sm text-green-700 bg-green-100 p-3 rounded-lg">{message}</p>}

                <div className="flex flex-wrap items-center gap-4">
                    <Button onClick={openModalForNew}>+ Tambah Siswa</Button>
                    <div className="relative">
                        <Button as="label" htmlFor="file-upload" variant="secondary" disabled={isUploading}>
                            {isUploading ? <Spinner size="sm" /> : 'Unggah File Massal'}
                        </Button>
                        <input id="file-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="sr-only" disabled={isUploading} />
                    </div>
                </div>
                 <p className="text-xs text-gray-500 mt-3">Format file massal: Kolom `nama`, `kelas`, `jenis kelamin`, dan `nisn` (opsional).</p>
            </Card>

            {/* Student List Section */}
            <Card>
                <h3 className="text-lg font-bold mb-4">Daftar Siswa</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NISN</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map(student => (
                                <tr key={student.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.full_name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade}{student.class_letter}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{student.nisn || '-'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <Button size="sm" variant="secondary" onClick={() => openModalForEdit(student)}>Edit</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {students.length === 0 && <p className="text-center py-4 text-gray-500">Belum ada data siswa.</p>}
                </div>
            </Card>
        </div>
    );
};

export default StudentManagementView;