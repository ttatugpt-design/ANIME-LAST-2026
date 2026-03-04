import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings-store";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { appName, logoUrl, fetchSettings, updateSettings } = useSettingsStore();
    const { theme, setTheme } = useTheme();

    const [localAppName, setLocalAppName] = useState(appName);
    const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        setLocalAppName(appName);
        setLocalLogoUrl(logoUrl);
    }, [appName, logoUrl]);

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('app_name', localAppName);
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            await updateSettings(formData);
            toast.success(t('common.save') + " " + t('common.settings.success', { defaultValue: 'Success' }));
            setLogoFile(null); // Reset file after upload
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalLogoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">{t('settings.title')}</h3>
                <p className="text-sm text-muted-foreground">
                    {t('settings.description', { defaultValue: 'Manage your application settings and preferences.' })}
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
                    <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.general')}</CardTitle>
                            <CardDescription>
                                Customize the application identity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="name">{t('settings.site_name')}</Label>
                                <Input
                                    id="name"
                                    value={localAppName}
                                    onChange={(e) => setLocalAppName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="logo">Logo</Label>
                                {localLogoUrl && (
                                    <div className="border rounded-lg p-4 flex items-center justify-center bg-muted/50">
                                        <img
                                            src={localLogoUrl}
                                            alt="Logo Preview"
                                            className="max-h-32 max-w-full object-contain"
                                        />
                                    </div>
                                )}
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/*,.svg"
                                    onChange={handleLogoUpload}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Upload an image or SVG file for your logo
                                </p>
                            </div>
                            <Button onClick={handleSaveGeneral} disabled={isSaving}>
                                <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
                                {t('common.save')}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.appearance')}</CardTitle>
                            <CardDescription>
                                Customize how the app looks and feels.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label>{t('settings.language')}</Label>
                                <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">{t('settings.english')}</SelectItem>
                                        <SelectItem value="ar">{t('settings.arabic')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>{t('settings.theme')}</Label>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <Button
                                        variant={theme === 'light' ? 'default' : 'outline'}
                                        onClick={() => setTheme('light')}
                                    >
                                        {t('settings.light')}
                                    </Button>
                                    <Button
                                        variant={theme === 'dark' ? 'default' : 'outline'}
                                        onClick={() => setTheme('dark')}
                                    >
                                        {t('settings.dark')}
                                    </Button>
                                    <Button
                                        variant={theme === 'system' ? 'default' : 'outline'}
                                        onClick={() => setTheme('system')}
                                    >
                                        {t('settings.system')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
