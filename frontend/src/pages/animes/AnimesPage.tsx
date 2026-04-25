import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Check, X as XIcon, Search, ChevronLeft, ChevronRight, Database, HardDrive } from "lucide-react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export default function AnimesPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [animeToDelete, setAnimeToDelete] = useState<number | null>(null);

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

    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [previews, setPreviews] = useState<Record<string, string>>({});

    const [editingAnime, setEditingAnime] = useState<any>(null);

    // Queries
    const { data: animesData, isLoading: isLoadingAnimes } = useQuery({
        queryKey: ["animes", "all_admin_anime", page, limit, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                type: "all_admin_anime",
                page: page.toString(),
                limit: limit.toString(),
                paginate: "true"
            });
            if (debouncedSearch) {
                params.append("search", debouncedSearch);
            }
            return (await api.get(`/animes?${params.toString()}`)).data;
        },
        placeholderData: keepPreviousData,
    });

    const animes = animesData?.data || [];
    const totalPages = animesData?.last_page || 1;

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
            payload.seasons = parseInt(payload.seasons as any) || 1;
            payload.rating = parseFloat(payload.rating as any) || 0;
            payload.duration = parseInt(payload.duration as any) || 24;
            payload.season_id = parseInt(payload.season_id as any) || 0;
            payload.studio_id = parseInt(payload.studio_id as any) || 0;
            payload.language_id = parseInt(payload.language_id as any) || 0;

            if (payload.release_date) {
                payload.release_date = new Date(payload.release_date).toISOString();
            } else {
                (payload as any).release_date = undefined;
            }

            return await api.post("/animes", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["animes"] });
            toast.success("Anime created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create anime: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingAnime) throw new Error("No anime selected");
            const payload = { ...formData };
            payload.seasons = parseInt(payload.seasons as any) || 1;
            payload.rating = parseFloat(payload.rating as any) || 0;
            payload.duration = parseInt(payload.duration as any) || 24;
            payload.season_id = parseInt(payload.season_id as any) || 0;
            payload.studio_id = parseInt(payload.studio_id as any) || 0;
            payload.language_id = parseInt(payload.language_id as any) || 0;

            if (payload.release_date) {
                payload.release_date = new Date(payload.release_date).toISOString();
            } else {
                (payload as any).release_date = undefined;
            }

            return await api.put(`/animes/${editingAnime.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["animes"] });
            toast.success("Anime updated successfully");
            setIsEditModalOpen(false);
            setEditingAnime(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update anime: " + (err.response?.data?.error || err.message));
        },
    });

    const togglePublishedMutation = useMutation({
        mutationFn: async (anime: any) => {
            const payload = { ...anime };
            
            // Clean up relationships before sending to API
            delete payload.categories;
            delete payload.season;
            delete payload.studio;
            delete payload.language_rel;
            
            payload.is_published = !anime.is_published;
            
            // Ensure proper types
            payload.seasons = parseInt(payload.seasons as any) || 1;
            payload.rating = parseFloat(payload.rating as any) || 0;
            payload.duration = parseInt(payload.duration as any) || 24;
            payload.season_id = parseInt(payload.season_id as any) || 0;
            payload.studio_id = parseInt(payload.studio_id as any) || 0;
            payload.language_id = parseInt(payload.language_id as any) || 0;
            payload.category_ids = anime.categories ? anime.categories.map((c: any) => c.id) : [];

            return await api.put(`/animes/${anime.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["animes"] });
            toast.success("Publication status updated");
        },
        onError: (err: any) => {
            toast.error("Failed to update status: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/animes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["animes"] });
            toast.success("Anime deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete anime: " + (err.response?.data?.error || err.message));
        }
    });

    const uploadFile = async (file: File, folder?: string, filename?: string) => {
        const formData = new FormData();
        formData.append("file", file);
        
        let url = "/upload";
        const params = new URLSearchParams();
        if (folder) params.append("folder", folder);
        if (filename) params.append("filename", filename);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const res = await api.post(url, formData);
        return res.data.url;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'cover' | 'icon_image') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, [field]: objectUrl }));

        setUploading(prev => ({ ...prev, [field]: true }));

        try {
            // Generate a clean filename based on title or slug
            let baseName = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            if (!baseName) baseName = `anime-${Date.now()}`; // Fallback if title is empty or Arabic only

            const targetFilename = field === 'image' ? `${baseName}-poster` : 
                                 field === 'cover' ? `${baseName}-banner` : 
                                 `${baseName}-icon`;

            const url = await uploadFile(file, 'animes', targetFilename);
            // Add a timestamp to bypass browser cache since we are now using fixed filenames
            const cacheBustedUrl = `${url}?t=${Date.now()}`;
            handleChange(field, cacheBustedUrl);
            toast.success("Image uploaded successfully");
        } catch (err) {
            console.error("Upload error:", err);
            toast.error("Upload failed");
            // Clear preview on failure so user knows it didn't work
            setPreviews(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const resetForm = () => {
        setFormData({
            title: "", title_en: "", slug: "", slug_en: "", description: "", description_en: "",
            category_ids: [], seasons: 1, status: "Ongoing", release_date: "", rating: 0,
            image: "", icon_image: "", cover: "", duration: 24, trailer: "", type: "TV", is_published: true,
            season_id: 0, studio_id: 0, language_id: 0
        });
        setPreviews({});
    };

    const handleEditClick = (anime: any) => {
        // Extract relation IDs
        const catIds = anime.categories ? anime.categories.map((c: any) => c.id) : [];
        const seasonId = anime.season?.id || anime.season_id || 0;
        const studioId = anime.studio?.id || anime.studio_id || 0;
        const languageId = anime.language_rel?.id || anime.language_id || 0; // Notice language_rel from backend preload

        setEditingAnime(anime);
        setFormData({
            title: anime.title || "",
            title_en: anime.title_en || "",
            slug: anime.slug || "",
            slug_en: anime.slug_en || "",
            description: anime.description || "",
            description_en: anime.description_en || "",
            category_ids: catIds,
            seasons: anime.seasons || 1,
            status: anime.status || "Ongoing",
            release_date: anime.release_date ? anime.release_date.split('T')[0] : "",
            rating: anime.rating || 0,
            image: anime.image || "",
            icon_image: anime.icon_image || "",
            cover: anime.cover || "",
            duration: anime.duration || 24,
            trailer: anime.trailer || "",
            type: anime.type || "TV",
            is_published: anime.is_published !== undefined ? anime.is_published : true,
            season_id: seasonId,
            studio_id: studioId,
            language_id: languageId
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        console.log('handleDeleteClick triggered for anime ID:', id);
        setAnimeToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (animeToDelete) {
            deleteMutation.mutate(animeToDelete);
            setIsDeleteDialogOpen(false);
            setAnimeToDelete(null);
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
                    <h2 className="text-3xl font-bold tracking-tight">Animes</h2>
                    <p className="text-muted-foreground">Manage anime library.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search animes..."
                            className="pl-8 w-[250px]"
                            value={searchQuery}
                            onChange={onSearchChange}
                        />
                    </div>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Anime
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Add Anime</DialogTitle>
                                <DialogDescription>
                                    Add a new anime to the database.
                                </DialogDescription>
                            </DialogHeader>
                            <AnimeFormContent
                                formData={formData}
                                handleChange={handleChange}
                                categoryOptions={categoryOptions}
                                typeOptions={typeOptions}
                                studioOptions={studioOptions}
                                languageOptions={languageOptions}
                                seasonOptions={seasonOptions}
                                handleImageUpload={handleImageUpload}
                                uploading={uploading}
                                previews={previews}
                                onSubmit={handleCreate}
                                isPending={createMutation.isPending}
                                onCancel={() => setIsAddModalOpen(false)}
                                submitLabel="Create Anime"
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Anime</DialogTitle>
                    </DialogHeader>
                    <AnimeFormContent
                        formData={formData}
                        handleChange={handleChange}
                        categoryOptions={categoryOptions}
                        typeOptions={typeOptions}
                        studioOptions={studioOptions}
                        languageOptions={languageOptions}
                        seasonOptions={seasonOptions}
                        handleImageUpload={handleImageUpload}
                        uploading={uploading}
                        previews={previews}
                        onSubmit={() => updateMutation.mutate()}
                        isPending={updateMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                        submitLabel="Save Changes"
                    />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Animes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        {isLoadingAnimes && animes.length === 0 && (
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
                                {animes?.map((anime: any) => (
                                    <TableRow key={anime.id}>
                                        <TableCell className="font-medium">{anime.id}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {anime.icon_image && (
                                                        <img
                                                            src={anime.icon_image}
                                                            alt="Icon"
                                                            className="w-8 h-8 rounded-full border-2 border-background object-cover z-10"
                                                        />
                                                    )}
                                                    {anime.image && (
                                                        <img
                                                            src={anime.image}
                                                            alt={anime.title}
                                                            className="w-8 h-12 rounded object-cover shadow-sm"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{anime.title}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{anime.type} • {anime.status}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{anime.status}</TableCell>
                                        <TableCell>{anime.rating}</TableCell>
                                        <TableCell>
                                            {anime.is_published ? <Check className="text-green-500 h-4 w-4" /> : <XIcon className="text-red-500 h-4 w-4" />}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">                                                 <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className={anime.is_published ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        togglePublishedMutation.mutate(anime);
                                                    }}
                                                    disabled={togglePublishedMutation.isPending}
                                                >
                                                    {anime.is_published ? "Draft" : "Publish"}
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleEditClick(anime);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-destructive hover:text-destructive" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleDeleteClick(anime.id);
                                                    }}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>

                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {animes?.length === 0 && !isLoadingAnimes && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No animes found.
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the anime,
                            all its episodes, chapters, and associated data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAnimeToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Anime
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Subcomponent for reuse

export function AnimeFormContent({
    formData, handleChange,
    categoryOptions, typeOptions, studioOptions, languageOptions, seasonOptions,
    handleImageUpload, uploading, previews,
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
                     <TabsContent value="media" className="space-y-6 py-4">
                        <div className="grid gap-2">
                            <Label className="flex justify-between items-center">
                                Icon Image
                                {formData.icon_image && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => handleChange('icon_image', '')}>Clear</Button>}
                            </Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'icon_image')} disabled={uploading['icon_image']} />
                                    {uploading['icon_image'] && <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Uploading...</p>}
                                </div>
                                <div className="h-12 w-12 rounded-full border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {(previews['icon_image'] || formData.icon_image) ? (
                                        <img src={previews['icon_image'] || formData.icon_image} alt="Icon" className="h-full w-full object-cover" />
                                    ) : (
                                        <Database className="h-5 w-5 text-muted-foreground/50" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="flex justify-between items-center">
                                Poster Image
                                {formData.image && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => handleChange('image', '')}>Clear</Button>}
                            </Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} disabled={uploading['image']} />
                                    {uploading['image'] && <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Uploading...</p>}
                                </div>
                                <div className="h-24 w-16 rounded border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {(previews['image'] || formData.image) ? (
                                        <img src={previews['image'] || formData.image} alt="Poster" className="h-full w-full object-cover" />
                                    ) : (
                                        <Plus className="h-5 w-5 text-muted-foreground/50" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="flex justify-between items-center">
                                Banner Image (Cover)
                                {formData.cover && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => handleChange('cover', '')}>Clear</Button>}
                            </Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} disabled={uploading['cover']} />
                                    {uploading['cover'] && <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Uploading...</p>}
                                </div>
                                <div className="h-24 w-40 rounded border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {(previews['cover'] || formData.cover) ? (
                                        <img src={previews['cover'] || formData.cover} alt="Banner" className="h-full w-full object-cover" />
                                    ) : (
                                        <HardDrive className="h-8 w-8 text-muted-foreground/50" />
                                    )}
                                </div>
                            </div>
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
