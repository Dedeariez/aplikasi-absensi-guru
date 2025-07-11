

import { createClient, Session, User } from '@supabase/supabase-js';
import { Profile, UserRole, Student, AuditLogEntry, AttendanceRecord, AttendanceStatus } from '../types';

// Menggunakan kredensial Supabase yang disediakan secara langsung.
const supabaseUrl = 'https://yruzgaflsealftckcuwc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydXpnYWZsc2VhbGZ0Y2tjdXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMTQ3MjEsImV4cCI6MjA2Nzc5MDcyMX0.cgXUvH9sqC9kDb0fDNMZp-8ySrfWL3cSJyolqr9k0Pc';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: 'teacher' | 'parent';
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string;
          role?: 'teacher' | 'parent';
        };
        Update: {
          full_name?: string;
          email?: string;
          role?: 'teacher' | 'parent';
        };
      };
      students: {
        Row: {
          id: string;
          full_name: string;
          grade: number;
          class_letter: 'A' | 'B';
          gender: 'L' | 'P';
          nisn: string | null;
          parent_id: string | null;
        };
        Insert: {
          full_name: string;
          grade: number;
          class_letter: 'A' | 'B';
          gender: 'L' | 'P';
          nisn?: string | null;
          parent_id?: string | null;
        };
        Update: {
          full_name?: string;
          grade?: number;
          class_letter?: 'A' | 'B';
          gender?: 'L' | 'P';
          nisn?: string | null;
          parent_id?: string | null;
        };
      };
      attendance: {
        Row: {
          id: number;
          student_id: string;
          date: string;
          lesson_hour: number;
          status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Tidur';
          taken_by_teacher_id: string;
        };
        Insert: {
          student_id: string;
          date: string;
          lesson_hour: number;
          status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Tidur';
          taken_by_teacher_id: string;
        };
        Update: {
          student_id?: string;
          date?: string;
          lesson_hour?: number;
          status?: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Tidur';
          taken_by_teacher_id?: string;
        };
      };
      audit_log: {
        Row: {
          id: number;
          created_at: string;
          user_email: string;
          action: string;
        };
        Insert: {
          action: string;
          user_email: string;
        };
        Update: {
          action?: string;
          user_email?: string;
        };
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
            role: user.user_metadata.role || UserRole.PARENT, // Default to parent on error
        };
    }
    // The returned data is structurally compatible with Profile
    return data as Profile | null;
};

export const getStudents = async (): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').order('full_name');
    if (error) {
        console.error("Error fetching students:", error);
        return [];
    }
    return (data as Student[]) || [];
};

export const getStudentsByParent = async (parentId: string): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').eq('parent_id', parentId);
    if (error) {
        console.error("Error fetching students for parent:", error);
        return [];
    }
    return (data as Student[]) || [];
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
    // The data from DB is compatible with AttendanceRecord[]
    // because the extra student_name field is optional.
    return (data as AttendanceRecord[]) || [];
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }
    return (data as AuditLogEntry[]) || [];
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
        attendanceByStudentId.get(record.student_id)!.push(record as AttendanceRecord);
    }

    return (students as Student[]).map(student => ({
        ...student,
        records: attendanceByStudentId.get(student.id) || []
    }));
};

export const updateProfileRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
};