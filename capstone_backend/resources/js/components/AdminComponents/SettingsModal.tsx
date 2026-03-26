import React, { useState, useEffect } from 'react';
import axios from "axios";
import {
    Settings, User, Info, Monitor, Sun, Moon,
    Globe, ChevronRight, Check, Save, Shield,
    Bell, Lock, Palette, Languages, FileText, HelpCircle, X,
    Camera
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SettingsModal({ onClose }: { onClose: () => void }) {

    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!user) {
        alert("Session expired. Please login again.");
        window.location.replace("/");
        return null;
    }
    const [activeSection, setActiveSection] = useState('profile');
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('en');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Profile form state - populated from auth (matches your users table)
    const [profile, setProfile] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        contact_number: user?.contact_number || '',
        address: user?.address || '',
    });

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const sections = [
        { id: 'profile', name: 'Profile', icon: User, description: 'Personal information and account details' },
        { id: 'general', name: 'General', icon: Settings, description: 'Appearance, language, and notifications' },
        { id: 'security', name: 'Security', icon: Lock, description: 'Password and authentication settings' },
        { id: 'preferences', name: 'Preferences', icon: Palette, description: 'Customize your experience' },
        { id: 'about', name: 'About', icon: Info, description: 'Application information and support' },
    ];

    const themes = [
        { id: 'light', name: 'Light', icon: Sun },
        { id: 'dark', name: 'Dark', icon: Moon },
        { id: 'system', name: 'System', icon: Monitor },
    ];

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
    ];

    const handleSave = async () => {
        setIsSaving(true);

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                alert("Session expired. Please login again.");
                window.location.replace("/");
                return;
            }

            const res = await axios.put(
                "http://127.0.0.1:8000/api/users/" + user.id,
                profile,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const updatedUser = res.data.data || res.data.user || res.data;

            localStorage.setItem("user", JSON.stringify(updatedUser));

            alert("Profile updated successfully!");
            onClose();

        } catch (error: any) {
            console.error(error);

            if (error.response) {
                alert(error.response.data.message || "Update failed");
            } else {
                alert("Network error");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleProfileChange = (field: string, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    // Get user initials for avatar fallback
    const getUserInitials = () => {
        if (!profile.first_name && !profile.last_name) return "U";

        const first = profile.first_name?.charAt(0) || '';
        const last = profile.last_name?.charAt(0) || '';

        return `${first}${last}`.toUpperCase();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
                            <p className="text-xs text-gray-500 mt-0.5">Manage your account preferences</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area - Hide scrollbar */}
                <div className="flex flex-col md:flex-row h-[65vh] overflow-hidden">
                    {/* Sidebar Navigation - Hide scrollbar */}
                    <div className="md:w-64 flex-shrink-0 border-r border-gray-200 bg-white/30 overflow-y-auto scrollbar-hide">
                        <div className="p-3 space-y-1">
                            {sections.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left
                                            ${isActive
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
                                            {section.name}
                                        </span>
                                        {isActive && (
                                            <ChevronRight className="h-3 w-3 ml-auto text-emerald-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Content - Hide scrollbar */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="p-6">
                            {/* Profile Settings - Primary Section */}
                            {activeSection === 'profile' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900 mb-1">Profile Settings</h2>
                                        <p className="text-xs text-gray-500">Update your personal information</p>
                                    </div>

                                    {/* Avatar Section */}
                                    <div className="flex items-center gap-6 pb-4 border-b border-gray-100">
                                        <div className="relative">
                                            <Avatar className="h-20 w-20 border-2 border-emerald-500 shadow-md">
                                                <AvatarImage src={`https://ui-avatars.com/api/?name=${profile.first_name}+${profile.last_name}&background=10b981&color=fff`} />
                                                <AvatarFallback className="bg-emerald-600 text-white text-xl font-bold">
                                                    {getUserInitials()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors">
                                                <Camera className="h-3 w-3 text-gray-600" />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{profile.first_name} {profile.last_name}</p>
                                            <p className="text-xs text-gray-500">{profile.email}</p>
                                            <p className="text-xs text-gray-500 mt-1">Role: {user?.role || 'Staff'}</p>
                                            <button className="text-xs text-emerald-600 hover:text-emerald-700 mt-1">
                                                Change Photo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Profile Form */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">First Name</label>
                                                <input
                                                    type="text"
                                                    value={profile.first_name}
                                                    onChange={(e) => handleProfileChange('first_name', e.target.value)}
                                                    className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={profile.last_name}
                                                    onChange={(e) => handleProfileChange('last_name', e.target.value)}
                                                    className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
                                            <input
                                                type="email"
                                                value={profile.email}
                                                onChange={(e) => handleProfileChange('email', e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Number</label>
                                            <input
                                                type="tel"
                                                value={profile.contact_number}
                                                onChange={(e) => handleProfileChange('contact_number', e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="+63 912 345 6789"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                                            <textarea
                                                value={profile.address}
                                                onChange={(e) => handleProfileChange('address', e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm resize-none"
                                                rows={2}
                                                placeholder="Enter your address"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* General Settings */}
                            {activeSection === 'general' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900 mb-1">General Settings</h2>
                                        <p className="text-xs text-gray-500">Customize your application appearance and language</p>
                                    </div>

                                    {/* Theme */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Theme</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {themes.map((themeOption) => {
                                                const Icon = themeOption.icon;
                                                const isSelected = theme === themeOption.id;
                                                return (
                                                    <button
                                                        key={themeOption.id}
                                                        onClick={() => setTheme(themeOption.id)}
                                                        className={`
                                                            flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm
                                                            ${isSelected
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                            }
                                                        `}
                                                    >
                                                        <Icon className={`h-4 w-4 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                        <span>{themeOption.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Language */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Language</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-700">
                                                            {languages.find(l => l.code === language)?.name || 'Select Language'}
                                                        </span>
                                                        <span className="text-sm">
                                                            {languages.find(l => l.code === language)?.flag}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-72 bg-white border border-gray-200 shadow-lg rounded-lg max-h-64 overflow-y-auto">
                                                {languages.map((lang) => (
                                                    <DropdownMenuItem
                                                        key={lang.code}
                                                        onClick={() => setLanguage(lang.code)}
                                                        className="cursor-pointer hover:bg-gray-50 px-3 py-2 text-sm"
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base">{lang.flag}</span>
                                                                <span>{lang.name}</span>
                                                            </div>
                                                            {language === lang.code && (
                                                                <Check className="h-3 w-3 text-emerald-600" />
                                                            )}
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Notifications */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Notifications</label>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                                                    <p className="text-xs text-gray-500">Receive updates via email</p>
                                                </div>
                                                <Switch
                                                    checked={emailNotifications}
                                                    onCheckedChange={setEmailNotifications}
                                                    className="data-[state=checked]:bg-emerald-600"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Push Notifications</p>
                                                    <p className="text-xs text-gray-500">Get real-time alerts</p>
                                                </div>
                                                <Switch
                                                    checked={pushNotifications}
                                                    onCheckedChange={setPushNotifications}
                                                    className="data-[state=checked]:bg-emerald-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Security Settings */}
                            {activeSection === 'security' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900 mb-1">Security</h2>
                                        <p className="text-xs text-gray-500">Manage your account security</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Current Password</label>
                                            <input
                                                type="password"
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">New Password</label>
                                            <input
                                                type="password"
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm New Password</label>
                                            <input
                                                type="password"
                                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                                            Update Password
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Preferences */}
                            {activeSection === 'preferences' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900 mb-1">Preferences</h2>
                                        <p className="text-xs text-gray-500">Customize your experience</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Compact Mode</p>
                                                <p className="text-xs text-gray-500">Reduce spacing between items</p>
                                            </div>
                                            <Switch className="data-[state=checked]:bg-emerald-600" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Auto-save</p>
                                                <p className="text-xs text-gray-500">Automatically save changes</p>
                                            </div>
                                            <Switch defaultChecked className="data-[state=checked]:bg-emerald-600" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Show Animations</p>
                                                <p className="text-xs text-gray-500">Enable smooth transitions</p>
                                            </div>
                                            <Switch defaultChecked className="data-[state=checked]:bg-emerald-600" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* About */}
                            {activeSection === 'about' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900 mb-1">About Lyn Enia's Inn</h2>
                                        <p className="text-xs text-gray-500">Application information and resources</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                                                <span className="text-white font-bold text-lg">L</span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Lyn Enia's Inn</h3>
                                                <p className="text-xs text-gray-500">Version 1.0.0</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            A comprehensive hotel management system designed to streamline operations,
                                            manage bookings, and enhance guest experiences.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Documentation</p>
                                                <p className="text-xs text-gray-500">Learn how to use the system</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                            <HelpCircle className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Support</p>
                                                <p className="text-xs text-gray-500">Get help from our team</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                            <Shield className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Privacy Policy</p>
                                                <p className="text-xs text-gray-500">Read our privacy policy</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <div className="flex justify-end gap-2">
                                    <Button onClick={onClose} variant="outline" size="sm" disabled={isSaving}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-1" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}