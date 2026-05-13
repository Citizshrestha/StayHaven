/**
 * Guest Dashboard - Profile View
 * User profile management with edit functionality
 */

import React, { useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile } from "../guestDashboardApi";
import { useTheme } from '../../../../core/hooks/useTheme';
import { toast } from 'react-toastify';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  Loader2,
  Award,
  Star,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ProfileView = () => {
  const { isDark } = useTheme();
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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-linear-to-br from-slate-950 to-slate-900' : 'bg-linear-to-br from-purple-50 to-pink-50'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
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

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${isDark ? 'bg-linear-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100' : 'bg-linear-to-br from-purple-50 via-pink-50 to-red-50'}`}>
      {/* Header */}
      <div className="hidden md:block bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information</p>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8 pb-8">
        <div className="md:hidden mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">Profile</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Manage your account</p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-2 bg-green-500 text-white rounded-xl font-semibold hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 text-center border border-gray-100 dark:border-slate-800">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={fullname}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-purple-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                  {fullname?.charAt(0) || 'G'}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{fullname}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Member since</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{memberSince}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Award}
                label="Total Stays"
                value={stats?.totalBookings || 0}
                color="text-purple-600"
                bgColor="bg-purple-50"
                darkBgColor="dark:bg-purple-900/20"
              />
              <StatCard
                icon={Star}
                label="Total Spent"
                value={`NPR ${stats?.totalSpent?.toFixed(0) || 0}`}
                color="text-pink-600"
                bgColor="bg-pink-50"
                darkBgColor="dark:bg-pink-900/20"
              />
              <StatCard
                icon={Calendar}
                label="Active Bookings"
                value={stats?.activeBookings || 0}
                color="text-blue-600"
                bgColor="bg-blue-50"
                darkBgColor="dark:bg-blue-900/20"
              />
            </div>

            {/* Profile Details */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 border border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.fullname}
                      onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-gray-100">{fullname}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <p className="font-medium text-gray-900 dark:text-gray-100">{email}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <p className="font-medium text-gray-900 dark:text-gray-100">{contact || 'Not provided'}</p>
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

const StatCard = ({ icon: Icon, label, value, color, bgColor, darkBgColor }) => (
  <div className={`${bgColor} ${darkBgColor} rounded-lg shadow-sm p-4`}>
    <div className="flex items-center gap-3">
      <Icon className={`w-6 h-6 ${color}`} />
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  </div>
);

export default ProfileView;
