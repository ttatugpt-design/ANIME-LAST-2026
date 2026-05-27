import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Smile, Sparkles, Newspaper, UploadCloud, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { renderEmojiContent } from "@/utils/render-content";
import { getImageUrl } from "@/utils/image-utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { RichTextInput } from '@/components/comments/RichTextInput';
import { CustomEmojiPicker } from '@/components/comments/CustomEmojiPicker';
import { useTranslation } from "react-i18next";

interface QuickNews {
    id: number;
    description: string;
    description_en: string;
    image?: string;
    url?: string;
    url_en?: string;
    created_at: string;
}

export default function QuickNewsPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState<QuickNews | null>(null);

    const [formData, setFormData] = useState({
        description: "",
        description_en: "",
        url: "",
        url_en: "",
        image: null as File | null,
        imagePreview: ""
    });

    // Emoji Picker States
    const [showEmojiPickerAR, setShowEmojiPickerAR] = useState(false);
    const [showCustomEmojiPickerAR, setShowCustomEmojiPickerAR] = useState(false);
    const [showEmojiPickerEN, setShowEmojiPickerEN] = useState(false);
    const [showCustomEmojiPickerEN, setShowCustomEmojiPickerEN] = useState(false);

    const inputRefAR = useRef<any>(null);
    const inputRefEN = useRef<any>(null);
    const emojiRefAR = useRef<HTMLDivElement>(null);
    const customEmojiRefAR = useRef<HTMLDivElement>(null);
    const emojiRefEN = useRef<HTMLDivElement>(null);
    const customEmojiRefEN = useRef<HTMLDivElement>(null);

    // Queries
    const { data: newsItems, isLoading } = useQuery<QuickNews[]>({
        queryKey: ["quick-news"],
        queryFn: async () => (await api.get("/quick-news")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const fd = new FormData();
            fd.append("description", data.description);
            fd.append("description_en", data.description_en);
            if (data.url) fd.append("url", data.url);
            if (data.url_en) fd.append("url_en", data.url_en);
            if (data.image) fd.append("image", data.image);
            return await api.post("/quick-news", fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-news"] });
            toast.success("News added successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => toast.error("Failed to add news: " + (err.response?.data?.error || err.message))
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const fd = new FormData();
            fd.append("description", data.description);
            fd.append("description_en", data.description_en);
            if (data.url) fd.append("url", data.url);
            if (data.url_en) fd.append("url_en", data.url_en);
            if (data.image) fd.append("image", data.image);
            return await api.put(`/quick-news/${editingNews?.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-news"] });
            toast.success("News updated successfully");
            setIsEditModalOpen(false);
            setEditingNews(null);
            resetForm();
        },
        onError: (err: any) => toast.error("Failed to update news: " + (err.response?.data?.error || err.message))
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/quick-news/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-news"] });
            toast.success("News deleted");
        },
        onError: (err: any) => toast.error("Failed to delete news")
    });

    const resetForm = () => {
        setFormData({ description: "", description_en: "", url: "", url_en: "", image: null, imagePreview: "" });
        setShowEmojiPickerAR(false);
        setShowCustomEmojiPickerAR(false);
        setShowEmojiPickerEN(false);
        setShowCustomEmojiPickerEN(false);
    };

    const handleEditClick = (news: QuickNews) => {
        setEditingNews(news);
        setFormData({
            description: news.description,
            description_en: news.description_en,
            url: news.url || "",
            url_en: news.url_en || "",
            image: null,
            imagePreview: news.image ? getImageUrl(news.image) : ""
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure?")) {
            deleteMutation.mutate(id);
        }
    };

    const onEmojiClickAR = (emojiData: EmojiClickData) => {
        if (inputRefAR.current) inputRefAR.current.insertText(emojiData.emoji);
        setShowEmojiPickerAR(false);
    };

    const onCustomEmojiClickAR = (emojiUrl: string) => {
        if (inputRefAR.current) inputRefAR.current.insertEmoji(emojiUrl);
    };

    const onEmojiClickEN = (emojiData: EmojiClickData) => {
        if (inputRefEN.current) inputRefEN.current.insertText(emojiData.emoji);
        setShowEmojiPickerEN(false);
    };

    const onCustomEmojiClickEN = (emojiUrl: string) => {
        if (inputRefEN.current) inputRefEN.current.insertEmoji(emojiUrl);
    };

    // Close emoji pickers on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRefAR.current && !emojiRefAR.current.contains(event.target as Node)) setShowEmojiPickerAR(false);
            if (customEmojiRefAR.current && !customEmojiRefAR.current.contains(event.target as Node)) setShowCustomEmojiPickerAR(false);
            if (emojiRefEN.current && !emojiRefEN.current.contains(event.target as Node)) setShowEmojiPickerEN(false);
            if (customEmojiRefEN.current && !customEmojiRefEN.current.contains(event.target as Node)) setShowCustomEmojiPickerEN(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">أخبار سريعة (Quick News)</h2>
                    <p className="text-muted-foreground">إدارة شريط الأخبار السريعة.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    إضافة خبر جديد
                </Button>
            </div>

            <Card className="border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-primary" />
                        الأخبار الحالية
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>الصورة</TableHead>
                                <TableHead>الوصف بالعربي</TableHead>
                                <TableHead>الوصف بالإنجليزي</TableHead>
                                <TableHead className="text-right">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {newsItems?.map((news) => (
                                <TableRow key={news.id}>
                                    <TableCell className="font-medium text-xs">#{news.id}</TableCell>
                                    <TableCell>
                                        {news.image ? (
                                            <img src={getImageUrl(news.image)} alt="news" className="w-12 h-12 rounded object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                                <ImageIcon className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="text-sm line-clamp-2">{renderEmojiContent(news.description)}</div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="text-sm line-clamp-2">{renderEmojiContent(news.description_en)}</div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(news)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(news.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {newsItems?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        لا توجد أخبار حالياً.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add/Edit Modals */}
            <NewsModal
                isOpen={isAddModalOpen || isEditModalOpen}
                setIsOpen={(open: boolean) => {
                    if (!open) {
                        setIsAddModalOpen(false);
                        setIsEditModalOpen(false);
                        setEditingNews(null);
                    }
                }}
                isEdit={isEditModalOpen}
                formData={formData}
                setFormData={setFormData}
                onSubmit={() => isEditModalOpen ? updateMutation.mutate(formData) : createMutation.mutate(formData)}
                isPending={createMutation.isPending || updateMutation.isPending}
                // Props for Emoji Handling
                inputRefAR={inputRefAR}
                inputRefEN={inputRefEN}
                showEmojiPickerAR={showEmojiPickerAR}
                setShowEmojiPickerAR={setShowEmojiPickerAR}
                showCustomEmojiPickerAR={showCustomEmojiPickerAR}
                setShowCustomEmojiPickerAR={setShowCustomEmojiPickerAR}
                onEmojiClickAR={onEmojiClickAR}
                onCustomEmojiClickAR={onCustomEmojiClickAR}
                emojiRefAR={emojiRefAR}
                customEmojiRefAR={customEmojiRefAR}
                showEmojiPickerEN={showEmojiPickerEN}
                setShowEmojiPickerEN={setShowEmojiPickerEN}
                showCustomEmojiPickerEN={showCustomEmojiPickerEN}
                setShowCustomEmojiPickerEN={setShowCustomEmojiPickerEN}
                onEmojiClickEN={onEmojiClickEN}
                onCustomEmojiClickEN={onCustomEmojiClickEN}
                emojiRefEN={emojiRefEN}
                customEmojiRefEN={customEmojiRefEN}
            />
        </div>
    );
}

function NewsModal({
    isOpen, setIsOpen, isEdit, formData, setFormData, onSubmit, isPending,
    inputRefAR, inputRefEN,
    showEmojiPickerAR, setShowEmojiPickerAR, showCustomEmojiPickerAR, setShowCustomEmojiPickerAR, onEmojiClickAR, onCustomEmojiClickAR, emojiRefAR, customEmojiRefAR,
    showEmojiPickerEN, setShowEmojiPickerEN, showCustomEmojiPickerEN, setShowCustomEmojiPickerEN, onEmojiClickEN, onCustomEmojiClickEN, emojiRefEN, customEmojiRefEN
}: any) {
    const { i18n } = useTranslation();
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'تعديل الخبر' : 'إضافة خبر جديد'}</DialogTitle>
                    <DialogDescription>أدخل وصف الخبر باللغتين العربية والإنجليزية، مع إمكانية رفع صورة.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>صورة الخبر (اختياري)</Label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <label className="flex flex-col items-center justify-center w-full sm:w-2/3 h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:hover:bg-bray-800 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-bold">اضغط للرفع</span></p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            image: file,
                                            imagePreview: URL.createObjectURL(file)
                                        }));
                                    }
                                }} />
                            </label>
                            {formData.imagePreview && (
                                <div className="relative shrink-0 w-32 h-32">
                                    <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg border border-border shadow-sm" />
                                    <button type="button" onClick={() => setFormData((prev: any) => ({ ...prev, image: null, imagePreview: "" }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Arabic Description */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>الوصف (العربية)</Label>
                            <div className="flex gap-2">
                                <div className="relative" ref={emojiRefAR}>
                                    <Button variant="ghost" size="sm" onClick={() => setShowEmojiPickerAR(!showEmojiPickerAR)} className="h-8 w-8 p-0">
                                        <Smile className="h-4 w-4" />
                                    </Button>
                                    {showEmojiPickerAR && (
                                        <div className="absolute bottom-full right-0 mb-2 z-[60]">
                                            <EmojiPicker onEmojiClick={onEmojiClickAR} theme={Theme.AUTO} />
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={customEmojiRefAR}>
                                    <Button variant="ghost" size="sm" onClick={() => setShowCustomEmojiPickerAR(!showCustomEmojiPickerAR)} className="h-8 w-8 p-0">
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                    {showCustomEmojiPickerAR && (
                                        <div className="absolute bottom-full right-0 mb-2 z-[60]">
                                            <CustomEmojiPicker onEmojiClick={onCustomEmojiClickAR} onClose={() => setShowCustomEmojiPickerAR(false)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <RichTextInput
                            ref={inputRefAR}
                            value={formData.description}
                            onChange={(val) => setFormData((prev: any) => ({ ...prev, description: val }))}
                            placeholder="اكتب الخبر بالعربية..."
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm min-h-[100px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>رابط التوجيه (العربية - اختياري)</Label>
                        <input 
                            type="url" 
                            value={formData.url}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, url: e.target.value }))}
                            placeholder="https://example.com"
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                        />
                    </div>

                    {/* English Description */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Description (English)</Label>
                            <div className="flex gap-2">
                                <div className="relative" ref={emojiRefEN}>
                                    <Button variant="ghost" size="sm" onClick={() => setShowEmojiPickerEN(!showEmojiPickerEN)} className="h-8 w-8 p-0">
                                        <Smile className="h-4 w-4" />
                                    </Button>
                                    {showEmojiPickerEN && (
                                        <div className="absolute bottom-full right-0 mb-2 z-[60]">
                                            <EmojiPicker onEmojiClick={onEmojiClickEN} theme={Theme.AUTO} />
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={customEmojiRefEN}>
                                    <Button variant="ghost" size="sm" onClick={() => setShowCustomEmojiPickerEN(!showCustomEmojiPickerEN)} className="h-8 w-8 p-0">
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                    {showCustomEmojiPickerEN && (
                                        <div className="absolute bottom-full right-0 mb-2 z-[60]">
                                            <CustomEmojiPicker onEmojiClick={onCustomEmojiClickEN} onClose={() => setShowCustomEmojiPickerEN(false)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <RichTextInput
                            ref={inputRefEN}
                            value={formData.description_en}
                            onChange={(val) => setFormData((prev: any) => ({ ...prev, description_en: val }))}
                            placeholder="Write news in English..."
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm min-h-[100px]"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Redirect URL (English - Optional)</Label>
                        <input 
                            type="url" 
                            value={formData.url_en}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, url_en: e.target.value }))}
                            placeholder="https://example.com"
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
                    <Button onClick={onSubmit} disabled={isPending || !formData.description.trim()}>
                        {isPending ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
