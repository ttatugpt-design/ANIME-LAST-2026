import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
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

export default function LanguagesPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [slug, setSlug] = useState("");
    const [date, setDate] = useState("");
    const [editingLanguage, setEditingLanguage] = useState<any>(null);

    const { data: languages, isLoading } = useQuery({
        queryKey: ["languages"],
        queryFn: async () => (await api.get("/languages")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post("/languages", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["languages"] });
            toast.success("Language created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create language: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingLanguage) throw new Error("No language selected");
            const payload: any = { name, name_en: nameEn, slug };
            if (date) payload.date = new Date(date).toISOString();

            return await api.put(`/languages/${editingLanguage.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["languages"] });
            toast.success("Language updated successfully");
            setIsEditModalOpen(false);
            setEditingLanguage(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update language: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/languages/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["languages"] });
            toast.success("Language deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete language: " + (err.response?.data?.error || err.message));
        }
    });

    const resetForm = () => {
        setName("");
        setNameEn("");
        setSlug("");
        setDate("");
    };

    const handleEditClick = (language: any) => {
        setEditingLanguage(language);
        setName(language.name);
        setNameEn(language.name_en);
        setSlug(language.slug);
        setDate(language.date ? new Date(language.date).toISOString().split('T')[0] : "");
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this language?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        const payload: any = { name, name_en: nameEn, slug };
        if (date) payload.date = new Date(date).toISOString();
        createMutation.mutate(payload);
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Languages</h2>
                    <p className="text-muted-foreground">Manage anime languages.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Language
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Language</DialogTitle>
                            <DialogDescription>
                                Create a new language.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name (Arabic)</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: العربية" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nameEn">Name (English)</Label>
                                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Arabic" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ar" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">Date (Optional)</Label>
                                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={createMutation.isPending || !name.trim()}>
                                {createMutation.isPending ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Language</DialogTitle>
                        <DialogDescription>Update language details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name (Arabic)</Label>
                            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-nameEn">Name (English)</Label>
                            <Input id="edit-nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-slug">Slug</Label>
                            <Input id="edit-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-date">Date</Label>
                            <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim()}>
                            {updateMutation.isPending ? "Updating..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Languages</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Name (En)</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {languages?.map((lang: any) => (
                                <TableRow key={lang.id}>
                                    <TableCell className="font-medium">{lang.id}</TableCell>
                                    <TableCell>{lang.name}</TableCell>
                                    <TableCell>{lang.name_en}</TableCell>
                                    <TableCell>{lang.date ? new Date(lang.date).toLocaleDateString() : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(lang)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(lang.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {languages?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No languages found.
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
