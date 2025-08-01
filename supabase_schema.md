# Skema Database Supabase untuk Absensi Digital Darul Inayah

Salin dan jalankan seluruh skrip di bawah ini di **SQL Editor** pada dashboard Supabase Anda untuk menginisialisasi database.

```sql
-- Nonaktifkan RLS pada tabel Supabase internal (jika diperlukan, umumnya aman)
-- ALTER TABLE supabase.objects DISABLE ROW LEVEL SECURITY;

-- ==== EXTENSIONS (Jika belum aktif) ====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==== 1. TABLE: profiles ====
-- Menyimpan data pengguna (guru) yang terhubung ke sistem auth Supabase.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'guru'
);

-- Komentar untuk tabel dan kolom
COMMENT ON TABLE public.profiles IS 'Stores user profile information, linked to Supabase auth.';
COMMENT ON COLUMN public.profiles.id IS 'Links to the auth.users table.';
COMMENT ON COLUMN public.profiles.name IS 'Full name of the user.';

-- ==== 2. TABLE: students ====
-- Menyimpan data semua siswa.
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  class_level INT NOT NULL CHECK (class_level IN (10, 11, 12)),
  gender CHAR(1) NOT NULL CHECK (gender IN ('L', 'P')),
  class_name VARCHAR(10) NOT NULL, -- e.g., '10-A', '12-B'
  nisn VARCHAR(20) UNIQUE,
  dob DATE, -- Date of Birth for parent verification
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Komentar
COMMENT ON TABLE public.students IS 'Stores all student data.';
COMMENT ON COLUMN public.students.nisn IS 'Nomor Induk Siswa Nasional, must be unique if present.';
COMMENT ON COLUMN public.students.dob IS 'Date of birth, for parent verification.';

-- ==== 3. TABLE: attendance_records ====
-- Menyimpan catatan absensi harian per jam.
CREATE TABLE public.attendance_records (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INT NOT NULL CHECK (hour BETWEEN 1 AND 12),
  status CHAR(1) NOT NULL, -- H (Hadir), S (Sakit), I (Izin), A (Alpa)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id),
  UNIQUE(student_id, date, hour)
);

-- Komentar
COMMENT ON TABLE public.attendance_records IS 'Stores hourly attendance status for each student.';
COMMENT ON COLUMN public.attendance_records.status IS 'H: Hadir, S: Sakit, I: Izin, A: Alpa, T: Tunggu/Pending';

-- ==== 4. TABLE: audit_logs ====
-- Mencatat semua aktivitas penting.
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES public.profiles(id),
  user_name VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  details TEXT
);

-- Komentar
COMMENT ON TABLE public.audit_logs IS 'Records all significant user actions within the application.';

-- ==== SECURITY & ROW-LEVEL SECURITY (RLS) ====

-- Aktifkan RLS untuk semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan untuk 'profiles'
-- Pengguna hanya bisa melihat dan mengupdate profilnya sendiri.
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Kebijakan untuk 'students', 'attendance_records', 'audit_logs'
-- Guru yang terotentikasi bisa melakukan semua operasi (CRUD).
CREATE POLICY "Authenticated teachers can manage students."
  ON public.students FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated teachers can manage attendance."
  ON public.attendance_records FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated teachers can manage audit logs."
  ON public.audit_logs FOR ALL
  USING (auth.role() = 'authenticated');

-- ==== FUNCTIONS & TRIGGERS ====

-- 1. Trigger untuk membuat profil baru saat user mendaftar.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, 'guru');
  RETURN NEW;
END;
$$;

-- Hubungkan trigger ke tabel auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- 2. Fungsi RPC untuk Pengecekan oleh Orang Tua (AMAN)
-- Fungsi ini bisa dipanggil dari frontend tanpa login (sebagai 'anon' role).
CREATE OR REPLACE FUNCTION public.get_student_attendance_for_parent(p_nisn TEXT DEFAULT NULL, p_name TEXT DEFAULT NULL, p_dob DATE DEFAULT NULL)
RETURNS TABLE(
  student_id UUID,
  student_name VARCHAR,
  class_name VARCHAR,
  attendance_date DATE,
  hour INT,
  status CHAR(1)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    -- Validasi input
    IF p_nisn IS NULL AND (p_name IS NULL OR p_dob IS NULL) THEN
        RAISE EXCEPTION 'Harap berikan NISN atau kombinasi Nama dan Tanggal Lahir.';
    END IF;

    -- Cari siswa berdasarkan kriteria
    SELECT id INTO v_student_id
    FROM public.students s
    WHERE s.is_active = TRUE AND
    (
        (p_nisn IS NOT NULL AND s.nisn = p_nisn) OR
        (p_name IS NOT NULL AND p_dob IS NOT NULL AND lower(s.name) = lower(p_name) AND s.dob = p_dob)
    )
    LIMIT 1;

    -- Jika siswa ditemukan, kembalikan data kehadirannya untuk hari ini
    IF v_student_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            s.id AS student_id,
            s.name AS student_name,
            s.class_name,
            CURRENT_DATE AS attendance_date,
            jp.hour,
            COALESCE(ar.status, 'T') AS status -- 'T' for 'Tunggu' / Pending
        FROM public.students s
        CROSS JOIN (SELECT generate_series(1, 8) as hour) jp -- Asumsi 8 jam pelajaran
        LEFT JOIN public.attendance_records ar
            ON ar.student_id = s.id
            AND ar.date = CURRENT_DATE
            AND ar.hour = jp.hour
        WHERE s.id = v_student_id
        ORDER BY jp.hour;
    END IF;
END;
$$;

-- 3. Fungsi RPC untuk Laporan Absensi
CREATE OR REPLACE FUNCTION public.get_report_data(p_start_date DATE, p_end_date DATE, p_class_level INT DEFAULT 0)
RETURNS TABLE(
    student_id UUID,
    name VARCHAR,
    class_name VARCHAR,
    hadir_count BIGINT,
    sakit_count BIGINT,
    izin_count BIGINT,
    alpa_count BIGINT,
    total_days BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH daily_status AS (
        -- Menentukan status prioritas per siswa per hari
        -- (Jika ada 1 jam Alpa, hari itu dianggap Alpa)
        SELECT
            ar.student_id,
            ar.date,
            MAX(CASE 
                WHEN ar.status = 'A' THEN 4
                WHEN ar.status = 'S' THEN 3
                WHEN ar.status = 'I' THEN 2
                WHEN ar.status = 'H' THEN 1
                ELSE 0 END) as status_priority
        FROM public.attendance_records ar
        WHERE ar.date BETWEEN p_start_date AND p_end_date
        GROUP BY ar.student_id, ar.date
    )
    SELECT
        s.id as student_id,
        s.name,
        s.class_name,
        COALESCE(SUM(CASE WHEN ds.status_priority = 1 THEN 1 ELSE 0 END), 0) as hadir_count,
        COALESCE(SUM(CASE WHEN ds.status_priority = 3 THEN 1 ELSE 0 END), 0) as sakit_count,
        COALESCE(SUM(CASE WHEN ds.status_priority = 2 THEN 1 ELSE 0 END), 0) as izin_count,
        COALESCE(SUM(CASE WHEN ds.status_priority = 4 THEN 1 ELSE 0 END), 0) as alpa_count,
        COUNT(DISTINCT ds.date) as total_days
    FROM public.students s
    LEFT JOIN daily_status ds ON s.id = ds.student_id
    WHERE 
        s.is_active = TRUE AND
        (p_class_level = 0 OR s.class_level = p_class_level)
    GROUP BY s.id, s.name, s.class_name
    ORDER BY s.name;
END;
$$;


-- 4. Fungsi RPC untuk Grafik Dashboard Mingguan
CREATE OR REPLACE FUNCTION public.get_weekly_attendance_summary()
RETURNS TABLE(
    date DATE,
    percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as day
    ),
    daily_attendance AS (
        SELECT
            ar.date,
            COUNT(ar.id) as attended_hours
        FROM public.attendance_records ar
        WHERE ar.date >= CURRENT_DATE - INTERVAL '6 days' AND ar.status = 'H'
        GROUP BY ar.date
    ),
    active_students AS (
        SELECT COUNT(id) as total_students FROM public.students WHERE is_active = TRUE
    )
    SELECT
        ds.day as date,
        COALESCE(
            (da.attended_hours::NUMERIC / ((SELECT total_students FROM active_students) * 8)) * 100, 
            0
        )::NUMERIC(5,2) as percentage
    FROM date_series ds
    LEFT JOIN daily_attendance da ON ds.day = da.date
    ORDER BY ds.day;
END;
$$;


-- Berikan hak akses ke 'anon' dan 'authenticated'
GRANT EXECUTE ON FUNCTION public.get_student_attendance_for_parent(TEXT, TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_for_parent(TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_data(DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_attendance_summary() TO authenticated;

-- ==== AKHIR SKRIP ====
-- Setup Selesai.
```