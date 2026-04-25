import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { Database, Download, RotateCcw, Trash2, UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2, FileText, HardDrive, Server, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BackupInfo {
    filename: string;
    size: number;
    date: string;
}

const BackupPage: React.FC = () => {
    const { i18n } = useTranslation();
    const queryClient = useQueryClient();
    const isAr = i18n.language === 'ar';
    const fileInputRef = useRef<HTMLInputElement>(null);

    // States for Drag & Drop and Upload
    const [isDragging, setIsDragging] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'restoring' | 'success' | 'error'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadErrorMsg, setUploadErrorMsg] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { data: backups, isLoading } = useQuery<BackupInfo[]>({
        queryKey: ['backups'],
        queryFn: async () => (await api.get('/dashboard/backups')).data,
    });

    const { data: stats } = useQuery({
        queryKey: ['backup-stats'],
        queryFn: async () => (await api.get('/dashboard/backup-stats')).data,
    });

    // --- UPLOAD LOGIC (CHUNKED) ---
    const handleFileProcess = async (file: File) => {
        if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite')) {
            toast.error(isAr ? 'يجب أن يكون الملف بصيغة .db أو .sqlite' : 'File must be .db or .sqlite');
            return;
        }

        if (!window.confirm(isAr ? 'تحذير: هذه العملية ستستبدل قاعدة البيانات الحالية بشكل كامل. هل أنت متأكد؟' : 'WARNING: This will completely replace the current database. Are you sure?')) return;
        
        try {
            setUploadState('uploading');
            setUploadProgress(0);
            
            const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const uploadId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
            
            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                
                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('uploadId', uploadId);
                formData.append('chunkIndex', i.toString());
                
                await api.post('/dashboard/backups/upload/chunk', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                const percentCompleted = Math.round(((i + 1) / totalChunks) * 100);
                setUploadProgress(percentCompleted);
            }
            
            setUploadState('restoring');
            await api.post('/dashboard/backups/upload/finalize', {
                uploadId: uploadId,
                filename: file.name
            });
            
            setUploadState('success');
            toast.success(isAr ? 'تم الاسترداد بنجاح! سيتم إعادة تشغيل السيرفر.' : 'Restored successfully! Server is restarting.');
            setTimeout(() => window.location.reload(), 3000);
        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadState('error');
            setUploadErrorMsg(err.message || 'Unknown error occurred');
            toast.error(isAr ? 'فشل الرفع' : 'Upload failed');
            setTimeout(() => setUploadState('idle'), 5000);
        }
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileProcess(file);
    }, []);

    // --- OTHER ACTIONS ---
    const handleCreateBackup = async () => {
        try {
            setActionLoading('create');
            await api.post('/dashboard/backups');
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            toast.success(isAr ? 'تم إنشاء النسخة بنجاح' : 'Backup created successfully');
        } catch (err: any) {
            toast.error(isAr ? 'فشل إنشاء النسخة' : 'Failed to create backup');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestore = async (filename: string) => {
        if (!window.confirm(isAr ? 'سيتم استبدال البيانات الحالية، هل أنت متأكد؟' : 'Current data will be replaced, are you sure?')) return;
        try {
            setActionLoading('restore');
            await api.post(`/dashboard/backups/restore/${filename}`);
            toast.success(isAr ? 'تمت الجدولة، سيتم إعادة التشغيل' : 'Restore scheduled, server is restarting');
            setTimeout(() => window.location.reload(), 3000);
        } catch (err: any) {
            toast.error(isAr ? 'فشلت الاستعادة' : 'Restore failed');
            setActionLoading(null);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه النسخة؟' : 'Are you sure you want to delete this backup?')) return;
        try {
            setActionLoading('delete');
            await api.post(`/dashboard/backups/delete/${filename}`);
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            toast.success(isAr ? 'تم حذف النسخة بنجاح' : 'Backup deleted successfully');
        } catch (err: any) {
            toast.error(isAr ? 'فشل حذف النسخة' : 'Delete failed');
            setActionLoading(null);
        }
    };

    const handleDownload = (filename: string) => {
        const token = useAuthStore.getState().accessToken;
        let downloadUrl = `${api.defaults.baseURL}/dashboard/backups/download/${filename}?token=${token}`;
        if (downloadUrl.startsWith('/')) downloadUrl = window.location.origin + downloadUrl;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="space-y-8 relative pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Database className="h-8 w-8 text-primary" />
                        {isAr ? 'إدارة قواعد البيانات V5' : 'Database Management V5'}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {isAr ? 'نظام استرداد فائق السرعة يدعم الرفع المجزأ لتخطي قيود الحماية' : 'Ultra-fast restoration system with chunked upload support to bypass limits'}
                    </p>
                </div>
                <Button size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={handleCreateBackup} disabled={!!actionLoading}>
                    {actionLoading === 'create' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="h-5 w-5" />}
                    {isAr ? 'أخذ نسخة احتياطية الآن' : 'Backup Now'}
                </Button>
            </div>

            {/* Massive Upload Zone */}
            <Card className={`border-2 border-dashed overflow-hidden transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-card'}`}>
                <CardContent className="p-0">
                    <div 
                        className="relative p-12 flex flex-col items-center justify-center text-center min-h-[300px]"
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            className="hidden" 
                            accept=".db,.sqlite"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileProcess(file);
                                e.target.value = '';
                            }}
                        />

                        {uploadState === 'idle' && (
                            <div className="space-y-6 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                    <UploadCloud className="w-10 h-10 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">{isAr ? 'اسحب وأفلت ملف قاعدة البيانات هنا' : 'Drag & Drop Database File Here'}</h3>
                                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                        {isAr ? 'يدعم الملفات الضخمة بصيغة (.db أو .sqlite) - تم تفعيل نظام الرفع المجزأ لتجاوز حدود Cloudflare بأمان' : 'Supports massive .db or .sqlite files - Chunked upload active to safely bypass Cloudflare limits'}
                                    </p>
                                </div>
                                <Button size="lg" variant="secondary" className="font-bold" onClick={() => fileInputRef.current?.click()}>
                                    {isAr ? 'أو تصفح الملفات' : 'Or Browse Files'}
                                </Button>
                            </div>
                        )}

                        {uploadState === 'uploading' && (
                            <div className="w-full max-w-lg space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                <FileType className="w-16 h-16 text-primary animate-pulse" />
                                <div className="w-full text-center space-y-2">
                                    <h3 className="text-2xl font-bold text-primary">{isAr ? 'جاري الرفع الآمن...' : 'Secure Uploading...'}</h3>
                                    <p className="text-muted-foreground">{uploadProgress}%</p>
                                </div>
                                <div className="w-full h-4 bg-secondary rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-green-400 transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-yellow-500 font-medium">
                                    {isAr ? 'يرجى عدم إغلاق هذه الصفحة حتى تكتمل العملية' : 'Please do not close this page until completed'}
                                </p>
                            </div>
                        )}

                        {uploadState === 'restoring' && (
                            <div className="space-y-6 flex flex-col items-center animate-in fade-in zoom-in">
                                <div className="relative">
                                    <Loader2 className="w-20 h-20 text-primary animate-spin" />
                                    <Database className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold">{isAr ? 'جاري استبدال قاعدة البيانات' : 'Replacing Database'}</h3>
                                    <p className="text-muted-foreground mt-2">{isAr ? 'اكتمل الرفع. النظام يقوم بالاستعادة الآن...' : 'Upload complete. System is restoring now...'}</p>
                                </div>
                            </div>
                        )}

                        {uploadState === 'success' && (
                            <div className="space-y-4 flex flex-col items-center text-green-500 animate-in zoom-in">
                                <CheckCircle2 className="w-24 h-24" />
                                <h3 className="text-3xl font-bold">{isAr ? 'تمت العملية بنجاح!' : 'Process Successful!'}</h3>
                                <p>{isAr ? 'سيتم إعادة تشغيل النظام لتطبيق التغييرات' : 'System will restart to apply changes'}</p>
                            </div>
                        )}

                        {uploadState === 'error' && (
                            <div className="space-y-4 flex flex-col items-center text-red-500 animate-in zoom-in">
                                <AlertCircle className="w-20 h-20" />
                                <h3 className="text-2xl font-bold">{isAr ? 'فشلت العملية' : 'Process Failed'}</h3>
                                <p className="text-sm font-mono bg-red-500/10 p-2 rounded">{uploadErrorMsg}</p>
                                <Button variant="outline" className="mt-4 border-red-500 text-red-500 hover:bg-red-500/10" onClick={() => setUploadState('idle')}>
                                    {isAr ? 'حاول مجدداً' : 'Try Again'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{isAr ? 'إجمالي النسخ' : 'Total Backups'}</CardTitle>
                        <FileText className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{backups?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{isAr ? 'سيرفرات الرفع' : 'Upload Servers'}</CardTitle>
                        <Server className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.embed_accounts || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{isAr ? 'قاعدة البيانات' : 'Database Status'}</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            {stats ? (stats.animes + stats.episodes) : 0} {isAr ? 'عنصر' : 'items'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{isAr ? 'استهلاك القرص' : 'Disk Usage'}</CardTitle>
                        <HardDrive className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatSize(backups?.reduce((acc, b) => acc + b.size, 0) || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Backup List */}
            <Card>
                <CardHeader>
                    <CardTitle>{isAr ? 'سجل النسخ الاحتياطية' : 'Backup History'}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="rounded-md border border-white/5">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{isAr ? 'اسم الملف' : 'Filename'}</TableHead>
                                        <TableHead>{isAr ? 'الحجم' : 'Size'}</TableHead>
                                        <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                                        <TableHead className="text-right">{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {backups && backups.length > 0 ? (
                                        backups.map((backup) => (
                                            <TableRow key={backup.filename}>
                                                <TableCell className="font-mono text-xs">{backup.filename}</TableCell>
                                                <TableCell>{formatSize(backup.size)}</TableCell>
                                                <TableCell>
                                                    {format(new Date(backup.date), 'yyyy/MM/dd HH:mm', { locale: isAr ? ar : undefined })}
                                                </TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(backup.filename)} title={isAr ? 'تنزيل' : 'Download'}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleRestore(backup.filename)} title={isAr ? 'استعادة' : 'Restore'} disabled={!!actionLoading}>
                                                        {actionLoading === 'restore' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(backup.filename)} title={isAr ? 'حذف' : 'Delete'} disabled={!!actionLoading}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">{isAr ? 'لا توجد نسخ' : 'No backups'}</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BackupPage;
