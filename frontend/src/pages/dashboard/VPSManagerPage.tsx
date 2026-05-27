import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RefreshCw, Folder, FileText, Clock } from "lucide-react";

interface VPSFileEntry {
  name: string;
  type: string;
  size: number;
  modified_at: string;
}

export default function VPSManagerPage() {
  const [remotePath, setRemotePath] = useState("/");
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<VPSFileEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFiles = useMutation({
    mutationFn: async (path: string) => {
      const response = await api.get("/dashboard/vps-downloader/files", {
        params: { path },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setFiles(data.files || []);
      setCurrentPath(data.path || remotePath);
      setErrorMessage(null);
    },
    onError: (error: any) => {
      setFiles([]);
      setErrorMessage(error?.response?.data?.error || error?.message || "حدث خطأ أثناء تحميل الملفات.");
    },
  });

  const loadFiles = () => {
    const normalized = remotePath.trim() || "/";
    setRemotePath(normalized);
    fetchFiles.mutate(normalized);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-muted/30 bg-background p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">مسار VPS</label>
          <Input
            value={remotePath}
            onChange={(event) => setRemotePath(event.target.value)}
            placeholder="/ أو /home أو /var/log"
          />
        </div>
        <Button onClick={loadFiles} className="h-12 w-full sm:w-auto" disabled={fetchFiles.isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" /> تحميل
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>ملفات النظام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span>المسار الحالي:</span>
              <span className="font-medium">{currentPath}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>عدد العناصر:</span>
              <span className="font-medium">{files.length}</span>
            </div>
          </div>

          {fetchFiles.isLoading ? (
            <PageLoader />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحجم</TableHead>
                  <TableHead>آخر تعديل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={`${file.name}-${file.modified_at}`}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell className="capitalize">{file.type}</TableCell>
                    <TableCell>{file.size.toLocaleString()}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {file.modified_at}
                    </TableCell>
                  </TableRow>
                ))}
                {files.length === 0 && !fetchFiles.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-4 text-center text-sm text-muted-foreground">
                      لم يتم العثور على ملفات بعد. اضغط تحميل لعرض الملفات.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
