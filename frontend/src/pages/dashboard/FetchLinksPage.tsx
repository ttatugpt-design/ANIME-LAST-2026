import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Link as LinkIcon, Search, AlertCircle, CheckCircle2, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const FetchLinksPage = () => {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const [url, setUrl] = useState('');
    const [seriesName, setSeriesName] = useState('');
    const [results, setResults] = useState<{ episode: string; link: string }[]>([]);

    const fetchMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/test-fetch', { url: targetUrl, series_name: seriesName });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.links && data.links.length > 0) {
                setResults(data.links);
                toast.success(isArabic ? 'تم جلب الروابط بنجاح!' : 'Links fetched successfully!');
            }
        },
        onError: (error: any) => {
            console.error(error);
            const msg = error.response?.data?.error || (isArabic ? 'حدث خطأ أثناء جلب الرابط' : 'Failed to fetch link');
            toast.error(msg);
            setResults([]);
        }
    });

    const handleFetch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) {
            toast.error(isArabic ? 'الرجاء إدخال رابط صالح' : 'Please enter a valid URL');
            return;
        }
        setResults([]);
        fetchMutation.mutate(url);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 text-primary">
                        <LinkIcon className="h-6 w-6" />
                        {isArabic ? 'جلب الروابط المتعدد' : 'Batch Link Fetcher'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isArabic 
                            ? 'استخراج روابط متعددة لجميع الحلقات دفعة واحدة مع تخطي الحماية.' 
                            : 'Extract multiple links for all episodes in one batch bypassing protection.'}
                    </p>
                </div>
            </div>

            <Card className="max-w-4xl border-primary/20 shadow-xl relative overflow-hidden backdrop-blur-sm bg-card/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-32 translate-x-32 -z-10" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        {isArabic ? 'إعدادات الجلب المتعدد (Test)' : 'Batch Fetch Settings (Test)'}
                    </CardTitle>
                    <CardDescription>
                        {isArabic 
                            ? 'سيقوم النظام بسحب قائمة الحلقات والدخول لكل حلقة لاستلال رابط المشغل المباشر.'
                            : 'System will pull the episode list and visit each page to extract direct player links.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleFetch} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-1">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    {isArabic ? 'رابط صفحة المسلسل' : 'Series Page URL'}
                                </label>
                                <Input 
                                    placeholder="https://zeta.animerco.org/..." 
                                    className="w-full bg-background/50 border-primary/10 focus:border-primary/40 transition-all font-mono text-sm"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    dir="ltr"
                                />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button 
                                    type="submit" 
                                    disabled={fetchMutation.isPending || !url}
                                    className="sm:w-48 h-11 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
                                >
                                    {fetchMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />
                                            {isArabic ? 'جاري جلب الجميع...' : 'Fetching Batch...'}
                                        </>
                                    ) : (
                                        isArabic ? 'جلب الحلقات (Batch)' : 'Fetch Batch'
                                    )}
                                </Button>
                            </div>
                        </div>

                        {fetchMutation.isError && (
                            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold">{isArabic ? 'فشلت المهمة' : 'Mission Failed'}</h4>
                                    <p className="text-sm opacity-90 mt-1">
                                        {(fetchMutation.error as any)?.response?.data?.error || fetchMutation.error?.message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="space-y-4 animate-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        {isArabic ? `النتائج المستخرجة (${results.length})` : `Extracted Results (${results.length})`}
                                    </h3>
                                </div>
                                <div className="grid gap-4">
                                    {results.map((res, index) => (
                                        <div key={index} className="p-4 rounded-xl border-2 border-primary/10 bg-background/40 hover:bg-background/80 transition-all group">
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-primary opacity-70">
                                                        {res.episode}
                                                    </span>
                                                    <div className="text-sm font-mono truncate mt-1 text-foreground/80" dir="ltr">
                                                        {res.link}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="h-9 gap-2"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(res.link);
                                                            toast.success(`${res.episode}: ${isArabic ? 'تم النسخ!' : 'Copied!'}`);
                                                        }}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                        {isArabic ? 'نسخ' : 'Copy'}
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        asChild
                                                        className="h-9 gap-2"
                                                    >
                                                        <a href={res.link} target="_blank" rel="noreferrer">
                                                            <ExternalLink className="h-4 w-4" />
                                                            {isArabic ? 'فتح' : 'Open'}
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default FetchLinksPage;
