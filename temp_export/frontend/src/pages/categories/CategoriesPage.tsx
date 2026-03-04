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

export default function CategoriesPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [status, setStatus] = useState("active");
    const [uploading, setUploading] = useState(false);

    const [editingCategory, setEditingCategory] = useState<any>(null);

    const { data: categories, isLoading } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => (await api.get("/categories")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post("/categories", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            toast.success("Category created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create category: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingCategory) throw new Error("No category selected");
            return await api.put(`/categories/${editingCategory.id}`, {
                name,
                name_en: nameEn,
                slug,
                description,
                image,
                status
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            toast.success("Category updated successfully");
            setIsEditModalOpen(false);
            setEditingCategory(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update category: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            toast.success("Category deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete category: " + (err.response?.data?.error || err.message));
        }
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImage(response.data.url);
            toast.success('Image uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setNameEn("");
        setSlug("");
        setDescription("");
        setImage("");
        setStatus("active");
    };

    const handleEditClick = (category: any) => {
        setEditingCategory(category);
        setName(category.name);
        setNameEn(category.name_en);
        setSlug(category.slug);
        setDescription(category.description);
        setImage(category.image || "");
        setStatus(category.status);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this category?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        createMutation.mutate({
            name,
            name_en: nameEn,
            slug,
            description,
            image,
            status
        });
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
                    <p className="text-muted-foreground">Manage anime categories.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Category</DialogTitle>
                            <DialogDescription>
                                Create a new category.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name (Arabic)</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="أكشن" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nameEn">Name (English)</Label>
                                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Action" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="action" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="image">Image</Label>
                                <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                                {image && <p className="text-sm text-green-600">Image uploaded: {image}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
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
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>Update category details.</DialogDescription>
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
                            <Label htmlFor="edit-description">Description</Label>
                            <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-image">Image</Label>
                            <Input id="edit-image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                            {image && (
                                <div className="flex items-center gap-2">
                                    <img src={image} alt="Category" className="w-16 h-16 object-cover rounded" />
                                    <p className="text-sm text-green-600">Current image</p>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-status">Status</Label>
                            <select
                                id="edit-status"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
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
                    <CardTitle>All Categories</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Name (En)</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories?.map((category: any) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{category.id}</TableCell>
                                    <TableCell>{category.name}</TableCell>
                                    <TableCell>{category.name_en}</TableCell>
                                    <TableCell>{category.slug}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {category.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(category)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(category.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {categories?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        No categories found.
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
