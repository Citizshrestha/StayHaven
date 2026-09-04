/**
 * Guest Dashboard - Profile View
 * User profile management with edit functionality
 */

import React, { useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile } from "../guestDashboardApi";
import { toast } from 'react-toastify';
import {
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  Loader2,
  Award,
  Wallet,
  CalendarCheck,
} from 'lucide-react';

const ProfileView = () => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    fullname: '',
    contact: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await getUserProfile();
      if (res?.success) {
        // API returns { success: true, data: { profile: {...}, stats: {...} } }
        setProfile(res.data?.profile);
        setStats(res.data?.stats);
        setFormData({
          fullname: res.data?.profile?.fullname || '',
          contact: res.data?.profile?.contact || '',
        });
      }
    } catch (error) {
      console.error('Profile load error:', error);
      toast.error(error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await updateUserProfile(formData);
      if (res?.success) {
        toast.success('Profile updated successfully');
        setEditing(false);
        loadProfile();
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({
      fullname: profile?.fullname || '',
      contact: profile?.contact || '',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b1220]">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  const { fullname, email, contact, profilePicture, role, createdAt } = profile || {};
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : 'N/A';

  const EditToggle = ({ compact }) =>
    !editing ? (
      <button
        onClick={() => setEditing(true)}
        className={`flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/20 transition-all ${compact ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5'}`}
      >
        <Edit2 className="w-4 h-4" />
        Edit Profile
      </button>
    ) : (
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all disabled:opacity-50 ${compact ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5'}`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        <button
          onClick={handleCancelEdit}
          className={`flex items-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all ${compact ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5'}`}
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    );

  return (
    <div className="min-h-screen pb-24 lg:pb-8 bg-gray-50 dark:bg-[#0b1220]">
      {/* Header */}
      <div className="hidden lg:block bg-white/90 dark:bg-[#0f1c2e]/90 backdrop-blur-lg border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage your account information</p>
          </div>
          <EditToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-8">
        <div className="lg:hidden mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">Profile</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Manage your account</p>
          </div>
          <EditToggle compact />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="relative bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <div className="px-6 pb-6 -mt-10 text-center">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={fullname}
                    className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white dark:border-[#0f1c2e] shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-[#0f1c2e] shadow-md">
                    {fullname?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                )}
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-3">{fullname}</h2>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 capitalize">
                  {role}
                </span>
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500 dark:text-gray-400">Member since</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{memberSince}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats + Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={Award} label="Total Stays" value={stats?.totalBookings || 0} />
              <StatCard icon={Wallet} label="Total Spent" value={`NPR ${stats?.totalSpent?.toFixed(0) || 0}`} />
              <StatCard icon={CalendarCheck} label="Active Bookings" value={stats?.activeBookings || 0} />
            </div>

            {/* Profile Details */}
            <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-white/5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Contact Information</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 block">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.fullname}
                      onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{fullname}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 block">Email</label>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Email cannot be changed</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 block">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{contact || 'Not provided'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-4">
    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center mb-3">
      <Icon className="w-[18px] h-[18px] text-teal-600 dark:text-teal-400" />
    </div>
    <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
  </div>
);

export default ProfileView;
