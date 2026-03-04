import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Flag, Monitor, Globe, Server } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Report {
    id: number;
    problem_type: string;
    description: string;
    episode_number: string;
    episode_link: string; // We might need to split this or assume it's full URL
    server_name: string;
    page_type: string;
    created_at: string;
}

export default function DashboardReportsPage() {
    const { t } = useTranslation();
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await api.get('/dashboard/reports');
            setReports(response.data);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
            toast.error('Failed to fetch reports');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('Reports')}</h1>
                <Button onClick={fetchReports} variant="outline" size="sm">
                    {t('Refresh')}
                </Button>
            </div>

            <Card className="border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Flag className="w-5 h-5 text-red-500" />
                        {t('Reported Issues')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border/40 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[100px]">ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Episode</TableHead>
                                    <TableHead>Server</TableHead>
                                    <TableHead>Lang</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.length === 0 && !isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No reports found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((report) => (
                                        <TableRow key={report.id} className="hover:bg-muted/50">
                                            <TableCell className="font-mono text-xs">#{report.id}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${report.problem_type.includes('Audio') ? 'bg-orange-500/10 text-orange-500' :
                                                        report.problem_type.includes('Video') ? 'bg-blue-500/10 text-blue-500' :
                                                            report.problem_type.includes('Broken') ? 'bg-red-500/10 text-red-500' :
                                                                'bg-gray-500/10 text-gray-500'
                                                    }`}>
                                                    {report.problem_type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate" title={report.description}>
                                                {report.description}
                                            </TableCell>
                                            <TableCell className="font-medium">EP {report.episode_number}</TableCell>
                                            <TableCell className="text-muted-foreground flex items-center gap-1">
                                                <Server className="w-3 h-3" /> {report.server_name}
                                            </TableCell>
                                            <TableCell>
                                                <span className="uppercase text-xs font-bold text-muted-foreground">
                                                    {report.page_type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    asChild
                                                >
                                                    <a href={report.episode_link} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
