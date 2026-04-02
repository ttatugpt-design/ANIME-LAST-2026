import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Hash, Settings2, Info } from "lucide-react";

export default function FakeNumbersPage() {
    const { t } = useTranslation();
    const { 
        fakeNamingActive, 
        fakeNamingPrefix, 
        fakeNamingCounter, 
        fetchSettings, 
        updateSettings 
    } = useSettingsStore();

    const [active, setActive] = useState(fakeNamingActive);
    const [prefix, setPrefix] = useState(fakeNamingPrefix);
    const [counter, setCounter] = useState(fakeNamingCounter);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        setActive(fakeNamingActive);
        setPrefix(fakeNamingPrefix);
        setCounter(fakeNamingCounter);
    }, [fakeNamingActive, fakeNamingPrefix, fakeNamingCounter]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('fake_naming_active', active ? 'true' : 'false');
            formData.append('fake_naming_prefix', prefix);
            formData.append('fake_naming_counter', String(counter));

            await updateSettings(formData);
            toast.success(t('common.save') + " " + "بنجاح");
        } catch (error) {
            toast.error("فشل في حفظ الإعدادات");
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate next filename preview
    const nextFilename = `${prefix}${String(counter).padStart(7, '0')}.mp4`;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">الأرقام المزيفة (التسمية التسلسلية)</h3>
                <p className="text-sm text-muted-foreground">
                    إدارة نظام التسمية التلقائي للملفات المرفوعة لضمان دقة الربط 100%.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5" />
                            إعدادات التسمية
                        </CardTitle>
                        <CardDescription>
                            تحكم في كيفية تسمية الملفات عند الرفع.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                            <div className="space-y-0.5">
                                <Label htmlFor="active-toggle">تفعيل التسمية التسلسلية</Label>
                                <p className="text-xs text-muted-foreground">
                                    عند التفعيل، سيتم تجاهل اسم الحلقة واستخدام كود متسلسل.
                                </p>
                            </div>
                            <Switch
                                id="active-toggle"
                                checked={active}
                                onCheckedChange={setActive}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prefix">البادئة (Prefix)</Label>
                            <Input
                                id="prefix"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder="مثلاً: ab"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="counter">العداد الحالي (Counter)</Label>
                            <Input
                                id="counter"
                                type="number"
                                value={counter}
                                onChange={(e) => setCounter(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <Button onClick={handleSave} disabled={isSaving} className="w-full">
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('common.save')}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hash className="w-5 h-5 text-primary" />
                            معاينة الاسم القادم
                        </CardTitle>
                        <CardDescription>
                            هذا هو الشكل الذي سيظهر به الملف القادم في السيرفرات.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-background border rounded-lg text-center">
                            <code className="text-2xl font-bold text-primary tracking-wider">
                                {nextFilename}
                            </code>
                        </div>
                        
                        <div className="flex gap-2 text-sm text-muted-foreground bg-background/50 p-3 rounded-md border border-dashed">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p>
                                سيتم استخدام هذا الاسم لرفع الملف إلى Mirrored.to وتوزيعه على Doodstream و Streamtape وغيرها. 
                                بمجرد انتهاء الرفع، سيزداد العداد تلقائياً بزيادة 1.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
