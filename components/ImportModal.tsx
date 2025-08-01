
import React, { useState } from 'react';
import Modal from './ui/Modal.tsx';
import Button from './ui/Button.tsx';
import { Upload, FileCheck, AlertCircle, Loader2, Download } from 'lucide-react';
import { Student, Gender } from '../types.ts';

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

const mockExcelData = [
    { 'Nama': 'Chandra Wijaya', 'Kelas': '10', 'Jenis Kelamin': 'L', 'NISN': '123123123' },
    { 'Nama': 'Rina Kartika', 'Kelas': '10', 'Jenis Kelamin': 'P' },
    { 'Nama': 'Joko Susilo', 'Kelas': '13', 'Jenis Kelamin': 'L' }, // Invalid class
    { 'Nama': 'Sari Dewi', 'Kelas': '11', 'Jenis Kelamin': 'Wanita' }, // Invalid gender
    { 'Nama': '', 'Kelas': '12', 'Jenis Kelamin': 'P' }, // Missing name
];

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, addAuditLog }) => {
    const [file, setFile] = useState<File | null>(null);
    const [stagedStudents, setStagedStudents] = useState<StagedStudent[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            // In a real app, you'd parse the excel file here using a library like 'xlsx'.
            // For this demo, we'll simulate parsing and use mock data.
            processData(mockExcelData);
        }
    };
    
    const processData = (data: any[]) => {
        setIsProcessing(true);
        setStagedStudents([]);

        setTimeout(() => { // Simulate processing delay
            const processed = data.map(row => {
                const newStudent: StagedStudent = { data: row, status: 'valid' };
                // Normalize keys to handle case-insensitivity from Excel files
                const name = row['Nama'] || row['nama'];
                const classLevelStr = row['Kelas'] || row['kelas'];
                const gender = row['Jenis Kelamin'] || row['jenis kelamin'];
                const nisn = row['NISN'] || row['nisn'];
                
                const classLevel = parseInt(classLevelStr, 10);

                if (!name) {
                    newStudent.status = 'invalid';
                    newStudent.message = 'Kolom "Nama" tidak boleh kosong.';
                } else if (![10, 11, 12].includes(classLevel)) {
                    newStudent.status = 'invalid';
                    newStudent.message = 'Kolom "Kelas" tidak valid (harus 10, 11, atau 12).';
                } else if (gender?.toUpperCase() !== 'L' && gender?.toUpperCase() !== 'P') {
                    newStudent.status = 'invalid';
                    newStudent.message = 'Kolom "Jenis Kelamin" tidak valid (harus L atau P).';
                } else {
                    const studentGender = gender.toUpperCase() as Gender;
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
        }, 1000);
    };
    
    // This function would generate and download a sample Excel file.
    const downloadTemplate = () => {
        // In a real app, use a library like 'xlsx' to create a blob and download it.
        const headers = "Nama,Kelas,Jenis Kelamin,NISN\n";
        const example1 = "Budi Hartono,10,L,1234567890\n";
        const example2 = "Citra Lestari,11,P,\n"; // Example with optional NISN
        const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + example1 + example2);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "template_impor_siswa.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        const validStudents = stagedStudents
            .filter(s => s.status === 'valid' && s.processed)
            .map(s => s.processed!);
        onImport(validStudents);
        // addAuditLog is now called in the parent component after successful import
        resetState();
    };

    const resetState = () => {
        setFile(null);
        setStagedStudents([]);
        setIsProcessing(false);
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
                            <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center text-green-600">
                                    <FileCheck className="h-5 w-5 mr-1" /> {validCount} baris valid
                                </div>
                                {invalidCount > 0 && <div className="flex items-center text-red-600">
                                    <AlertCircle className="h-5 w-5 mr-1" /> {invalidCount} baris tidak valid
                                </div>}
                            </div>
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