import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EpisodeFormContent } from "./EpisodesPage";

export default function ForeignEpisodesPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    const { data: episodes, isLoading: isLoadingEpisodes } = useQuery({
        queryKey: ["foreign-episodes"],
        queryFn: async () => (await api.get("/episodes?type=foreign")).data,
    });

    const { data: animes } = useQuery({
        queryKey: ["foreign-animes-list"], // Separate query to avoid conflicts
        queryFn: async () => (await api.get("/animes?type=foreign")).data,
    });

    const handleAnimeChange = (animeId: number) => {
        const selectedAnime = animes?.find((a: any) => a.id == animeId);
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

            payload.video_urls = JSON.stringify(payload.video_urls);
            payload.servers = data.video_urls.map((v: any) => ({
                language: v.type,
                name: v.name || (v.type === 'ar' ? 'Main Server' : 'Server'),
                url: v.url,
                type: "embed"
            }));

            return await api.post("/episodes", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["foreign-episodes"] });
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

            (payload as any).video_urls = JSON.stringify(payload.video_urls);
            (payload as any).servers = formData.video_urls.map((v: any) => ({
                language: v.type,
                name: v.name || (v.type === 'ar' ? 'Main Server' : 'Server'),
                url: v.url,
                type: "embed"
            }));

            return await api.put(`/episodes/${editingEpisode.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["foreign-episodes"] });
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
            queryClient.invalidateQueries({ queryKey: ["foreign-episodes"] });
            toast.success("Episode deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete episode: " + (err.response?.data?.error || err.message));
        }
    });

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
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
        if (episode.servers && episode.servers.length > 0) {
            vUrls = episode.servers.map((s: any) => ({
                url: s.url,
                type: s.language,
                name: s.name
            }));
        } else {
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
        if (confirm("Are you sure?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

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
                    <h2 className="text-3xl font-bold tracking-tight">Foreign Episodes</h2>
                    <p className="text-muted-foreground">Manage episodes for foreign media.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Foreign Episode
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                        <EpisodeFormContent
                            formData={formData}
                            handleChange={handleChange}
                            handleAnimeChange={handleAnimeChange}
                            animes={animes || []}
                            isUploading={{ thumbnail: uploadingThumbnail, banner: uploadingBanner }}
                            handleImageUpload={handleImageUpload}
                            addVideoUrl={addVideoUrl}
                            removeVideoUrl={removeVideoUrl}
                            updateVideoUrl={updateVideoUrl}
                            onSubmit={() => createMutation.mutate(formData)}
                            isPending={createMutation.isPending}
                            onCancel={() => setIsAddModalOpen(false)}
                            title="Add Foreign Episode"
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                    <EpisodeFormContent
                        formData={formData}
                        handleChange={handleChange}
                        handleAnimeChange={handleAnimeChange}
                        animes={animes || []}
                        isUploading={{ thumbnail: uploadingThumbnail, banner: uploadingBanner }}
                        handleImageUpload={handleImageUpload}
                        addVideoUrl={addVideoUrl}
                        removeVideoUrl={removeVideoUrl}
                        updateVideoUrl={updateVideoUrl}
                        onSubmit={() => updateMutation.mutate()}
                        isPending={updateMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                        title="Edit Foreign Episode"
                    />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Foreign Episodes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Episode</TableHead>
                                <TableHead>Anime</TableHead>
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
                                                <span className="text-sm font-bold">{ep.episode_number} - {ep.title}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{ep.anime?.title}</TableCell>
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
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No episodes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
