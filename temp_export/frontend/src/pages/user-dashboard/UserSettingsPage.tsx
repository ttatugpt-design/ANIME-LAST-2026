import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function UserSettingsPage() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const isRtl = i18n.language === 'ar';

    return (
        <div className="max-w-3xl animate-fade-in space-y-12">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tighter">
                {isRtl ? 'الإعدادات' : 'Settings'}
            </h1>

            <div className="space-y-12">

                {/* Theme Setting */}
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="space-y-1 mb-4 md:mb-0">
                        <Label className="text-xl font-bold uppercase tracking-wide">{isRtl ? 'المظهر' : 'Appearance'}</Label>
                    </div>

                    <div className="w-full md:w-56">
                        <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                            <SelectTrigger className="w-full h-12 bg-white dark:bg-black border-none focus:ring-0 focus:outline-none text-xl font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-black border-none">
                                <SelectItem value="light" className="cursor-pointer focus:bg-gray-100 dark:focus:bg-[#111]">
                                    <div className="flex items-center gap-2">
                                        <span>{isRtl ? 'نهاري' : 'Light'}</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="dark" className="cursor-pointer focus:bg-gray-100 dark:focus:bg-[#111]">
                                    <div className="flex items-center gap-2">
                                        <span>{isRtl ? 'ليلي' : 'Dark'}</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="system" className="cursor-pointer focus:bg-gray-100 dark:focus:bg-[#111]">
                                    <div className="flex items-center gap-2">
                                        <span>{isRtl ? 'النظام' : 'System'}</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Notifications Setting (Placeholder) */}
                <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="space-y-1">
                        <Label className="text-xl font-bold uppercase tracking-wide">{isRtl ? 'الإشعارات البريدية' : 'Email Notifications'}</Label>
                    </div>
                    <Switch disabled />
                </div>

            </div>
        </div>
    );
}
