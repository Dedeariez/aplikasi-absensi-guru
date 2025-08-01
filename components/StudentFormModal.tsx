
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal.tsx';
import Button from './ui/Button.tsx';
import Input from './ui/Input.tsx';
import { Student, Gender } from '../types.ts';

interface StudentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (student: Omit<Student, 'id' | 'created_at'>) => void;
    student: Student | null; // null for adding, Student object for editing
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({ isOpen, onClose, onSave, student }) => {
    const [name, setName] = useState('');
    const [classLevel, setClassLevel] = useState<10 | 11 | 12>(10);
    const [gender, setGender] = useState<Gender>(Gender.Male);
    const [nisn, setNisn] = useState('');
    const [dob, setDob] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (student) {
            setName(student.name);
            setClassLevel(student.class_level);
            setGender(student.gender);
            setNisn(student.nisn || '');
            setDob(student.dob || '');
        } else {
            // Reset form for adding new student
            setName('');
            setClassLevel(10);
            setGender(Gender.Male);
            setNisn('');
            setDob('');
        }
        setError('');
    }, [student, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Nama siswa tidak boleh kosong.');
            return;
        }

        const className = `${classLevel}-${gender === Gender.Male ? 'A' : 'B'}`;
        
        const studentData: Omit<Student, 'id' | 'created_at'> = {
            name: name.trim(),
            class_level: classLevel,
            class_name: className,
            gender,
            nisn: nisn.trim() || null,
            dob: dob.trim() || null,
            is_active: student?.is_active ?? true,
        };

        onSave(studentData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={student ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                    <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700">Kelas</label>
                        <select
                            id="classLevel"
                            value={classLevel}
                            onChange={e => setClassLevel(parseInt(e.target.value, 10) as 10 | 11 | 12)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                            <option value={10}>10</option>
                            <option value={11}>11</option>
                            <option value={12}>12</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Jenis Kelamin</label>
                        <select
                            id="gender"
                            value={gender}
                            onChange={e => setGender(e.target.value as Gender)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                            <option value={Gender.Male}>Laki-laki (A)</option>
                            <option value={Gender.Female}>Perempuan (B)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="nisn" className="block text-sm font-medium text-gray-700">NISN (Opsional)</label>
                    <Input id="nisn" type="text" value={nisn} onChange={e => setNisn(e.target.value)} className="mt-1" placeholder="Contoh: 1234567890" />
                </div>
                
                 <div>
                    <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Tanggal Lahir (Opsional)</label>
                    <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} className="mt-1" />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="mt-6 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan Data</Button>
                </div>
            </form>
        </Modal>
    );
};

export default StudentFormModal;