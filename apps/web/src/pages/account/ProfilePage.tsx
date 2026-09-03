import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usersApi, authApi } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { User, Lock, Shield, Laptop, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone || '');
      setCompanyName(user.companyName || '');
    }
    authApi.listSessions().then((res) => {
      if (res.data.success && res.data.data) {
        setSessions(res.data.data);
      }
    });
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    try {
      await usersApi.updateProfile({
        name: profileName,
        phone: profilePhone,
        companyName,
      });
      setProfileSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('This will log you out of all active devices. Continue?')) return;
    await authApi.logoutAll();
    logout();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account & Security</h1>
        <p className="text-sm text-slate-500">Manage your credentials, business identity, and login sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500">{user?.email}</span>
                <Badge variant="outline">{user?.role}</Badge>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <Input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+91..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company / Store Name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Optional company name"
              />
            </div>

            {profileSuccess && (
              <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully
              </div>
            )}

            <Button type="submit" size="sm" disabled={profileLoading} className="bg-sky-600 hover:bg-sky-500">
              {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </Card>

        {/* Change Password Card */}
        <Card className="p-6 border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-600" /> Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {passwordError && (
              <div className="p-2.5 rounded-md bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Password changed successfully
              </div>
            )}

            <Button type="submit" size="sm" disabled={passwordLoading} className="bg-slate-900 hover:bg-slate-800">
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="p-6 border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-sky-600" /> Active Device Sessions
            </h3>
            <p className="text-xs text-slate-500">Devices currently signed into this courier account</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleLogoutAll} className="text-xs">
            Logout All Devices
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {sessions.map((sess) => (
            <div key={sess.id} className="py-3 flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-slate-800">{sess.userAgent || 'Web Browser'}</p>
                <p className="text-slate-400 mt-0.5">
                  IP: {sess.ipAddress || '127.0.0.1'} • Started: {new Date(sess.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Active</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
