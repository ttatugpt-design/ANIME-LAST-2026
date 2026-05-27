import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Folder,
  FileVideo,
  FileImage,
  FileArchive,
  FileText,
  File,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Home,
  ChevronRight,
  HardDrive,
  Terminal,
  AlertCircle,
  Copy,
  Star,
  Server,
  CheckCircle,
  FolderOpen,
  List,
  LayoutGrid,
  FolderPlus,
  Download,
  PackageOpen,
  Pencil,
  Move,
  Database,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface VPSFileEntry {
  name: string;
  type: string;
  size: number;
  modified_at: string;
}

const BOOKMARKS = [
  { label: "الجذر", path: "/", icon: Home },
  { label: "أنيمي", path: "/root/animes", icon: Star },
  { label: "tmp", path: "/tmp", icon: Folder },
  { label: "etc", path: "/etc", icon: Terminal },
  { label: "var/log", path: "/var/log", icon: HardDrive },
  { label: "home", path: "/home", icon: Server },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(file: VPSFileEntry) {
  if (file.type === "directory") return Folder;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mkv", "avi", "webm", "mov", "ts", "m4v"].includes(ext)) return FileVideo;
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return FileImage;
  if (["zip", "tar", "gz", "rar", "7z", "bz2", "xz"].includes(ext)) return FileArchive;
  if (["txt", "log", "md", "json", "js", "ts", "go", "sh", "py", "yaml", "yml"].includes(ext)) return FileText;
  return File;
}

function getIconColor(file: VPSFileEntry): string {
  if (file.type === "directory") return "text-blue-400";
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mkv", "avi", "webm", "mov", "ts", "m4v"].includes(ext)) return "text-purple-400";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "text-emerald-400";
  if (["zip", "tar", "gz", "rar", "7z", "bz2", "xz"].includes(ext)) return "text-yellow-400";
  if (["txt", "log", "md", "json", "js", "ts", "go", "sh", "py"].includes(ext)) return "text-sky-400";
  return "text-gray-500";
}

function getBadgeColor(type: string): string {
  switch (type) {
    case "directory": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "symlink": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default: return "bg-gray-500/15 text-gray-400 border-gray-500/30";
  }
}

export default function VPSManagerPage() {
  const [currentPath, setCurrentPath] = useState("/root/animes");
  const [pathInput, setPathInput] = useState("/root/animes");
  const [files, setFiles] = useState<VPSFileEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  // Create folder modal
  const [showMkdir, setShowMkdir] = useState(false);
  const [mkdirName, setMkdirName] = useState("");
  // Download URL modal
  const [showDownload, setShowDownload] = useState(false);
  const [dlUrl, setDlUrl] = useState("");
  const [dlDest, setDlDest] = useState("/root/animes");
  const [dlFilename, setDlFilename] = useState("");
  // Extract modal
  const [extractTarget, setExtractTarget] = useState<string | null>(null);
  const [extractDest, setExtractDest] = useState("");
  // Rename modal
  const [renameTarget, setRenameTarget] = useState<{ path: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  // Move mode
  const [moveMode, setMoveMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveDest, setMoveDest] = useState("");

  /* ── Fetch files ── */
  const fetchFiles = useMutation({
    mutationFn: async (path: string) => {
      const res = await api.get("/dashboard/vps-downloader/files", { params: { path } });
      return res.data;
    },
    onSuccess: (data) => {
      setFiles(data.files || []);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setFiles([]);
      setErrorMessage(
        err?.response?.data?.error || err?.message || "حدث خطأ أثناء تحميل الملفات."
      );
    },
  });

  /* ── Delete file ── */
  const deleteFile = useMutation({
    mutationFn: async (path: string) => {
      const res = await api.delete("/dashboard/vps-downloader/file", { params: { path } });
      return res.data;
    },
    onSuccess: () => {
      setConfirmDelete(null);
      fetchFiles.mutate(currentPath);
    },
    onError: (err: any) => {
      setConfirmDelete(null);
      setErrorMessage(err?.response?.data?.error || "فشل الحذف.");
    },
  });

  /* ── Make directory ── */
  const mkdirMut = useMutation({
    mutationFn: async (path: string) => {
      const res = await api.post("/dashboard/vps-downloader/mkdir", { path });
      return res.data;
    },
    onSuccess: () => { setShowMkdir(false); setMkdirName(""); fetchFiles.mutate(currentPath); },
    onError: (err: any) => setErrorMessage(err?.response?.data?.error || "فشل إنشاء المجلد."),
  });

  /* ── Extract archive ── */
  const extractMut = useMutation({
    mutationFn: async ({ archive, dest }: { archive: string; dest: string }) => {
      const res = await api.post("/dashboard/vps-downloader/extract", { archive_path: archive, dest_path: dest });
      return res.data;
    },
    onSuccess: () => { setExtractTarget(null); setExtractDest(""); fetchFiles.mutate(currentPath); },
    onError: (err: any) => setErrorMessage(err?.response?.data?.error || "فشل فك الضغط."),
  });

  /* ── Download from URL ── */
  const dlMut = useMutation({
    mutationFn: async () => {
      const res = await api.post("/dashboard/vps-downloader/download-url", { url: dlUrl, dest_dir: dlDest, filename: dlFilename });
      return res.data;
    },
    onSuccess: () => { setShowDownload(false); setDlUrl(""); setDlFilename(""); fetchFiles.mutate(currentPath); },
    onError: (err: any) => setErrorMessage(err?.response?.data?.error || "فشل التحميل."),
  });

  /* ── Navigate ── */
  /* ── Rename ── */
  const renameMut = useMutation({
    mutationFn: async ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
      const res = await api.post("/dashboard/vps-downloader/rename", { old_path: oldPath, new_path: newPath });
      return res.data;
    },
    onSuccess: () => { setRenameTarget(null); setNewName(""); fetchFiles.mutate(currentPath); },
    onError: (err: any) => setErrorMessage(err?.response?.data?.error || "فشل إعادة التسمية."),
  });

  /* ── Move files ── */
  const moveMut = useMutation({
    mutationFn: async ({ sources, dest }: { sources: string[]; dest: string }) => {
      const res = await api.post("/dashboard/vps-downloader/move", { sources, dest_dir: dest });
      return res.data;
    },
    onSuccess: () => {
      setShowMoveModal(false); setMoveMode(false);
      setSelectedPaths(new Set()); setMoveDest("");
      fetchFiles.mutate(currentPath);
    },
    onError: (err: any) => setErrorMessage(err?.response?.data?.error || "فشل النقل."),
  });

  const toggleSelect = (path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const navigateTo = useCallback((path: string) => {
    const p = path.trim() || "/";
    setCurrentPath(p);
    setPathInput(p);
    setMoveMode(false);
    setSelectedPaths(new Set());
    fetchFiles.mutate(p);
  }, []);

  useEffect(() => { fetchFiles.mutate("/root/animes"); }, []);

  /* ── Disk usage ── */
  const diskQuery = useQuery({
    queryKey: ["vps-disk-usage"],
    queryFn: async () => {
      const res = await api.get("/dashboard/vps-downloader/disk-usage");
      return res.data as { total: string; used: string; available: string; use_percent: string };
    },
    refetchInterval: 60000,
  });

  /* ── Derived ── */
  const breadcrumbs = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === "directory" && b.type !== "directory") return -1;
    if (a.type !== "directory" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });

  const totalSize = files.filter(f => f.type !== "directory").reduce((s, f) => s + f.size, 0);
  const dirCount = files.filter(f => f.type === "directory").length;
  const fileCount = files.filter(f => f.type !== "directory").length;

  const fullPath = (name: string) =>
    currentPath.endsWith("/") ? currentPath + name : currentPath + "/" + name;

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  /* ── Render ── */
  return (
    <>
    <div
      className="flex h-full min-h-[80vh] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl"
      style={{ background: "#0d1117", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* ────── Sidebar ────── */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-gray-800/80 bg-[#161b22]">
        {/* VPS info badge */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-emerald-400 tracking-wide">متصل</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            root@209.209.9.219
          </p>
        </div>

        {/* Bookmarks */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 px-3 py-2">المفضلة</p>
          {BOOKMARKS.map((bm) => {
            const Icon = bm.icon;
            const active = currentPath === bm.path;
            return (
              <button
                key={bm.path}
                onClick={() => navigateTo(bm.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150
                  ${active
                    ? "bg-blue-500/20 text-blue-300 font-medium"
                    : "text-gray-400 hover:bg-gray-700/40 hover:text-gray-200"
                  }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{bm.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Stats */}
        <div className="p-3 border-t border-gray-800 space-y-1">
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>مجلدات</span><span className="text-gray-400">{dirCount}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>ملفات</span><span className="text-gray-400">{fileCount}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>الحجم</span><span className="text-gray-400">{formatSize(totalSize)}</span>
          </div>
        </div>

        {/* Disk usage */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Database className="h-3 w-3 text-gray-600" />
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">التخزين</span>
          </div>
          {diskQuery.isLoading ? (
            <div className="h-2 rounded-full bg-gray-800 animate-pulse" />
          ) : diskQuery.data ? (
            <>
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{ width: diskQuery.data.use_percent }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>مستخدم {diskQuery.data.used}</span>
                <span className="text-gray-500">{diskQuery.data.use_percent}</span>
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                <span>متاح {diskQuery.data.available}</span>
                <span>كلي {diskQuery.data.total}</span>
              </div>
            </>
          ) : (
            <p className="text-[9px] text-gray-700">تعذر تحميل البيانات</p>
          )}
        </div>
      </aside>

      {/* ────── Main ────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top toolbar */}
        <header className="bg-[#161b22] border-b border-gray-800 px-4 py-2.5 flex items-center gap-2">
          {/* Back */}
          <button
            onClick={() => navigateTo(currentPath.split("/").slice(0, -1).join("/") || "/")}
            disabled={currentPath === "/"}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            title="رجوع"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-1 bg-[#0d1117] border border-gray-700/60 rounded-lg px-3 py-1.5 min-w-0">
            <button onClick={() => navigateTo("/")} className="text-blue-400 hover:text-blue-300 text-xs transition-colors shrink-0">
              /
            </button>
            {breadcrumbs.map((part, i) => {
              const path = "/" + breadcrumbs.slice(0, i + 1).join("/");
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  <ChevronRight className="h-3 w-3 text-gray-700 shrink-0" />
                  <button
                    onClick={() => navigateTo(path)}
                    className={`text-xs truncate transition-colors ${isLast ? "text-gray-200 cursor-default" : "text-blue-400 hover:text-blue-300"
                      }`}
                  >
                    {part}
                  </button>
                </span>
              );
            })}
          </div>

          {/* Path input */}
          <input
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigateTo(pathInput)}
            placeholder="/root/animes"
            className="w-44 bg-[#0d1117] border border-gray-700/60 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />

          {/* View toggle */}
          <button
            onClick={() => setViewMode(v => v === "list" ? "grid" : "list")}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 transition-all"
            title="تبديل العرض"
          >
            {viewMode === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchFiles.mutate(currentPath)}
            disabled={fetchFiles.isPending}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 transition-all"
            title="تحديث"
          >
            <RefreshCw className={`h-4 w-4 ${fetchFiles.isPending ? "animate-spin text-blue-400" : ""}`} />
          </button>

          {/* Create folder */}
          <button
            onClick={() => { setMkdirName(""); setShowMkdir(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all"
            title="مجلد جديد"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">مجلد</span>
          </button>

          {/* Download from URL */}
          <button
            onClick={() => { setDlUrl(""); setDlFilename(""); setDlDest(currentPath); setShowDownload(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
            title="تحميل من رابط"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تحميل</span>
          </button>

          {/* Move mode toggle */}
          <button
            onClick={() => { setMoveMode(m => !m); setSelectedPaths(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
              moveMode
                ? "bg-orange-500/30 text-orange-300 border-orange-500/50"
                : "bg-orange-600/15 hover:bg-orange-600/25 text-orange-400 border-orange-500/30"
            }`}
            title="وضع النقل"
          >
            <Move className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{moveMode ? `محدد (${selectedPaths.size})` : "نقل"}</span>
          </button>
        </header>

        {/* Error banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-900/10 px-4 py-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="break-all">{errorMessage}</span>
          </div>
        )}

        {/* ── File area ── */}
        <div className="flex-1 overflow-auto p-4">
          {fetchFiles.isPending ? (
            /* Skeleton */
            <div className="space-y-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg bg-gray-800/40 animate-pulse"
                  style={{ animationDelay: `${i * 40}ms`, opacity: 1 - i * 0.07 }}
                />
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-64 text-gray-700">
              <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">المجلد فارغ</p>
              <p className="text-xs mt-1 opacity-60">{currentPath}</p>
            </div>
          ) : viewMode === "list" ? (
            /* ─── List view ─── */
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-right pb-2 w-6" />
                  <th className="text-right pb-2 font-medium">الاسم</th>
                  <th className="text-right pb-2 font-medium w-16">النوع</th>
                  <th className="text-right pb-2 font-medium w-24">الحجم</th>
                  <th className="text-right pb-2 font-medium w-36">آخر تعديل</th>
                  <th className="text-right pb-2 font-medium w-16">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiles.map((file) => {
                  const Icon = getFileIcon(file);
                  const iconColor = getIconColor(file);
                  const fp = fullPath(file.name);

                  return (
                    <tr
                      key={file.name}
                      className={`border-b border-gray-800/40 hover:bg-gray-800/25 transition-colors group ${
                        moveMode && selectedPaths.has(fp) ? "bg-orange-900/15" : ""
                      }`}
                    >
                      <td className="py-2 pr-1 pl-2">
                        {moveMode ? (
                          <input
                            type="checkbox"
                            checked={selectedPaths.has(fp)}
                            onChange={() => toggleSelect(fp)}
                            className="accent-orange-400 cursor-pointer"
                          />
                        ) : (
                          <Icon className={`h-4 w-4 ${iconColor}`} />
                        )}
                      </td>

                      <td className="py-2 pr-1 max-w-0">
                        {file.type === "directory" ? (
                          <button
                            onClick={() => navigateTo(fp)}
                            className="text-blue-300 hover:text-blue-200 hover:underline transition-colors text-left truncate max-w-xs block"
                          >
                            {file.name}
                          </button>
                        ) : (
                          <span className="text-gray-300 truncate max-w-xs block">{file.name}</span>
                        )}
                      </td>

                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getBadgeColor(file.type)}`}>
                          {file.type === "directory" ? "مجلد" : file.type === "symlink" ? "رابط" : "ملف"}
                        </span>
                      </td>

                      <td className="py-2 text-gray-500">
                        {file.type === "directory" ? "—" : formatSize(file.size)}
                      </td>

                      <td className="py-2 text-gray-600 whitespace-nowrap">{file.modified_at}</td>

                      <td className="py-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyPath(fp)}
                            className="p-1 rounded hover:bg-gray-700 text-gray-600 hover:text-gray-300 transition-colors"
                            title="نسخ المسار"
                          >
                            {copiedPath === fp
                              ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                              : <Copy className="h-3 w-3" />}
                          </button>
                          {["zip","tar","gz","rar","7z","bz2","xz"].includes(file.name.split(".").pop()?.toLowerCase() || "") && (
                            <button
                              onClick={() => { setExtractTarget(fp); setExtractDest(currentPath); }}
                              className="p-1 rounded hover:bg-yellow-900/40 text-gray-600 hover:text-yellow-400 transition-colors"
                              title="فك الضغط"
                            >
                              <PackageOpen className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => { setRenameTarget({ path: fp, name: file.name }); setNewName(file.name); }}
                            className="p-1 rounded hover:bg-blue-900/40 text-gray-600 hover:text-blue-400 transition-colors"
                            title="إعادة تسمية"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(fp)}
                            className="p-1 rounded hover:bg-red-900/40 text-gray-600 hover:text-red-400 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* ─── Grid view ─── */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {sortedFiles.map((file) => {
                const Icon = getFileIcon(file);
                const iconColor = getIconColor(file);
                const fp = fullPath(file.name);

                return (
                  <div
                    key={file.name}
                    className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-800/60 bg-gray-800/20 hover:bg-gray-800/40 hover:border-gray-700 transition-all cursor-pointer"
                    onClick={() => file.type === "directory" && navigateTo(fp)}
                  >
                    <Icon className={`h-8 w-8 ${iconColor}`} />
                    <span className="text-[10px] text-gray-300 text-center truncate w-full leading-snug">
                      {file.name}
                    </span>
                    {file.type !== "directory" && (
                      <span className="text-[9px] text-gray-600">{formatSize(file.size)}</span>
                    )}
                    {/* Hover actions */}
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyPath(fp); }}
                        className="p-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-gray-200 transition-colors"
                      >
                        {copiedPath === fp
                          ? <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                          : <Copy className="h-2.5 w-2.5" />
                        }
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(fp); }}
                        className="p-0.5 rounded bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Move selection bar */}
        {moveMode && (
          <div className="bg-orange-900/20 border-t border-orange-800/40 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-orange-400">
              {selectedPaths.size > 0
                ? `تم تحديد ${selectedPaths.size} عنصر`
                : "حدد الملفات التي تريد نقلها"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setMoveMode(false); setSelectedPaths(new Set()); }}
                className="px-3 py-1 text-xs rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 transition-all"
              >إلغاء</button>
              <button
                onClick={() => { setMoveDest(currentPath); setShowMoveModal(true); }}
                disabled={selectedPaths.size === 0}
                className="px-3 py-1 text-xs rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-40 flex items-center gap-1.5 transition-all"
              >
                <Move className="h-3 w-3" />
                نقل ({selectedPaths.size})
              </button>
            </div>
          </div>
        )}

        {/* Status bar */}
        <footer className="bg-[#161b22] border-t border-gray-800 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-600">
          <span>
            {dirCount} مجلد · {fileCount} ملف
          </span>
          <span className="font-mono text-gray-500">{currentPath}</span>
          <span>{formatSize(totalSize)}</span>
        </footer>
      </div>

      {/* ────── Delete confirmation modal ────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-md mx-4 rounded-2xl border border-red-900/50 p-6 shadow-2xl"
            style={{ background: "#161b22" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-400">تأكيد الحذف</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="mb-5 rounded-xl bg-[#0d1117] border border-gray-800 p-3">
              <p className="text-[10px] text-gray-600 mb-1">المسار:</p>
              <p className="text-xs text-gray-300 break-all font-mono">{confirmDelete}</p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteFile.mutate(confirmDelete)}
                disabled={deleteFile.isPending}
                className="px-4 py-2 text-xs rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {deleteFile.isPending && (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                )}
                {deleteFile.isPending ? "جارٍ الحذف..." : "حذف نهائي"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Folder Modal ── */}
      {showMkdir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-blue-900/50 p-6 shadow-2xl" style={{ background: "#161b22" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10"><FolderPlus className="h-5 w-5 text-blue-400" /></div>
              <h3 className="text-sm font-semibold text-blue-400">إنشاء مجلد جديد</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-1">في: <span className="text-gray-400">{currentPath}</span></p>
            <input
              autoFocus
              value={mkdirName}
              onChange={e => setMkdirName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && mkdirName.trim() && mkdirMut.mutate(currentPath + "/" + mkdirName.trim())}
              placeholder="اسم المجلد"
              className="w-full mt-2 mb-4 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-blue-500/60"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowMkdir(false)} className="px-4 py-2 text-xs rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300">إلغاء</button>
              <button
                onClick={() => mkdirMut.mutate(currentPath + "/" + mkdirName.trim())}
                disabled={!mkdirName.trim() || mkdirMut.isPending}
                className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-60 flex items-center gap-2"
              >
                {mkdirMut.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Download URL Modal ── */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-emerald-900/50 p-6 shadow-2xl" style={{ background: "#161b22" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10"><Download className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-400">تحميل من رابط مباشر</h3>
                <p className="text-[10px] text-gray-500">يتم التحميل على الـ VPS مباشرة</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">رابط التحميل المباشر *</label>
                <input autoFocus value={dlUrl} onChange={e => setDlUrl(e.target.value)} placeholder="https://example.com/file.mp4"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-emerald-500/60" />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">مجلد الحفظ</label>
                <input value={dlDest} onChange={e => setDlDest(e.target.value)} placeholder="/root/animes"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-emerald-500/60" />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">اسم الملف (اختياري)</label>
                <input value={dlFilename} onChange={e => setDlFilename(e.target.value)} placeholder="movie.mp4 (اتركه فارغاً للاسم التلقائي)"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-emerald-500/60" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDownload(false)} className="px-4 py-2 text-xs rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300">إلغاء</button>
              <button
                onClick={() => dlMut.mutate()}
                disabled={!dlUrl.trim() || dlMut.isPending}
                className="px-4 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-60 flex items-center gap-2"
              >
                {dlMut.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {dlMut.isPending ? "جارٍ التحميل..." : "تحميل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extract Modal ── */}
      {extractTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-yellow-900/50 p-6 shadow-2xl" style={{ background: "#161b22" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-yellow-500/10"><PackageOpen className="h-5 w-5 text-yellow-400" /></div>
              <h3 className="text-sm font-semibold text-yellow-400">فك ضغط الملف</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-1">الملف:</p>
            <p className="text-xs text-gray-300 bg-[#0d1117] rounded p-2 mb-3 break-all font-mono">{extractTarget}</p>
            <div className="mb-4">
              <label className="text-[10px] text-gray-600 mb-1 block">مجلد الاستخراج</label>
              <input value={extractDest} onChange={e => setExtractDest(e.target.value)} placeholder={currentPath}
                className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-yellow-500/60" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setExtractTarget(null)} className="px-4 py-2 text-xs rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300">إلغاء</button>
              <button
                onClick={() => extractMut.mutate({ archive: extractTarget, dest: extractDest || currentPath })}
                disabled={extractMut.isPending}
                className="px-4 py-2 text-xs rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-medium disabled:opacity-60 flex items-center gap-2"
              >
                {extractMut.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {extractMut.isPending ? "جارٍ فك الضغط..." : "فك الضغط"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ── */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-blue-900/50 p-6 shadow-2xl" style={{ background: "#161b22" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10"><Pencil className="h-5 w-5 text-blue-400" /></div>
              <div>
                <h3 className="text-sm font-semibold text-blue-400">إعادة تسمية</h3>
                <p className="text-[10px] text-gray-600 break-all mt-0.5">{renameTarget.path}</p>
              </div>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newName.trim() && newName !== renameTarget.name) {
                  const dir = renameTarget.path.substring(0, renameTarget.path.lastIndexOf("/"));
                  renameMut.mutate({ oldPath: renameTarget.path, newPath: dir + "/" + newName.trim() });
                }
              }}
              className="w-full mb-4 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-blue-500/60"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenameTarget(null)} className="px-4 py-2 text-xs rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300">إلغاء</button>
              <button
                onClick={() => {
                  const dir = renameTarget.path.substring(0, renameTarget.path.lastIndexOf("/"));
                  renameMut.mutate({ oldPath: renameTarget.path, newPath: dir + "/" + newName.trim() });
                }}
                disabled={!newName.trim() || newName === renameTarget.name || renameMut.isPending}
                className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-60 flex items-center gap-2"
              >
                {renameMut.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move Destination Modal ── */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-orange-900/50 p-6 shadow-2xl" style={{ background: "#161b22" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-orange-500/10"><Move className="h-5 w-5 text-orange-400" /></div>
              <div>
                <h3 className="text-sm font-semibold text-orange-400">نقل {selectedPaths.size} عنصر</h3>
                <p className="text-[10px] text-gray-500">حدد مجلد الوجهة</p>
              </div>
            </div>
            <div className="mb-4 bg-[#0d1117] rounded-xl border border-gray-800 p-3 max-h-28 overflow-auto space-y-0.5">
              {[...selectedPaths].map(p => (
                <p key={p} className="text-[10px] text-gray-500 font-mono truncate">{p}</p>
              ))}
            </div>
            <div className="mb-5">
              <label className="text-[10px] text-gray-600 mb-1 block">مجلد الوجهة</label>
              <input
                autoFocus
                value={moveDest}
                onChange={e => setMoveDest(e.target.value)}
                placeholder="/root/animes/مجلدجديد"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-orange-500/60"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowMoveModal(false)} className="px-4 py-2 text-xs rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300">إلغاء</button>
              <button
                onClick={() => moveMut.mutate({ sources: [...selectedPaths], dest: moveDest })}
                disabled={!moveDest.trim() || moveMut.isPending}
                className="px-4 py-2 text-xs rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-60 flex items-center gap-2"
              >
                {moveMut.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {moveMut.isPending ? "جارٍ النقل..." : "نقل"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
