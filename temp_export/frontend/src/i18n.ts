import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        debug: true,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        resources: {
            en: {
                translation: {
                    common: {
                        dashboard: 'Dashboard',
                        users: 'Users',
                        roles: 'Roles',
                        permissions: 'Permissions',
                        settings: 'Settings',
                        logout: 'Logout',
                        welcome: 'Welcome',
                        app_name_default: 'SaaS App', // Default fallback
                        add: 'Add',
                        edit: 'Edit',
                        delete: 'Delete',
                        save: 'Save',
                        cancel: 'Cancel',
                        actions: 'Actions',
                    },
                    settings: {
                        title: 'Settings',
                        general: 'General',
                        appearance: 'Appearance',
                        site_name: 'Site Name',
                        logo_url: 'Logo URL',
                        theme: 'Theme',
                        language: 'Language',
                        light: 'Light',
                        dark: 'Dark',
                        system: 'System',
                        english: 'English',
                        arabic: 'Arabic',
                    },
                },
            },
            ar: {
                translation: {
                    common: {
                        dashboard: 'لوحة التحكم',
                        users: 'المستخدمين',
                        roles: 'الأدوار',
                        permissions: 'الصلاحيات',
                        settings: 'الإعدادات',
                        logout: 'تسجيل الخروج',
                        welcome: 'مرحبا',
                        app_name_default: 'تطبيق ساس',
                        add: 'إضافة',
                        edit: 'تعديل',
                        delete: 'حذف',
                        save: 'حفظ',
                        cancel: 'إلغاء',
                        actions: 'الإجراءات',
                    },
                    settings: {
                        title: 'الإعدادات',
                        general: 'عام',
                        appearance: 'المظهر',
                        site_name: 'اسم الموقع',
                        logo_url: 'رابط الشعار',
                        theme: 'السمة',
                        language: 'اللغة',
                        light: 'فاتح',
                        dark: 'داكن',
                        system: 'النظام',
                        english: 'الإنجليزية',
                        arabic: 'العربية',
                    },
                },
            },
        },
    });

export default i18n;
