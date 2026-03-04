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

export default function StudiosPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [slug, setSlug] = useState("");
    const [date, setDate] = useState(""); // Studio foundation date?
    const [editingStudio, setEditingStudio] = useState<any>(null);

    const { data: studios, isLoading } = useQuery({
        queryKey: ["studios"],
        queryFn: async () => (await api.get("/studios")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post("/studios", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studios"] });
            toast.success("Studio created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create studio: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingStudio) throw new Error("No studio selected");
            const payload: any = { name, name_en: nameEn, slug };
            if (date) payload.date = new Date(date).toISOString();

            return await api.put(`/studios/${editingStudio.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studios"] });
            toast.success("Studio updated successfully");
            setIsEditModalOpen(false);
            setEditingStudio(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update studio: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/studios/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studios"] });
            toast.success("Studio deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete studio: " + (err.response?.data?.error || err.message));
        }
    });

    const resetForm = () => {
        setName("");
        setNameEn("");
        setSlug("");
        setDate("");
    };

    const handleEditClick = (studio: any) => {
        setEditingStudio(studio);
        setName(studio.name);
        setNameEn(studio.name_en);
        setSlug(studio.slug);
        setDate(studio.date ? new Date(studio.date).toISOString().split('T')[0] : "");
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this studio?")) {
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
                    <h2 className="text-3xl font-bold tracking-tight">Studios</h2>
                    <p className="text-muted-foreground">Manage anime studios.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Studio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Studio</DialogTitle>
                            <DialogDescription>
                                Create a new anime studio.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name (Arabic)</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مابا" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nameEn">Name (English)</Label>
                                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. MAPPA" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mappa" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">Established Date (Optional)</Label>
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
                        <DialogTitle>Edit Studio</DialogTitle>
                        <DialogDescription>Update studio details.</DialogDescription>
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
                            <Label htmlFor="edit-date">Established Date</Label>
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
                    <CardTitle>All Studios</CardTitle>
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
                            {studios?.map((studio: any) => (
                                <TableRow key={studio.id}>
                                    <TableCell className="font-medium">{studio.id}</TableCell>
                                    <TableCell>{studio.name}</TableCell>
                                    <TableCell>{studio.name_en}</TableCell>
                                    <TableCell>{studio.date ? new Date(studio.date).toLocaleDateString() : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(studio)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(studio.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {studios?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No studios found.
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
