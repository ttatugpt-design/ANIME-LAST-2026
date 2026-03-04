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

export default function TypesPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [slug, setSlug] = useState("");
    const [editingType, setEditingType] = useState<any>(null);

    const { data: types, isLoading } = useQuery({
        queryKey: ["types"],
        queryFn: async () => (await api.get("/types")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post("/types", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            toast.success("Type created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create type: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingType) throw new Error("No type selected");
            return await api.put(`/types/${editingType.id}`, { name, name_en: nameEn, slug });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            toast.success("Type updated successfully");
            setIsEditModalOpen(false);
            setEditingType(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update type: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/types/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            toast.success("Type deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete type: " + (err.response?.data?.error || err.message));
        }
    });

    const resetForm = () => {
        setName("");
        setNameEn("");
        setSlug("");
    };

    const handleEditClick = (type: any) => {
        setEditingType(type);
        setName(type.name);
        setNameEn(type.name_en);
        setSlug(type.slug);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this type?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        createMutation.mutate({ name, name_en: nameEn, slug });
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Types</h2>
                    <p className="text-muted-foreground">Manage anime types (Movie, TV, etc.).</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Type</DialogTitle>
                            <DialogDescription>
                                Create a new anime type.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name (Arabic)</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: فيلم" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nameEn">Name (English)</Label>
                                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Movie" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="movie" />
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
                        <DialogTitle>Edit Type</DialogTitle>
                        <DialogDescription>Update type details.</DialogDescription>
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
                    <CardTitle>All Types</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Name (En)</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types?.map((type: any) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium">{type.id}</TableCell>
                                    <TableCell>{type.name}</TableCell>
                                    <TableCell>{type.name_en}</TableCell>
                                    <TableCell>{type.slug}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(type)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(type.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {types?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No types found.
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
