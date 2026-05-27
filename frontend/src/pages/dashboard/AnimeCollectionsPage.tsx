import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Library, Search } from "lucide-react";
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
import { useTranslation } from "react-i18next";
import { AnimeGridSelection } from "@/components/dashboard/AnimeGridSelection";

export default function AnimeCollectionsPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form State
    const [titleAr, setTitleAr] = useState("");
    const [titleEn, setTitleEn] = useState("");
    const [selectedAnimeIds, setSelectedAnimeIds] = useState<string[]>([]);
    const [editingCollection, setEditingCollection] = useState<any>(null);

    const { data: collections, isLoading } = useQuery({
        queryKey: ["anime-collections", searchTerm],
        queryFn: async () => (await api.get("/anime-collections", { params: { search: searchTerm } })).data,
    });


    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post("/anime-collections", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["anime-collections"] });
            toast.success(t('common.success_create', 'Collection created successfully'));
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create collection: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const id = editingCollection?.id || editingCollection?.ID;
            return await api.put(`/anime-collections/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["anime-collections"] });
            toast.success(t('common.success_update', 'Collection updated successfully'));
            setIsEditModalOpen(false);
            setEditingCollection(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update collection: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/anime-collections/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["anime-collections"] });
            toast.success(t('common.success_delete', 'Collection deleted'));
        },
        onError: (err: any) => {
            toast.error("Failed to delete collection: " + (err.response?.data?.error || err.message));
        }
    });

    const resetForm = () => {
        setTitleAr("");
        setTitleEn("");
        setSelectedAnimeIds([]);
    };

    const handleEditClick = (collection: any) => {
        setEditingCollection(collection);
        setTitleAr(collection.title_ar || "");
        setTitleEn(collection.title_en || "");
        setSelectedAnimeIds(collection.animes?.map((a: any) => a.id.toString()) || []);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm(t('common.confirm_delete', 'Are you sure?'))) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        const payload = {
            title_ar: titleAr,
            title_en: titleEn,
            animes: selectedAnimeIds.map(id => ({ id: parseInt(id) }))
        };
        createMutation.mutate(payload);
    };

    const handleUpdate = () => {
        const payload = {
            title_ar: titleAr,
            title_en: titleEn,
            animes: selectedAnimeIds.map(id => ({ id: parseInt(id) }))
        };
        updateMutation.mutate(payload);
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Library className="h-8 w-8 text-primary" />
                        {i18n.language === 'ar' ? 'انمي المواسم' : 'Anime Seasons'}
                    </h2>
                    <p className="text-muted-foreground">Group related anime series and seasons together.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('common.add')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px]">
                        <DialogHeader>
                            <DialogTitle>{t('common.add')} {i18n.language === 'ar' ? 'انمي المواسم' : 'Anime Collection'}</DialogTitle>
                            <DialogDescription>
                                Create a group for related anime series.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="titleAr" className="rtl:text-right">العنوان (بالعربي)</Label>
                                <Input id="titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="مثال: ناروتو" className="text-right" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="titleEn">Title (English)</Label>
                                <Input id="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. Naruto" />
                            </div>
                            <div className="grid gap-2">
                                <Label>{i18n.language === 'ar' ? 'اختر الأنميات' : 'Select Animes'}</Label>
                                <AnimeGridSelection
                                    selectedIds={selectedAnimeIds}
                                    onChange={setSelectedAnimeIds}
                                    language={i18n.language}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex-row-reverse gap-2">
                            <Button onClick={handleCreate} disabled={createMutation.isPending || !titleAr.trim() || !titleEn.trim()}>
                                {createMutation.isPending ? t('common.saving', "Saving...") : t('common.add', "Add")}
                            </Button>
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>{t('common.cancel', "Cancel")}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <div className="relative w-full">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common.search', 'Search...')}
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>{t('common.edit')} {i18n.language === 'ar' ? 'انمي المواسم' : 'Anime Collection'}</DialogTitle>
                        <DialogDescription>Update collection details and grouped animes.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-titleAr" className="text-right">العنوان (بالعربي)</Label>
                            <Input id="edit-titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="text-right" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-titleEn">Title (English)</Label>
                            <Input id="edit-titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{i18n.language === 'ar' ? 'اختر الأنميات' : 'Select Animes'}</Label>
                            <AnimeGridSelection
                                selectedIds={selectedAnimeIds}
                                onChange={setSelectedAnimeIds}
                                language={i18n.language}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row-reverse gap-2">
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending || !titleAr.trim()}>
                            {updateMutation.isPending ? t('common.saving', "Saving...") : t('common.save', "Save Changes")}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>{t('common.cancel', "Cancel")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>{i18n.language === 'ar' ? 'جميع المجموعات' : 'All Collections'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{i18n.language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                                <TableHead>{i18n.language === 'ar' ? 'عدد الأنميات' : 'Animes Count'}</TableHead>
                                <TableHead>{i18n.language === 'ar' ? 'قائمة الأنميات' : 'Anime List'}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {collections?.map((col: any) => (
                                <TableRow key={col.id || col.ID}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{col.title_ar}</span>
                                            <span className="text-xs text-muted-foreground">{col.title_en}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{col.animes?.length || 0}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {col.animes?.map((a: any) => i18n.language === 'ar' ? a.title : (a.title_en || a.title)).join(', ')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(col)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(col.id || col.ID)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {collections?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        {t('common.no_results', 'No results found.')}
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
