import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { Database, Download, RotateCcw, Trash2, Upload, Plus, Loader2, FileText, Calendar, HardDrive, Server, ShieldCheck, Save } from 'lucide-react';
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
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const isAr = i18n.language === 'ar';

    const { data: backups, isLoading } = useQuery<BackupInfo[]>({
        queryKey: ['backups'],
        queryFn: async () => (await api.get('/dashboard/backups')).data,
    });

    const { data: stats } = useQuery({
        queryKey: ['backup-stats'],
        queryFn: async () => (await api.get('/dashboard/backup-stats')).data,
    });

    const createBackupMutation = useMutation({
        mutationFn: async () => (await api.post('/dashboard/backups')).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            toast.success(isAr ? 'تم إنشاء النسخة الاحتياطية بنجاح' : 'Backup created successfully');
        },
        onError: () => {
            toast.error(isAr ? 'فشل إنشاء النسخة الاحتياطية' : 'Failed to create backup');
        }
    });

    const restoreMutation = useMutation({
        mutationFn: async (filename: string) => (await api.post(`/dashboard/backups/restore/${filename}`)).data,
        onSuccess: () => {
            toast.success(isAr ? 'تمت استعادة البيانات بنجاح' : 'Data restored successfully');
            // Optionally reload page or re-re-fetch all data
            setTimeout(() => window.location.reload(), 2000);
        },
        onError: (error: any) => {
            toast.error(isAr ? `فشلت الاستعادة: ${error.response?.data?.error || error.message}` : 'Restore failed');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (filename: string) => (await api.delete(`/dashboard/backups/${filename}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            toast.success(isAr ? 'تم حذف النسخة بنجاح' : 'Backup deleted successfully');
        }
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('backup', file);
            return (await api.post('/dashboard/backups/upload', formData)).data;
        },
        onSuccess: () => {
            toast.success(isAr ? 'تم رفع واستعادة النسخة بنجاح' : 'Backup uploaded and restored successfully');
            setTimeout(() => window.location.reload(), 2000);
        },
        onError: (error: any) => {
            toast.error(isAr ? `فشل الرفع: ${error.response?.data?.error || error.message}` : 'Upload failed');
        }
    });

    const exportAccountsMutation = useMutation({
        mutationFn: async () => {
            const response = await api.get('/embed-accounts/all/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'embed_accounts_backup.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
        onSuccess: () => {
            toast.success(isAr ? 'تم تصدير الحسابات بنجاح' : 'Accounts exported successfully');
        }
    });

    const importAccountsMutation = useMutation({
        mutationFn: async (file: File) => {
            const text = await file.text();
            const data = JSON.parse(text);
            return (await api.post('/embed-accounts/all/import', data)).data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['backup-stats'] });
            toast.success(isAr ? `تم استيراد ${data.count} حساب بنجاح` : `Imported ${data.count} accounts successfully`);
        },
        onError: (error: any) => {
            toast.error(isAr ? 'فشل الاستيراد: تنسيق الملف غير صحيح' : 'Import failed: Invalid file format');
        }
    });

    const handleImportAccounts = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importAccountsMutation.mutate(file);
        }
    };

    const handleDownload = (filename: string) => {
        const token = useAuthStore.getState().accessToken;
        window.open(`${api.defaults.baseURL}/dashboard/backups/download/${filename}?token=${token}`, '_blank');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (window.confirm(isAr ? 'هل أنت متأكد؟ سيتم حذف البيانات الحالية واستبدالها!' : 'Are you sure? Current data will be replaced!')) {
                uploadMutation.mutate(file);
            }
        }
    };

    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Database className="h-8 w-8 text-primary" />
                        {isAr ? 'النسخ الاحتياطي لقاعدة البيانات' : 'Database Backups'}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        {isAr 
                            ? 'إدارة نسخ البيانات الاحتياطية، يمكنك إنشاء نسخ جديدة أو استعادة نسخ سابقة.' 
                            : 'Manage your database backups. Create new ones or restore previous versions.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="gap-2 relative"
                        disabled={uploadMutation.isPending}
                    >
                        <Upload className="h-4 w-4" />
                        {isAr ? 'رفع نسخة واستعادتها' : 'Upload & Restore'}
                        <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".db"
                            onChange={handleFileUpload}
                        />
                    </Button>
                    <Button 
                        size="lg" 
                        className="gap-2" 
                        onClick={() => createBackupMutation.mutate()}
                        disabled={createBackupMutation.isPending}
                    >
                        {createBackupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
                        <div className="text-xs text-muted-foreground">
                            {isAr ? 'تشمل الأنميات، الحلقات، والحسابات' : 'Includes Animes, Episodes & Accounts'}
                        </div>
                        <div className="text-lg font-bold mt-1">
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

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {isAr ? 'نسخ احتياطي لحسابات الرفع (Portability)' : 'Portable Accounts Backup'}
                    </CardTitle>
                    <CardDescription>
                        {isAr 
                            ? 'يمكنك تصدير حسابات الرفع (API Keys) فقط كملف JSON لاستعادتها بشكل منفصل عن قاعدة البيانات.' 
                            : 'Export only your upload accounts (API Keys) as a JSON file to restore them separately from the full database.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <Button 
                        variant="default"
                        onClick={() => exportAccountsMutation.mutate()}
                        disabled={exportAccountsMutation.isPending}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {isAr ? 'تصدير الحسابات (JSON)' : 'Export Accounts (JSON)'}
                    </Button>
                    <Button 
                        variant="outline"
                        className="gap-2 relative"
                        disabled={importAccountsMutation.isPending}
                    >
                        {importAccountsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isAr ? 'استيراد حسابات من JSON' : 'Import Accounts from JSON'}
                        <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".json"
                            onChange={handleImportAccounts}
                        />
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{isAr ? 'سجل النسخ الاحتياطية' : 'Backup History'}</CardTitle>
                    <CardDescription>
                        {isAr 
                            ? 'قائمة بجميع النسخ الاحتياطية المتوفرة على السيرفر.' 
                            : 'All available database backups stored on the server.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border relative">
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
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDownload(backup.filename)}
                                                        title={isAr ? 'تنزيل' : 'Download'}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => {
                                                            if (window.confirm(isAr ? 'سيتم استبدال البيانات الحالية، هل أنت متأكد؟' : 'Current data will be replaced, are you sure?')) {
                                                                restoreMutation.mutate(backup.filename);
                                                            }
                                                        }}
                                                        title={isAr ? 'استعادة' : 'Restore'}
                                                        disabled={restoreMutation.isPending}
                                                    >
                                                        {restoreMutation.isPending && restoreMutation.variables === backup.filename 
                                                            ? <Loader2 className="h-4 w-4 animate-spin" /> 
                                                            : <RotateCcw className="h-4 w-4" />
                                                        }
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذه النسخة؟' : 'Are you sure you want to delete this backup?')) {
                                                                deleteMutation.mutate(backup.filename);
                                                            }
                                                        }}
                                                        title={isAr ? 'حذف' : 'Delete'}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                {isAr ? 'لا توجد نسخ احتياطية بعد' : 'No backups found'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg flex gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full h-fit mt-1">
                    <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-200">
                        {isAr ? 'تنبيه حول الاستعادة' : 'Restore Warning'}
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {isAr 
                            ? 'عند استعادة أي نسخة احتياطية، سيتم استبدال قاعدة البيانات الحالية بالكامل. يوصى بأخذ نسخة احتياطية للبيانات الحالية قبل القيام بعملية الاستعادة.' 
                            : 'When restoring any backup, the current database will be completely replaced. It is recommended to take a backup of your current data before performing a restore.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BackupPage;
