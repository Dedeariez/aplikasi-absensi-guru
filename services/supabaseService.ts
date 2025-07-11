

import { createClient, Session, User } from '@supabase/supabase-js';
import { Profile, UserRole, Student, AuditLogEntry, AttendanceRecord, AttendanceStatus } from '../types';

// Menggunakan kredensial Supabase yang disediakan secara langsung.
const supabaseUrl = 'https://yruzgaflsealftckcuwc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydXpnYWZsc2VhbGZ0Y2tjdXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMTQ3MjEsImV4cCI6MjA2Nzc5MDcyMX0.cgXUvH9sqC9kDb0fDNMZp-8ySrfWL3cSJyolqr9k0Pc';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// This is a strict representation of the attendance table in the database.
interface AttendanceTableRow {
    id: number;
    student_id: string;
    date: string;
    lesson_hour: number;
    status: AttendanceStatus;
    taken_by_teacher_id: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      students: {
        Row: Student;
        Insert: Omit<Student, 'id'>;
        Update: Partial<Omit<Student, 'id'>>;
      };
      attendance: {
        Row: AttendanceTableRow;
        Insert: Omit<AttendanceTableRow, 'id'>;
        Update: Partial<Omit<AttendanceTableRow, 'id'>>;
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Omit<AuditLogEntry, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'teacher' | 'parent';
      student_gender: 'L' | 'P';
      attendance_status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Tidur';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);


// --- API Functions using the real client ---

export const getProfile = async (user: User): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata.full_name || 'Pengguna Baru',
            role: user.user_metadata.role || UserRole.TEACHER,
        };
    }
    return data;
};

export const getStudents = async (): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').order('full_name');
    if (error) {
        console.error("Error fetching students:", error);
        return [];
    }
    return data || [];
};

export const getStudentsByParent = async (parentId: string): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').eq('parent_id', parentId);
    if (error) {
        console.error("Error fetching students for parent:", error);
        return [];
    }
    return data || [];
};

export const getAttendanceByStudentIds = async (studentIds: string[]): Promise<AttendanceRecord[]> => {
    if (studentIds.length === 0) return [];
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('student_id', studentIds)
        .order('date', { ascending: false });

    if (error) {
        console.error("Error fetching attendance records:", error);
        return [];
    }
    // The data is AttendanceTableRow[], which is compatible with AttendanceRecord[]
    // because the extra student_name field is optional.
    return data || [];
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }
    return data || [];
};

export const addAuditLog = async (action: string, userEmail: string) => {
    console.log(`AUDIT: [${userEmail}] ${action}`);
    const { error } = await supabase.from('audit_log').insert([{ action, user_email: userEmail }]);
    if(error) console.error("Error adding audit log:", error);
};

export const uploadStudents = async (students: Omit<Student, 'id'>[]) => {
    const { data, error } = await supabase.from('students').insert(students).select();
    if (error) {
        console.error('Error uploading students:', error);
        throw error;
    }
    return data;
}

export const addStudent = async (student: Omit<Student, 'id'>) => {
    const { data, error } = await supabase.from('students').insert([student]).select().single();
    if (error) throw error;
    return data;
};

export const updateStudent = async (studentId: string, updates: Partial<Omit<Student, 'id'>>) => {
    const { data, error } = await supabase.from('students').update(updates).eq('id', studentId).select().single();
    if (error) throw error;
    return data;
};


export const saveAttendanceRecords = async (records: Omit<AttendanceRecord, 'id' | 'student_name'>[]) => {
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date,lesson_hour' });
    if (error) {
        console.error('Error saving attendance:', error);
        throw error;
    }
}

export const getAttendanceForReport = async () => {
    const { data: students, error: studentError } = await supabase.from('students').select('*').order('grade,class_letter,full_name');
    if (studentError) throw studentError;

    const { data: attendance, error: attendanceError } = await supabase.from('attendance').select('*');
    if (attendanceError) throw attendanceError;
    
    const attendanceByStudentId = new Map<string, AttendanceRecord[]>();
    for (const record of (attendance || [])) {
        if (!attendanceByStudentId.has(record.student_id)) {
            attendanceByStudentId.set(record.student_id, []);
        }
        attendanceByStudentId.get(record.student_id)!.push(record);
    }

    return students.map(student => ({
        ...student,
        records: attendanceByStudentId.get(student.id) || []
    }));
}