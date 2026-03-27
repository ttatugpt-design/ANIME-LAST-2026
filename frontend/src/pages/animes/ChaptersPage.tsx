import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Search, ChevronLeft, ChevronRight, Image as ImageIcon, X, MoveUp, MoveDown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

export default function ChaptersPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const limit = 20;
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Form State
    const initialFormState = {
        anime_id: 0,
        title: "",
        title_en: "",
        slug: "",
        slug_en: "",
        chapter_number: 1,
        images: [] as string[],
        is_published: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [editingChapter, setEditingChapter] = useState<any>(null);

    // Queries
    const { data: chaptersData, isLoading: isLoadingChapters } = useQuery({
        queryKey: ["chapters", page, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: debouncedSearch,
                paginate: "true"
            });
            return (await api.get(`/chapters?${params.toString()}`)).data;
        },
        placeholderData: keepPreviousData,
    });

    const chapters = chaptersData?.data || [];
    const totalPages = chaptersData?.last_page || 1;

    // Fetch Mangas for selector
    const { data: mangas } = useQuery({
        queryKey: ["animes", "manga_list"],
        queryFn: async () => (await api.get("/animes", { params: { type: "manga", limit: 0 } })).data,
    });

    const mangaList = Array.isArray(mangas) ? mangas : (mangas?.data || []);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { 
                ...data, 
                images: JSON.stringify(data.images),
                chapter_number: parseInt(data.chapter_number),
                anime_id: parseInt(data.anime_id)
            };
            return await api.post("/chapters", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            toast.success("Chapter created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create chapter: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { 
                ...data, 
                images: JSON.stringify(data.images),
                chapter_number: parseInt(data.chapter_number),
                anime_id: parseInt(data.anime_id)
            };
            return await api.put(`/chapters/${editingChapter.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            toast.success("Chapter updated successfully");
            setIsEditModalOpen(false);
            setEditingChapter(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update chapter: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/chapters/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            toast.success("Chapter deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete chapter: " + (err.response?.data?.error || err.message));
        }
    });

    const resetForm = () => {
        setFormData(initialFormState);
        setEditingChapter(null);
    };

    const handleEditClick = (chapter: any) => {
        let imagesList = [];
        try {
            imagesList = JSON.parse(chapter.images);
        } catch {
            imagesList = [];
        }

        setEditingChapter(chapter);
        setFormData({
            anime_id: chapter.anime_id,
            title: chapter.title || "",
            title_en: chapter.title_en || "",
            slug: chapter.slug || "",
            slug_en: chapter.slug_en || "",
            chapter_number: chapter.chapter_number || 1,
            images: imagesList,
            is_published: chapter.is_published,
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this chapter?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Ensure manga and title are selected
        const manga = mangaList.find((m: any) => m.id == formData.anime_id);
        if (!manga) {
            toast.error("Please select a manga first");
            return;
        }
        if (!formData.title) {
            toast.error("Please enter a chapter title first (e.g. الفصل 42)");
            return;
        }

        setUploadingImages(true);
        const uploadedUrls: string[] = [];
        const folderPath = `manga/${manga.title}/${formData.title}`;

        try {
            for (let i = 0; i < files.length; i++) {
                const formDataUpload = new FormData();
                formDataUpload.append("file", files[i]);
                const res = await api.post(`/upload?folder=${encodeURIComponent(folderPath)}&use_original=true`, formDataUpload);
                uploadedUrls.push(res.data.url);
            }
            setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
            toast.success(`${files.length} images uploaded`);
        } catch (err) {
            toast.error("Failed to upload some images");
        } finally {
            setUploadingImages(false);
            e.target.value = ""; // Clear input
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const moveImage = (index: number, direction: 'up' | 'down') => {
        const newImages = [...formData.images];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newImages.length) return;
        
        [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
        setFormData(prev => ({ ...prev, images: newImages }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Chapters</h2>
                    <p className="text-muted-foreground">Manage manga chapters.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search chapters..."
                            className="pl-8 w-[250px]"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                    </div>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Chapter
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Add Chapter</DialogTitle>
                                <DialogDescription>Create a new chapter for a manga.</DialogDescription>
                            </DialogHeader>
                            <ChapterFormContent 
                                formData={formData} 
                                setFormData={setFormData}
                                mangaList={mangaList}
                                handleImageUpload={handleImageUpload}
                                uploadingImages={uploadingImages}
                                removeImage={removeImage}
                                moveImage={moveImage}
                                onSubmit={() => createMutation.mutate(formData)}
                                isPending={createMutation.isPending}
                                onCancel={() => setIsAddModalOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Chapter</DialogTitle>
                    </DialogHeader>
                    <ChapterFormContent 
                        formData={formData} 
                        setFormData={setFormData}
                        mangaList={mangaList}
                        handleImageUpload={handleImageUpload}
                        uploadingImages={uploadingImages}
                        removeImage={removeImage}
                        moveImage={moveImage}
                        onSubmit={() => updateMutation.mutate(formData)}
                        isPending={updateMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Chapters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        {isLoadingChapters && <div className="p-8 text-center"><PageLoader /></div>}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Manga</TableHead>
                                    <TableHead>Chapter</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Images</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chapters.map((chapter: any) => (
                                    <TableRow key={chapter.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <img src={chapter.anime?.image} alt="" className="w-8 h-10 object-cover rounded" />
                                                <span className="font-medium">{chapter.anime?.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>#{chapter.chapter_number}</TableCell>
                                        <TableCell>{chapter.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {(() => {
                                                    try {
                                                        return JSON.parse(chapter.images).length;
                                                    } catch {
                                                        return 0;
                                                    }
                                                })()} pages
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {chapter.is_published ? <Badge className="bg-green-500">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(chapter)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(chapter.id)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {chapters.length === 0 && !isLoadingChapters && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">No chapters found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between py-4">
                            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ChapterFormContent({
    formData, setFormData, mangaList, handleImageUpload, uploadingImages, removeImage, moveImage, onSubmit, isPending, onCancel
}: any) {
    return (
        <>
            <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label>Select Manga *</Label>
                            <div className="grid grid-cols-1 gap-2">
                                <select 
                                    className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.anime_id}
                                    onChange={(e) => setFormData({ ...formData, anime_id: e.target.value })}
                                >
                                    <option value={0}>Choose a manga...</option>
                                    {mangaList.map((m: any) => (
                                        <option key={m.id} value={m.id}>
                                            {m.title}
                                        </option>
                                    ))}
                                </select>
                                {formData.anime_id > 0 && (
                                    <div className="flex items-center gap-3 p-2 border rounded-md bg-secondary/20">
                                        <img 
                                            src={mangaList.find((m: any) => m.id == formData.anime_id)?.image} 
                                            alt="" 
                                            className="w-10 h-14 object-cover rounded shadow-sm" 
                                        />
                                        <div>
                                            <p className="font-semibold text-sm">
                                                {mangaList.find((m: any) => m.id == formData.anime_id)?.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground uppercase">
                                                {mangaList.find((m: any) => m.id == formData.anime_id)?.type}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Title (Arabic) *</Label>
                                <Input 
                                    placeholder="الفصل 1..." 
                                    value={formData.title} 
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Title (English)</Label>
                                <Input 
                                    placeholder="Chapter 1..." 
                                    value={formData.title_en} 
                                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Chapter Number *</Label>
                                <Input 
                                    type="number" 
                                    value={formData.chapter_number} 
                                    onChange={(e) => setFormData({ ...formData, chapter_number: e.target.value })} 
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <input 
                                    type="checkbox" 
                                    id="published" 
                                    className="h-4 w-4" 
                                    checked={formData.is_published}
                                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                />
                                <Label htmlFor="published">Published</Label>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Chapter Images (Manga Pages)</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-secondary/10 transition-colors relative">
                                <Input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={handleImageUpload}
                                    disabled={uploadingImages}
                                />
                                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm font-medium">Click or drag images to upload</p>
                                <p className="text-xs text-muted-foreground mt-1">Select multiple images at once (Pages order is based on selection/upload)</p>
                                {uploadingImages && <div className="mt-2 text-primary font-bold animate-pulse">Uploading...</div>}
                            </div>

                            {formData.images.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pages Preview ({formData.images.length})</Label>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFormData({...formData, images: []})}>Clear All</Button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 border rounded-md p-2 bg-secondary/10">
                                        {formData.images.map((url: string, idx: number) => (
                                            <div key={idx} className="relative group aspect-[2/3] bg-black rounded overflow-hidden shadow-sm border border-border/50">
                                                <img src={url} alt="" className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                                    <div className="flex gap-1">
                                                        <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full" onClick={() => moveImage(idx, 'up')} disabled={idx === 0}>
                                                            <MoveUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full" onClick={() => moveImage(idx, 'down')} disabled={idx === formData.images.length - 1}>
                                                            <MoveDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => removeImage(idx)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                    <span className="text-[10px] text-white font-bold">{idx + 1}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button 
                    onClick={onSubmit} 
                    disabled={isPending || !formData.title || formData.anime_id == 0 || formData.images.length === 0}
                >
                    {isPending ? "Saving..." : "Save Chapter"}
                </Button>
            </DialogFooter>
        </>
    );
}
