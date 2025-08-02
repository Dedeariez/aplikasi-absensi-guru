

import { createClient } from '@supabase/supabase-js';
import { User, ReportRow, WeeklySummary } from '../types.ts';

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          details: string
          id: number
          timestamp: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          details: string
          id?: number
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          details?: string
          id?: number
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          email: string
          id: string
          name: string
          role: "guru" | "orangtua"
        }
        Insert: {
          email: string
          id: string
          name: string
          role?: "guru" | "orangtua"
        }
        Update: {
          email?: string
          id?: string
          name?: string
          role?: "guru" | "orangtua"
        }
        Relationships: []
      }
      students: {
        Row: {
          class_level: number
          class_name: string
          created_at: string
          dob: string | null
          gender: "L" | "P"
          id: string
          is_active: boolean
          name: string
          nisn: string | null
        }
        Insert: {
          class_level: number
          class_name: string
          created_at?: string
          dob?: string | null
          gender: "L" | "P"
          id?: string
          is_active?: boolean
          name: string
          nisn?: string | null
        }
        Update: {
          class_level?: number
          class_name?: string
          created_at?: string
          dob?: string | null
          gender?: "L" | "P"
          id?: string
          is_active?: boolean
          name?: string
          nisn?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          id: number
          student_id: string
          date: string
          hour: number
          status: "H" | "I" | "S" | "A" | "T"
          created_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          student_id: string
          date: string
          hour: number
          status: "H" | "I" | "S" | "A" | "T"
          created_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          student_id?: string
          date?: string
          hour?: number
          status?: "H" | "I" | "S" | "A" | "T"
          created_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_student_attendance_for_parent: {
        Args: {
          p_nisn?: string
          p_name?: string
          p_dob?: string
        }
        Returns: {
          student_id: string
          student_name: string
          class_name: string
          attendance_date: string
          hour: number
          status: "H" | "I" | "S" | "A" | "T"
        }[]
      }
      get_report_data: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_class_level: number
        }
        Returns: ReportRow[]
      }
      get_weekly_attendance_summary: {
        Args: Record<string, never>
        Returns: WeeklySummary[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

const supabaseUrl = 'https://uqlsxagcbvoiyxtjflnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbHN4YWdjYnZvaXl4dGpmbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTY0MzUsImV4cCI6MjA2OTI3MjQzNX0.IZlc37ZeJwF5nfvHHf8zLDlmXu8pFS0BRfXf_vnSiO8';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Fetches the user's profile from the 'profiles' table.
 * @param userId The ID of the user to fetch.
 * @returns A promise that resolves to the user's profile or null if not found or on error.
 */
export async function getProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
    }
    
    return data;
}