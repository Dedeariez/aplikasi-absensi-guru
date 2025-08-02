
import React, { useState } from 'react';
import Modal from './ui/Modal.tsx';
import Button from './ui/Button.tsx';
import { Upload, FileCheck, AlertCircle, Loader2, Download } from 'lucide-react';
import { Student, Gender } from '../types.ts';
import * as XLSX from 'xlsx';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (newStudents: Omit<Student, 'id' | 'created_at' | 'is_active'>[]) => void;
    addAuditLog: (action: string, details: string) => Promise<void>;
}

type ValidationStatus = 'valid' | 'invalid' | 'unchecked';

interface StagedStudent {
    data: { Nama: string; Kelas: string; 'Jenis Kelamin': string; NISN?: string; };
    status: ValidationStatus;
    message?: string;
    processed?: Omit<Student, 'id' | 'created_at' | 'is_active'>;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, addAuditLog }) => {
    const [file, setFile] = useState<File | null>(null);
    const [stagedStudents, setStagedStudents] = useState<StagedStudent[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setIsProcessing(true);
            setError('');
            setStagedStudents([]);

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = event.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    processData(json);
                } catch (err) {
                    console.error("Error parsing Excel file:", err);
                    setError("Gagal memproses file. Pastikan format file benar (XLSX, XLS, CSV).");
                    setIsProcessing(false);
                }
            };
            reader.onerror = (err) => {
                 console.error("Error reading file:", err);
                 setError("Gagal membaca file.");
                 setIsProcessing(false);
            }
            reader.readAsArrayBuffer(selectedFile);
        }
    };
    
    const processData = (data: any[]) => {
        if (!data || data.length === 0) {
            setError("File Excel kosong atau tidak memiliki data.");
            setIsProcessing(false);
            return;
        }

        const processed = data.map(row => {
            const newStudent: StagedStudent = { data: row, status: 'valid' };
            // Normalize keys to handle case-insensitivity from Excel files
            const name = row['Nama'] || row['nama'];
            const classLevelStr = row['Kelas'] || row['kelas'];
            const gender = row['Jenis Kelamin'] || row['jenis kelamin'];
            const nisn = row['NISN'] || row['nisn'];
            
            if (!name || !classLevelStr || !gender) {
                 newStudent.status = 'invalid';
                 newStudent.message = 'Kolom "Nama", "Kelas", dan "Jenis Kelamin" wajib diisi.';
                 return newStudent;
            }

            const classLevel = parseInt(String(classLevelStr), 10);

            if (!name) {
                newStudent.status = 'invalid';
                newStudent.message = 'Kolom "Nama" tidak boleh kosong.';
            } else if (![10, 11, 12].includes(classLevel)) {
                newStudent.status = 'invalid';
                newStudent.message = 'Kolom "Kelas" tidak valid (harus 10, 11, atau 12).';
            } else if (String(gender)?.toUpperCase() !== 'L' && String(gender)?.toUpperCase() !== 'P') {
                newStudent.status = 'invalid';
                newStudent.message = 'Kolom "Jenis Kelamin" tidak valid (harus L atau P).';
            } else {
                const studentGender = String(gender).toUpperCase() as Gender;
                const className = `${classLevel}-${studentGender === Gender.Male ? 'A' : 'B'}`;
                newStudent.processed = {
                    name: name,
                    class_level: classLevel as 10 | 11 | 12,
                    class_name: className,
                    gender: studentGender,
                    nisn: nisn
                };
            }
            return newStudent;
        });
        setStagedStudents(processed);
        setIsProcessing(false);
    };
    
    // This function would generate and download a sample Excel file.
    const downloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([
            { 'Nama': 'Budi Hartono', 'Kelas': 10, 'Jenis Kelamin': 'L', 'NISN': '1234567890' },
            { 'Nama': 'Citra Lestari', 'Kelas': 11, 'Jenis Kelamin': 'P', 'NISN': ''}
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Siswa");
        XLSX.writeFile(workbook, "template_impor_siswa.xlsx");
    };

    const handleImportClick = () => {
        const validStudents = stagedStudents
            .filter(s => s.status === 'valid' && s.processed)
            .map(s => s.processed!);
        onImport(validStudents);
        resetState();
    };

    const resetState = () => {
        setFile(null);
        setStagedStudents([]);
        setIsProcessing(false);
        setError('');
        onClose();
    }

    const validCount = stagedStudents.filter(s => s.status === 'valid').length;
    const invalidCount = stagedStudents.length - validCount;
    
    return (
        <Modal isOpen={isOpen} onClose={resetState} title="Impor Data Siswa dari Excel">
            {!file ? (
                <div>
                     <div className="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50" role="alert">
                        <span className="font-medium">Petunjuk Impor:</span>
                        <ul className="mt-1.5 ml-4 list-disc list-inside">
                            <li>Gunakan template yang kami sediakan untuk format yang benar.</li>
                            <li>Kolom yang dibutuhkan: <strong>Nama, Kelas, Jenis Kelamin</strong>.</li>
                            <li>Kolom <strong>NISN</strong> bersifat opsional (boleh dikosongi).</li>
                            <li><strong>Kelas</strong> diisi angka: 10, 11, atau 12.</li>
                            <li><strong>Jenis Kelamin</strong> diisi: 'L' untuk Laki-laki, 'P' untuk Perempuan.</li>
                        </ul>
                    </div>
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg relative">
                        <Upload className="w-12 h-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">Seret file Excel ke sini, atau klik untuk memilih</p>
                        <input type="file" className="absolute w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
                    </div>
                     <div className="mt-4 text-center">
                        <Button variant="secondary" onClick={downloadTemplate}>
                            <Download className="h-4 w-4 mr-2" />
                            Unduh Template Excel
                        </Button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="mb-4">
                        <p className="font-semibold text-gray-700">File: {file.name}</p>
                        {isProcessing ? (
                            <div className="flex items-center text-gray-500 mt-2">
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                <span>Memvalidasi data...</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center text-green-600">
                                        <FileCheck className="h-5 w-5 mr-1" /> {validCount} baris valid
                                    </div>
                                    {invalidCount > 0 && <div className="flex items-center text-red-600">
                                        <AlertCircle className="h-5 w-5 mr-1" /> {invalidCount} baris tidak valid
                                    </div>}
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                           </>
                        )}
                    </div>

                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left">Nama</th>
                                    <th className="p-2 text-left">Kelas</th>
                                    <th className="p-2 text-left">Gender</th>
                                    <th className="p-2 text-left">NISN</th>
                                    <th className="p-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedStudents.map((student, index) => (
                                    <tr key={index} className={student.status === 'invalid' ? 'bg-red-50' : 'bg-white'}>
                                        <td className="p-2 border-t">{student.data['Nama']}</td>
                                        <td className="p-2 border-t">{student.data['Kelas']}</td>
                                        <td className="p-2 border-t">{student.data['Jenis Kelamin']}</td>
                                        <td className="p-2 border-t">{student.data.NISN || '-'}</td>
                                        <td className="p-2 border-t">
                                            {student.status === 'valid' && <span className="text-green-600 font-medium">Valid</span>}
                                            {student.status === 'invalid' && <span className="text-red-600 font-medium cursor-pointer" title={student.message}>Gagal</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className="mt-6 flex justify-end space-x-2">
                <Button variant="secondary" onClick={resetState}>Batal</Button>
                <Button onClick={handleImportClick} disabled={!stagedStudents.length || validCount === 0 || isProcessing}>
                    Impor {validCount > 0 ? `${validCount} Siswa` : ''}
                </Button>
            </div>
        </Modal>
    );
};

export default ImportModal;