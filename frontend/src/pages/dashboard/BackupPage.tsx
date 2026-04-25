import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { Database, Download, RotateCcw, Trash2, Upload, Plus, Loader2, FileText, HardDrive, Server, ShieldCheck, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Local Loading States
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const { data: backups, isLoading } = useQuery<BackupInfo[]>({
        queryKey: ['backups'],
        queryFn: async () => (await api.get('/dashboard/backups')).data,
    });

    const { data: stats } = useQuery({
        queryKey: ['backup-stats'],
        queryFn: async () => (await api.get('/dashboard/backup-stats')).data,
    });

    // --- MANUAL ACTIONS ---

    const handleCreateBackup = async () => {
        try {
            setActionLoading('create');
            await api.post('/dashboard/backups');
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            toast.success(isAr ? 'تم إنشاء النسخة بنجاح' : 'Backup created successfully');
        } catch (err: any) {
            console.error('Create error:', err);
            toast.error(isAr ? 'فشل إنشاء النسخة' : 'Failed to create backup: ' + err.message);
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
            console.error('Restore error:', err);
            toast.error(isAr ? 'فشلت الاستعادة' : 'Restore failed: ' + err.message);
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
            console.error('Delete error:', err);
            toast.error(isAr ? 'فشل حذف النسخة' : 'Delete failed: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpload = async (file: File) => {
        if (!window.confirm(isAr ? 'سيتم استبدال البيانات الحالية! هل أنت متأكد؟' : 'Current data will be replaced! Are you sure?')) return;
        
        try {
            setActionLoading('upload');
            setUploadProgress(0);
            const formData = new FormData();
            formData.append('backup', file);
            
            await api.post('/dashboard/backups/upload', formData, {
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            });
            
            setUploadProgress(100);
            toast.success(isAr ? 'تم الرفع، انتظر إعادة التشغيل' : 'Uploaded, waiting for restart');
            setTimeout(() => window.location.reload(), 3000);
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error(isAr ? 'فشل الرفع' : 'Upload failed: ' + err.message);
            setActionLoading(null);
            setUploadProgress(null);
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
        <div className="space-y-6 relative">
            {/* GLOBAL LOADING OVERLAY */}
            {actionLoading && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[999] flex items-center justify-center flex-col gap-6 p-4">
                    <div className="relative">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        {uploadProgress !== null && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{uploadProgress}%</span>
                            </div>
                        )}
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold">{isAr ? 'جاري التنفيذ...' : 'Processing...'}</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {actionLoading === 'upload' 
                                ? (isAr ? 'جاري رفع النسخة الاحتياطية واستعادتها. يرجى عدم إغلاق هذه الصفحة.' : 'Uploading and restoring backup. Please do not close this page.')
                                : (isAr ? 'يرجى الانتظار، قد يقوم السيرفر بإعادة التشغيل.' : 'Please wait, the server may restart.')}
                        </p>
                    </div>
                    
                    {/* Progress Bar Container */}
                    {uploadProgress !== null && (
                        <div className="w-full max-w-md bg-secondary/50 rounded-full h-3 overflow-hidden border border-border">
                            <div 
                                className="bg-primary h-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Database className="h-8 w-8 text-primary" />
                        {isAr ? 'النسخة الاحتياطية V4 - قيد التجربة' : 'Backups V4 - DEBUG MODE'}
                    </h2>
                    <Button 
                        onClick={() => alert('DEBUG: Button click works!')} 
                        variant="destructive"
                        className="mt-2"
                    >
                        Click here to test if JS is running
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4" />
                        {isAr ? 'رفع نسخة' : 'Upload Backup'}
                    </Button>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept=".db"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                            e.target.value = '';
                        }}
                    />
                    <Button 
                        size="lg" 
                        className="gap-2" 
                        onClick={handleCreateBackup}
                    >
                        <Plus className="h-4 w-4" />
                        {isAr ? 'إنشاء نسخة جديدة' : 'Create New Backup'}
                    </Button>
                </div>
            </div>

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

            <Card>
                <CardHeader>
                    <CardTitle>{isAr ? 'سجل النسخ الاحتياطية' : 'Backup History'}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="rounded-md border">
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
                                                    <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleRestore(backup.filename)} title={isAr ? 'استعادة' : 'Restore'}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(backup.filename)} title={isAr ? 'حذف' : 'Delete'}>
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

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg flex gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full h-fit mt-1"><RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
                <div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-200">{isAr ? 'تنبيه حول الاستعادة' : 'Restore Warning'}</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{isAr ? 'سيتم استبدال قاعدة البيانات الحالية بالكامل.' : 'Current database will be completely replaced.'}</p>
                </div>
            </div>
        </div>
    );
};

export default BackupPage;
