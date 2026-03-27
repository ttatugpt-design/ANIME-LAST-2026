import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Check, X as XIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/ui/multi-select";
import { useDebounce } from "@/hooks/use-debounce";

export default function MangasPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Pagination & Search State
    const [page, setPage] = useState(1);
    const limit = 20;
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        title_en: "",
        slug: "",
        slug_en: "",
        description: "",
        description_en: "",
        category_ids: [] as number[], // IDs
        season_id: 0,
        studio_id: 0,
        language_id: 0,
        seasons: 1,
        status: "Ongoing",
        release_date: "",
        rating: 0,
        image: "",
        icon_image: "", // New field
        cover: "",
        duration: 24,
        trailer: "",
        type: "TV",
        is_published: true
    });

    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    const [editingManga, setEditingManga] = useState<any>(null);

    // Queries
    const { data: mangasData, isLoading: isLoadingMangas } = useQuery({
        queryKey: ["mangas", "all_admin_manga", page, limit, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                type: "all_admin_manga",
                page: page.toString(),
                limit: limit.toString(),
                paginate: "true"
            });
            if (debouncedSearch) {
                params.append("search", debouncedSearch);
            }
            return (await api.get(`/mangas?${params.toString()}`)).data;
        },
        placeholderData: keepPreviousData,
    });

    const mangas = mangasData?.data || [];
    const totalPages = mangasData?.last_page || 1;

    const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: async () => (await api.get("/categories")).data });
    const { data: types } = useQuery({ queryKey: ["types"], queryFn: async () => (await api.get("/types")).data });
    const { data: studios } = useQuery({ queryKey: ["studios"], queryFn: async () => (await api.get("/studios")).data });
    const { data: languages } = useQuery({ queryKey: ["languages"], queryFn: async () => (await api.get("/languages")).data });
    const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: async () => (await api.get("/seasons")).data });

    // Helper options
    const categoryOptions = categories?.map((c: any) => ({ label: c.title || c.name, value: c.id })) || [];
    const typeOptions = types?.map((t: any) => ({ label: t.name, value: t.slug || t.name })) || []; // Use slugs for stability
    const studioOptions = studios?.map((s: any) => ({ label: s.name, value: s.id })) || [];
    const languageOptions = languages?.map((l: any) => ({ label: l.name, value: l.id })) || [];
    const seasonOptions = seasons?.map((s: any) => ({ label: s.name, value: s.id })) || [];

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data };
            payload.seasons = parseInt(payload.seasons);
            payload.rating = parseFloat(payload.rating);
            payload.duration = parseInt(payload.duration);
            payload.season_id = parseInt(payload.season_id);
            payload.studio_id = parseInt(payload.studio_id);
            payload.language_id = parseInt(payload.language_id);

            if (payload.release_date) payload.release_date = new Date(payload.release_date).toISOString();

            return await api.post("/mangas", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mangas"] });
            toast.success("Manga created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create manga: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingManga) throw new Error("No manga selected");
            const payload = { ...formData };
            payload.seasons = parseInt(payload.seasons as any);
            payload.rating = parseFloat(payload.rating as any);
            payload.duration = parseInt(payload.duration as any);
            payload.season_id = parseInt(payload.season_id as any);
            payload.studio_id = parseInt(payload.studio_id as any);
            payload.language_id = parseInt(payload.language_id as any);

            if (payload.release_date) payload.release_date = new Date(payload.release_date).toISOString();

            return await api.put(`/mangas/${editingManga.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mangas"] });
            toast.success("Manga updated successfully");
            setIsEditModalOpen(false);
            setEditingManga(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update manga: " + (err.response?.data?.error || err.message));
        },
    });

    const togglePublishedMutation = useMutation({
        mutationFn: async (manga: any) => {
            const payload = { ...manga };
            
            // Clean up relationships before sending to API
            delete payload.categories;
            delete payload.season;
            delete payload.studio;
            delete payload.language_rel;
            
            payload.is_published = !manga.is_published;
            
            // Ensure proper types
            payload.seasons = parseInt(payload.seasons as any) || 1;
            payload.rating = parseFloat(payload.rating as any) || 0;
            payload.duration = parseInt(payload.duration as any) || 24;
            payload.season_id = parseInt(payload.season_id as any) || 0;
            payload.studio_id = parseInt(payload.studio_id as any) || 0;
            payload.language_id = parseInt(payload.language_id as any) || 0;
            payload.category_ids = manga.categories ? manga.categories.map((c: any) => c.id) : [];

            return await api.put(`/mangas/${manga.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mangas"] });
            toast.success("Publication status updated");
        },
        onError: (err: any) => {
            toast.error("Failed to update status: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/mangas/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mangas"] });
            toast.success("Manga deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete manga: " + (err.response?.data?.error || err.message));
        }
    });

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/upload", formData);
        return res.data.url;
    };

    const handleImageUpload = async (e: any, field: 'image' | 'cover' | 'icon_image') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (field === 'image') setUploadingImage(true);
        else if (field === 'cover') setUploadingCover(true);
        // We can add simple loading state for icon if needed, or share

        try {
            const url = await uploadFile(file);
            handleChange(field, url);
            toast.success("Image uploaded");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            if (field === 'image') setUploadingImage(false);
            else if (field === 'cover') setUploadingCover(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: "", title_en: "", slug: "", slug_en: "", description: "", description_en: "",
            category_ids: [], seasons: 1, status: "Ongoing", release_date: "", rating: 0,
            image: "", icon_image: "", cover: "", duration: 24, trailer: "", type: "TV", is_published: true,
            season_id: 0, studio_id: 0, language_id: 0
        });
    };

    const handleEditClick = (manga: any) => {
        // Extract relation IDs
        const catIds = manga.categories ? manga.categories.map((c: any) => c.id) : [];
        const seasonId = manga.season?.id || manga.season_id || 0;
        const studioId = manga.studio?.id || manga.studio_id || 0;
        const languageId = manga.language_rel?.id || manga.language_id || 0; // Notice language_rel from backend preload

        setEditingManga(manga);
        setFormData({
            title: manga.title || "",
            title_en: manga.title_en || "",
            slug: manga.slug || "",
            slug_en: manga.slug_en || "",
            description: manga.description || "",
            description_en: manga.description_en || "",
            category_ids: catIds,
            seasons: manga.seasons || 1,
            status: manga.status || "Ongoing",
            release_date: manga.release_date ? manga.release_date.split('T')[0] : "",
            rating: manga.rating || 0,
            image: manga.image || "",
            icon_image: manga.icon_image || "",
            cover: manga.cover || "",
            duration: manga.duration || 24,
            trailer: manga.trailer || "",
            type: manga.type || "TV",
            is_published: manga.is_published !== undefined ? manga.is_published : true,
            season_id: seasonId,
            studio_id: studioId,
            language_id: languageId
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this manga?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        createMutation.mutate(formData);
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Reset page to 1 when search changes
    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mangas</h2>
                    <p className="text-muted-foreground">Manage manga library.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search mangas..."
                            className="pl-8 w-[250px]"
                            value={searchQuery}
                            onChange={onSearchChange}
                        />
                    </div>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Manga
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Add Manga</DialogTitle>
                                <DialogDescription>
                                    Add a new manga to the database.
                                </DialogDescription>
                            </DialogHeader>
                            <MangaFormContent
                                formData={formData}
                                handleChange={handleChange}
                                categoryOptions={categoryOptions}
                                typeOptions={typeOptions}
                                studioOptions={studioOptions}
                                languageOptions={languageOptions}
                                seasonOptions={seasonOptions}
                                handleImageUpload={handleImageUpload}
                                uploadingImage={uploadingImage}
                                uploadingCover={uploadingCover}
                                onSubmit={handleCreate}
                                isPending={createMutation.isPending}
                                onCancel={() => setIsAddModalOpen(false)}
                                submitLabel="Create Manga"
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Manga</DialogTitle>
                    </DialogHeader>
                    <MangaFormContent
                        formData={formData}
                        handleChange={handleChange}
                        categoryOptions={categoryOptions}
                        typeOptions={typeOptions}
                        studioOptions={studioOptions}
                        languageOptions={languageOptions}
                        seasonOptions={seasonOptions}
                        handleImageUpload={handleImageUpload}
                        uploadingImage={uploadingImage}
                        uploadingCover={uploadingCover}
                        onSubmit={() => updateMutation.mutate()}
                        isPending={updateMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                        submitLabel="Save Changes"
                    />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Mangas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        {isLoadingMangas && mangas.length === 0 && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm h-[400px]">
                                <PageLoader />
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Published</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mangas?.map((manga: any) => (
                                    <TableRow key={manga.id}>
                                        <TableCell className="font-medium">{manga.id}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {manga.icon_image && (
                                                        <img
                                                            src={manga.icon_image}
                                                            alt="Icon"
                                                            className="w-8 h-8 rounded-full border-2 border-background object-cover z-10"
                                                        />
                                                    )}
                                                    {manga.image && (
                                                        <img
                                                            src={manga.image}
                                                            alt={manga.title}
                                                            className="w-8 h-12 rounded object-cover shadow-sm"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{manga.title}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{manga.type} • {manga.status}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{manga.status}</TableCell>
                                        <TableCell>{manga.rating}</TableCell>
                                        <TableCell>
                                            {manga.is_published ? <Check className="text-green-500 h-4 w-4" /> : <XIcon className="text-red-500 h-4 w-4" />}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className={manga.is_published ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                                                    onClick={() => togglePublishedMutation.mutate(manga)}
                                                    disabled={togglePublishedMutation.isPending}
                                                >
                                                    {manga.is_published ? "Draft" : "Publish"}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(manga)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(manga.id)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {mangas?.length === 0 && !isLoadingMangas && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No mangas found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

// Subcomponent for reuse

export function MangaFormContent({
    formData, handleChange,
    categoryOptions, typeOptions, studioOptions, languageOptions, seasonOptions,
    handleImageUpload, uploadingImage, uploadingCover,
    onSubmit, isPending, onCancel, submitLabel
}: any) {
    return (
        <>
            <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="media">Media</TabsTrigger>
                        <TabsTrigger value="meta">Meta</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Title (Arabic)</Label>
                                <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Title (English)</Label>
                                <Input value={formData.title_en} onChange={(e) => handleChange('title_en', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Slug (Arabic)</Label>
                                <Input value={formData.slug} onChange={(e) => handleChange('slug', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Slug (English)</Label>
                                <Input value={formData.slug_en} onChange={(e) => handleChange('slug_en', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Description (Arabic)</Label>
                            <Textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description (English)</Label>
                            <Textarea value={formData.description_en} onChange={(e) => handleChange('description_en', e.target.value)} />
                        </div>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2 col-span-2">
                                <Label>Categories</Label>
                                <MultiSelect
                                    options={categoryOptions}
                                    selected={formData.category_ids}
                                    onChange={(val) => handleChange('category_ids', val)}
                                    placeholder="Select categories..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Season</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.season_id}
                                    onChange={(e) => handleChange('season_id', e.target.value)}
                                >
                                    <option value={0}>Select Season</option>
                                    {seasonOptions.map((op: any) => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.type}
                                    onChange={(e) => handleChange('type', e.target.value)}
                                >
                                    <option value="">Select Type</option>
                                    {typeOptions.map((op: any) => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                >
                                    <option value="Ongoing">Ongoing</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Upcoming">Upcoming</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Release Date</Label>
                                <Input type="date" value={formData.release_date} onChange={(e) => handleChange('release_date', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Rating (0-10)</Label>
                                <Input type="number" step="0.1" value={formData.rating} onChange={(e) => handleChange('rating', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Duration (min)</Label>
                                <Input type="number" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Seasons Count</Label>
                                <Input type="number" value={formData.seasons} onChange={(e) => handleChange('seasons', e.target.value)} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="media" className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Icon Image</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'icon_image')} disabled={uploadingImage} />
                            </div>
                            {formData.icon_image && <img src={formData.icon_image} alt="Icon" className="h-10 w-10 object-cover rounded mt-2 border" />}
                        </div>
                        <div className="grid gap-2">
                            <Label>Poster Image</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} disabled={uploadingImage} />
                                {uploadingImage && <span className="text-xs text-muted-foreground">Uploading...</span>}
                            </div>
                            {formData.image && <img src={formData.image} alt="Poster" className="h-20 w-auto object-cover rounded mt-2 border" />}
                        </div>
                        <div className="grid gap-2">
                            <Label>Banner Image</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} disabled={uploadingCover} />
                                {uploadingCover && <span className="text-xs text-muted-foreground">Uploading...</span>}
                            </div>
                            {formData.cover && <img src={formData.cover} alt="Banner" className="h-20 w-auto object-cover rounded mt-2 border" />}
                        </div>
                        <div className="grid gap-2">
                            <Label>Trailer URL</Label>
                            <Input value={formData.trailer} onChange={(e) => handleChange('trailer', e.target.value)} />
                        </div>
                    </TabsContent>

                    <TabsContent value="meta" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Studio</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.studio_id}
                                    onChange={(e) => handleChange('studio_id', e.target.value)}
                                >
                                    <option value={0}>Select Studio</option>
                                    {studioOptions.map((op: any) => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Language</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.language_id}
                                    onChange={(e) => handleChange('language_id', e.target.value)}
                                >
                                    <option value={0}>Select Language</option>
                                    {languageOptions.map((op: any) => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <Label>Is Published?</Label>
                                <input
                                    type="checkbox"
                                    checked={formData.is_published}
                                    onChange={(e) => handleChange('is_published', e.target.checked)}
                                    className="h-4 w-4"
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={onSubmit} disabled={isPending || !formData.title.trim()}>
                    {isPending ? "Saving..." : submitLabel}
                </Button>
            </DialogFooter>
        </>
    );
}
