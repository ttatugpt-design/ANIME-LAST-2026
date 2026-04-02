import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    appName: string;
    logoUrl: string;
    fakeNamingActive: boolean;
    fakeNamingPrefix: string;
    fakeNamingCounter: number;
    setAppName: (name: string) => void;
    setLogoUrl: (url: string) => void;
    fetchSettings: () => Promise<void>;
    updateSettings: (formData: FormData) => Promise<void>;
}

import api from '@/lib/api';

export const useSettingsStore = create<SettingsState>()(
    // Removed persist middleware to rely on backend source of truth
    (set) => ({
        appName: 'ANIME LAST',
        logoUrl: '',
        fakeNamingActive: false,
        fakeNamingPrefix: 'ab',
        fakeNamingCounter: 1,
        setAppName: (name: string) => set({ appName: name }), // Optimistic update
        setLogoUrl: (url: string) => set({ logoUrl: url }),   // Optimistic update

        fetchSettings: async () => {
            try {
                const response = await api.get('/settings');
                const { app_name, logo, fake_naming_active, fake_naming_prefix, fake_naming_counter } = response.data;
                const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
                set({
                    appName: app_name,
                    logoUrl: logo ? (logo.startsWith('http') ? logo : `${baseUrl}${logo}`) : '',
                    fakeNamingActive: fake_naming_active,
                    fakeNamingPrefix: fake_naming_prefix,
                    fakeNamingCounter: fake_naming_counter
                });
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        },

        updateSettings: async (formData: FormData) => {
            try {
                const response = await api.post('/settings/update', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const { app_name, logo, fake_naming_active, fake_naming_prefix, fake_naming_counter } = response.data;
                const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
                set({
                    appName: app_name,
                    logoUrl: logo ? (logo.startsWith('http') ? logo : `${baseUrl}${logo}`) : '',
                    fakeNamingActive: fake_naming_active,
                    fakeNamingPrefix: fake_naming_prefix,
                    fakeNamingCounter: fake_naming_counter
                });
            } catch (error) {
                console.error('Failed to update settings:', error);
                throw error;
            }
        }
    })
);
