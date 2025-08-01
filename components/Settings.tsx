import React, { useState } from 'react';
import { User } from '../types.ts';
import Card from './ui/Card.tsx';
import Input from './ui/Input.tsx';
import Button from './ui/Button.tsx';
import { Shield, UserCircle, Bell, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';

interface SettingsProps {
    user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const [name, setName] = useState(user.name);
    const [email] = useState(user.email);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState({ profile: false, password: false });
    const [message, setMessage] = useState({ profile: '', password: '' });
    const [error, setError] = useState({ profile: '', password: '' });

    const clearMessages = () => {
        setMessage({ profile: '', password: '' });
        setError({ profile: '', password: '' });
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();
        setLoading(prev => ({ ...prev, profile: true }));

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ name: name })
            .eq('id', user.id);

        if (updateError) {
            setError(prev => ({...prev, profile: `Gagal memperbarui profil: ${updateError.message}`}));
        } else {
            setMessage(prev => ({...prev, profile: 'Profil berhasil diperbarui. Nama di header akan berubah setelah Anda login ulang.'}));
        }
        setLoading(prev => ({ ...prev, profile: false }));
    };
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();
        setLoading(prev => ({ ...prev, password: true }));

        if (newPassword !== confirmPassword) {
            setError(prev => ({...prev, password: "Password baru tidak cocok."}));
            setLoading(prev => ({ ...prev, password: false }));
            return;
        }
        if(!newPassword) {
            setError(prev => ({...prev, password: "Password baru tidak boleh kosong."}));
            setLoading(prev => ({ ...prev, password: false }));
            return;
        }
        
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
             setError(prev => ({...prev, password: `Gagal mengubah password: ${updateError.message}`}));
        } else {
             setMessage(prev => ({...prev, password: "Password berhasil diubah."}));
             setNewPassword('');
             setConfirmPassword('');
        }
        setLoading(prev => ({ ...prev, password: false }));
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* User Profile Card */}
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <UserCircle className="mr-2 h-6 w-6 text-primary-600" />
                            Profil Pengguna
                        </h2>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama</label>
                                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" disabled={loading.profile}/>
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <Input id="email" type="email" value={email} disabled className="mt-1 bg-gray-100 cursor-not-allowed" />
                            </div>
                            {message.profile && <p className="text-green-600 text-sm">{message.profile}</p>}
                            {error.profile && <p className="text-red-600 text-sm">{error.profile}</p>}
                            <div className="text-right">
                                <Button type="submit" disabled={loading.profile}>
                                    {loading.profile && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Simpan Profil
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Change Password Card */}
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <Shield className="mr-2 h-6 w-6 text-primary-600" />
                            Ubah Password
                        </h2>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                             <div>
                                <label htmlFor="newPassword"  className="block text-sm font-medium text-gray-700">Password Baru</label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" required disabled={loading.password}/>
                            </div>
                             <div>
                                <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" required disabled={loading.password}/>
                            </div>
                            {message.password && <p className="text-green-600 text-sm">{message.password}</p>}
                            {error.password && <p className="text-red-600 text-sm">{error.password}</p>}
                            <div className="text-right">
                                <Button type="submit" disabled={loading.password}>
                                    {loading.password && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Ubah Password
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Application Settings Card */}
                     <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <Bell className="mr-2 h-6 w-6 text-primary-600" />
                            Notifikasi
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label htmlFor="email-notifications" className="text-sm text-gray-600">Peringatan kehadiran rendah</label>
                                <input type="checkbox" id="email-notifications" className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" defaultChecked/>
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="new-feature-updates" className="text-sm text-gray-600">Update fitur baru</label>
                                <input type="checkbox" id="new-feature-updates" className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tampilan</h2>
                        <div className="flex items-center justify-between">
                            <label htmlFor="dark-mode" className="text-sm text-gray-600">Mode Gelap</label>
                            <button
                                type="button"
                                className={`${darkMode ? 'bg-primary-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-primary-500 focus:ring-offset-2`}
                                role="switch"
                                aria-checked={darkMode}
                                onClick={() => setDarkMode(!darkMode)}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`${darkMode ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                />
                            </button>
                        </div>
                    </Card>
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Akses Orang Tua</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Kelola akun orang tua untuk memberikan akses melihat data kehadiran anak mereka.
                        </p>
                        <Button variant="secondary" className="w-full" disabled title="Fitur akan datang di versi berikutnya">
                            Kelola Akun Orang Tua
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Settings;