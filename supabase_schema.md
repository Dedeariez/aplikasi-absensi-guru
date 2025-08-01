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

-- Berikan hak akses ke 'anon' role agar bisa dipanggil dari frontend tanpa login
GRANT EXECUTE ON FUNCTION public.get_student_attendance_for_parent(TEXT, TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_for_parent(TEXT, TEXT, DATE) TO authenticated;

-- ==== AKHIR SKRIP ====
-- Setup Selesai.
```
