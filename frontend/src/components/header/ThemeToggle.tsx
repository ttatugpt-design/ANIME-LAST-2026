import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const { i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isDark = theme === 'dark';

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    const isRtl = i18n.language === 'ar';

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 dark:text-gray-400 hover:text-black dark:hover:text-white"
                    >
                        {isDark ? (
                            <Moon className="w-6 h-6" />
                        ) : (
                            <Sun className="w-6 h-6" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>{isDark 
                        ? (isRtl ? 'الوضع النهاري' : 'Light Mode') 
                        : (isRtl ? 'الوضع الليلي' : 'Dark Mode')}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
