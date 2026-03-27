import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/utils/image-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server } from "lucide-react";

export default function EpisodesPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const limit = 20;

    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to first page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Initial Form State
    const initialFormState = {
        anime_id: 0,
        title: "",
        title_en: "",
        slug: "",
        slug_en: "",
        episode_number: 1,
        description: "",
        description_en: "",
        thumbnail: "",
        banner: "",
        video_urls: [] as { url: string; type: string; name: string }[],
        duration: 0,
        quality: "",
        video_format: "",
        release_date: new Date().toISOString().split('T')[0],
        is_published: false,
        language: "ar",
        rating: 0
    };

    const [formData, setFormData] = useState(initialFormState);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [editingEpisode, setEditingEpisode] = useState<any>(null);

    // Data Queries
    const { data: episodeResponse, isLoading: isLoadingEpisodes } = useQuery({
        queryKey: ["episodes", page, debouncedSearch],
        queryFn: async () => (await api.get(`/episodes?type=all_admin&limit=${limit}&page=${page}&search=${debouncedSearch}&paginate=true`)).data,
        placeholderData: keepPreviousData,
    });

    const episodes = episodeResponse?.data || [];
    const totalCount = episodeResponse?.total || 0;
    const lastPage = episodeResponse?.last_page || 1;

    const { data: animes } = useQuery({
        queryKey: ["animes"],
        queryFn: async () => (await api.get("/animes?type=all_admin&limit=0")).data,
    });

    const { data: servers } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => (await api.get("/servers")).data,
    });

    // Auto-fill logic when anime_id changes
    useEffect(() => {
        const animesList = Array.isArray(animes) ? animes : (animes?.data || []);
        if (formData.anime_id && animesList.length > 0) {
            const selectedAnime = animesList.find((a: any) => a.id == formData.anime_id);
            if (selectedAnime) {
                // Only auto-fill if we are NOT editing an existing episode (or maybe we should? The user said "fills automatically")
                // The Vue implementation does auto-fill on change.
                // But wait, if we are editing, we don't want to overwrite if the user changed the anime ID?
                // Usually in Edit mode, we load existing data. If user changes Anime ID in Edit mode, then yes, auto-fill.
                // In Add mode, yes auto-fill.
                // We need to distinguish between "Initial Load of Edit Form" vs "User Changing Anime ID".
                // For now, let's just auto-fill empty fields or always fill descriptive fields as per Vue logic.

                // Vue logic:
                // form.title = selected.title || ''; ...
                // It overwrites EVERYTHING.

                // If we are just starting to edit (useEffect/mount), we shouldn't overwrite.
                // But this useEffect runs whenever formData.anime_id changes.
                // When opening Edit modal, we set formData.anime_id. This triggers effect.
                // We must prevent overwrite if it's the "initial set" of edit.
                // But we can't easily distinguish here.
                // BETTER APPROACH: Handle auto-fill in the `handleChange` of anime_id select box.
            }
        }
    }, [formData.anime_id, animes]);


    const handleAnimeChange = (animeId: number) => {
        // animes might be { data: [] } if limit > 0, or [] if limit = 0 depending on the API changes in handler.
        // With limit=0, AnimeHandler currently returns a flat array because limit is NOT > 0.
        const animesList = Array.isArray(animes) ? animes : (animes?.data || []);
        const selectedAnime = animesList.find((a: any) => a.id == animeId);
        if (selectedAnime) {
            setFormData(prev => ({
                ...prev,
                anime_id: animeId,
                title: selectedAnime.title || "",
                title_en: selectedAnime.title_en || "",
                description: selectedAnime.description || "",
                description_en: selectedAnime.description_en || "",
                duration: selectedAnime.duration || 0,
                language: selectedAnime.language || "ar",
                rating: selectedAnime.rating || 0,
                slug: selectedAnime.slug || "",
                slug_en: selectedAnime.slug_en || "",
                // Prefill images if not set? The Vue Code sets previews but doesn't commit to form if form is empty.
                // Here fields are strings (URLs). Maybe we can prefill them?
                // Vue: if (!form.banner && selected.cover) bannerPreview = ...
                // Let's prefill if empty.
                thumbnail: prev.thumbnail || selectedAnime.image || "",
                banner: prev.banner || selectedAnime.cover || ""
            }));
        } else {
            setFormData(prev => ({ ...prev, anime_id: animeId }));
        }
    };


    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data };
            payload.episode_number = parseInt(payload.episode_number);
            payload.duration = parseInt(payload.duration);
            payload.rating = parseFloat(payload.rating);
            payload.anime_id = parseInt(payload.anime_id);
            if (payload.release_date) payload.release_date = new Date(payload.release_date).toISOString();

            // Legacy field (keep for now if needed, or send empty)
            payload.video_urls = JSON.stringify(payload.video_urls);

            // New Servers Relationship
            payload.servers = data.video_urls.map((v: any) => ({
                language: v.type, // form 'type' is actually language
                name: v.name || (v.type === 'ar' ? 'Main Server' : 'Server'),
                url: v.url,
                type: "embed" // Default type
            }));

            return await api.post("/episodes", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes"] });
            toast.success("Episode created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create episode: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingEpisode) throw new Error("No episode selected");
            const payload = { ...formData, created_at: editingEpisode.created_at };
            payload.episode_number = parseInt(payload.episode_number as any);
            payload.duration = parseInt(payload.duration as any);
            payload.rating = parseFloat(payload.rating as any);
            payload.anime_id = parseInt(payload.anime_id as any);
            if (payload.release_date) payload.release_date = new Date(payload.release_date).toISOString();

            // Legacy field
            (payload as any).video_urls = JSON.stringify(payload.video_urls);

            // New Servers Relationship
            (payload as any).servers = formData.video_urls.map((v: any) => ({
                language: v.type,
                name: v.name || (v.type === 'ar' ? 'Main Server' : 'Server'),
                url: v.url,
                type: "embed"
            }));

            return await api.put(`/episodes/${editingEpisode.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes"] });
            toast.success("Episode updated successfully");
            setIsEditModalOpen(false);
            setEditingEpisode(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update episode: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/episodes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes"] });
            toast.success("Episode deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete episode: " + (err.response?.data?.error || err.message));
        }
    });

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/upload", formData);
        return res.data.url;
    };

    const handleImageUpload = async (e: any, field: 'thumbnail' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (field === 'thumbnail') setUploadingThumbnail(true);
        else setUploadingBanner(true);

        try {
            const url = await uploadFile(file);
            handleChange(field, url);
            toast.success("Image uploaded");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            if (field === 'thumbnail') setUploadingThumbnail(false);
            else setUploadingBanner(false);
        }
    };

    const resetForm = () => {
        setFormData(initialFormState);
    };

    const handleEditClick = (episode: any) => {
        let vUrls = [];

        // Priority: Load from new servers relationship
        if (episode.servers && episode.servers.length > 0) {
            vUrls = episode.servers.map((s: any) => ({
                url: s.url,
                type: s.language, // Map backend 'language' to frontend 'type'
                name: s.name
            }));
        } else {
            // Fallback to legacy JSON
            try {
                vUrls = JSON.parse(episode.video_urls);
            } catch {
                vUrls = [];
            }
        }

        setEditingEpisode(episode);
        setFormData({
            anime_id: episode.anime_id,
            title: episode.title || "",
            title_en: episode.title_en || "",
            slug: episode.slug || "",
            slug_en: episode.slug_en || "",
            episode_number: episode.episode_number || 1,
            description: episode.description || "",
            description_en: episode.description_en || "",
            thumbnail: episode.thumbnail || "",
            banner: episode.banner || "",
            video_urls: vUrls,
            duration: episode.duration || 0,
            quality: episode.quality || "",
            video_format: episode.video_format || "",
            release_date: episode.release_date ? episode.release_date.split('T')[0] : "",
            is_published: episode.is_published,
            language: episode.language || "ar",
            rating: episode.rating || 0
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this episode?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        createMutation.mutate(formData);
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Video URLs handlers
    const addVideoUrl = () => {
        setFormData(prev => ({
            ...prev,
            video_urls: [...prev.video_urls, { url: '', type: 'ar', name: '' }]
        }));
    };

    const removeVideoUrl = (index: number) => {
        setFormData(prev => ({
            ...prev,
            video_urls: prev.video_urls.filter((_, i) => i !== index)
        }));
    };

    const updateVideoUrl = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newUrls = [...prev.video_urls];
            newUrls[index] = { ...newUrls[index], [field]: value };
            return { ...prev, video_urls: newUrls };
        });
    };


    if (isLoadingEpisodes) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Episodes</h2>
                    <p className="text-muted-foreground">Manage anime episodes.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search episodes (name or number)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Episode
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                            <EpisodeFormContent
                                formData={formData}
                                handleChange={handleChange}
                                handleAnimeChange={handleAnimeChange}
                                animes={Array.isArray(animes) ? animes : (animes?.data || [])}
                                serversList={servers || []}
                                isUploading={{ thumbnail: uploadingThumbnail, banner: uploadingBanner }}
                                handleImageUpload={handleImageUpload}
                                addVideoUrl={addVideoUrl}
                                removeVideoUrl={removeVideoUrl}
                                updateVideoUrl={updateVideoUrl}
                                onSubmit={handleCreate}
                                isPending={createMutation.isPending}
                                onCancel={() => setIsAddModalOpen(false)}
                                title="Add Episode"
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                    <EpisodeFormContent
                        formData={formData}
                        handleChange={handleChange}
                        handleAnimeChange={handleAnimeChange}
                        animes={Array.isArray(animes) ? animes : (animes?.data || [])}
                        serversList={servers || []}
                        isUploading={{ thumbnail: uploadingThumbnail, banner: uploadingBanner }}
                        handleImageUpload={handleImageUpload}
                        addVideoUrl={addVideoUrl}
                        removeVideoUrl={removeVideoUrl}
                        updateVideoUrl={updateVideoUrl}
                        onSubmit={updateMutation.mutate}
                        isPending={updateMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                        title="Edit Episode"
                    />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Episodes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Episode</TableHead>
                                <TableHead>Anime</TableHead>
                                <TableHead>Format</TableHead>
                                <TableHead>Quality</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {episodes?.map((ep: any) => (
                                <TableRow key={ep.id}>
                                    <TableCell className="font-medium">{ep.id}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {ep.thumbnail && <img src={ep.thumbnail} alt={ep.title} className="w-8 h-8 rounded object-cover" />}
                                            <div className="flex flex-col">
                                                <span>{ep.episode_number} - {ep.title}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{ep.anime?.title}</TableCell>
                                    <TableCell>{ep.video_format}</TableCell>
                                    <TableCell>{ep.quality}</TableCell>
                                    <TableCell>
                                        {ep.is_published ? <Badge className="bg-green-500">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(ep)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(ep.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {episodes?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        No episodes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination UI */}
                    {totalCount > 0 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                            <div className="text-sm text-muted-foreground">
                                Total: {totalCount} episodes
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm font-medium">
                                    Page {page} of {lastPage}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                    disabled={page === lastPage}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Subcomponent for Form Content to reuse
export function EpisodeFormContent({
    formData, handleChange, handleAnimeChange, animes, serversList,
    isUploading, handleImageUpload, addVideoUrl, removeVideoUrl, updateVideoUrl,
    onSubmit, isPending, onCancel, title
}: any) {
    return (
        <>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                    Fill in the episode details.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="video">Video</TabsTrigger>
                        <TabsTrigger value="media">Media</TabsTrigger>
                        <TabsTrigger value="meta">Meta</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Anime Series *</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.anime_id}
                                onChange={(e) => handleAnimeChange(e.target.value)}
                            >
                                <option value={0}>Select Anime</option>
                                {animes.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Title (Arabic) *</Label>
                                <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Title (English)</Label>
                                <Input value={formData.title_en} onChange={(e) => handleChange('title_en', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Episode Number *</Label>
                                <Input type="number" value={formData.episode_number} onChange={(e) => handleChange('episode_number', e.target.value)} />
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

                    <TabsContent value="video" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {formData.video_urls.map((video: any, index: number) => (
                                <div key={index} className="flex gap-2 items-start border p-2 rounded">
                                    <div className="grid gap-2 flex-1">
                                        <div className="flex gap-2">
                                            <select
                                                className="h-10 border rounded px-2 w-24 bg-background text-foreground"
                                                value={video.type}
                                                onChange={(e) => updateVideoUrl(index, 'type', e.target.value)}
                                            >
                                                <option value="ar">عربي</option>
                                                <option value="en">English</option>
                                            </select>
                                            <Select
                                                value={video.name}
                                                onValueChange={(val) => updateVideoUrl(index, 'name', val)}
                                            >
                                                <SelectTrigger className="w-[180px] h-10">
                                                    <SelectValue placeholder="اختر سيرفر (اختياري)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {serversList.map((srv: any) => (
                                                        <SelectItem key={srv.id} value={srv.name_en || srv.name_ar}>
                                                            <div className="flex items-center gap-2">
                                                                {srv.image ? (
                                                                    <img src={getImageUrl(srv.image)} alt={srv.name_en} className="w-5 h-5 object-cover rounded" />
                                                                ) : (
                                                                    <Server className="w-4 h-4 text-muted-foreground" />
                                                                )}
                                                                <span>{srv.name_en || srv.name_ar}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input
                                            placeholder="https://..."
                                            value={video.url}
                                            onChange={(e) => updateVideoUrl(index, 'url', e.target.value)}
                                        />
                                    </div>
                                    <Button variant="destructive" size="icon" onClick={() => removeVideoUrl(index)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" onClick={addVideoUrl} className="w-full">
                                + Add Video URL
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="grid gap-2">
                                <Label>Duration (min)</Label>
                                <Input type="number" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Quality</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                                    value={formData.quality}
                                    onChange={(e) => handleChange('quality', e.target.value)}
                                >
                                    <option value="">Select Quality</option>
                                    <option value="4K">4K</option>
                                    <option value="1080p">1080p</option>
                                    <option value="720p">720p</option>
                                    <option value="480p">480p</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Video Format</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                                    value={formData.video_format}
                                    onChange={(e) => handleChange('video_format', e.target.value)}
                                >
                                    <option value="">Select Format</option>
                                    <option value="mp4">MP4</option>
                                    <option value="mkv">MKV</option>
                                    <option value="webm">WEBM</option>
                                    <option value="avi">AVI</option>
                                </select>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="media" className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Thumbnail</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'thumbnail')} disabled={isUploading.thumbnail} />
                                {isUploading.thumbnail && <span className="text-xs text-muted-foreground">Uploading...</span>}
                            </div>
                            {formData.thumbnail && <img src={formData.thumbnail} alt="Thumbnail" className="h-20 w-auto object-cover rounded mt-2 border" />}
                        </div>
                        <div className="grid gap-2">
                            <Label>Banner</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} disabled={isUploading.banner} />
                                {isUploading.banner && <span className="text-xs text-muted-foreground">Uploading...</span>}
                            </div>
                            {formData.banner && <img src={formData.banner} alt="Banner" className="h-20 w-auto object-cover rounded mt-2 border" />}
                        </div>
                    </TabsContent>

                    <TabsContent value="meta" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Release Date</Label>
                                <Input type="date" value={formData.release_date} onChange={(e) => handleChange('release_date', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Language</Label>
                                <Input value={formData.language} onChange={(e) => handleChange('language', e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Rating</Label>
                                <Input type="number" step="0.1" value={formData.rating} onChange={(e) => handleChange('rating', e.target.value)} />
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
                    {isPending ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </>
    );
}
