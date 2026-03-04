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

export default function SeasonsPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [slug, setSlug] = useState("");
    const [editingSeason, setEditingSeason] = useState<any>(null);

    const { data: seasons, isLoading } = useQuery({
        queryKey: ["seasons"],
        queryFn: async () => (await api.get("/seasons")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post("/seasons", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seasons"] });
            toast.success("Season created successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to create season: " + (err.response?.data?.error || err.message));
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingSeason) throw new Error("No season selected");
            return await api.put(`/seasons/${editingSeason.id}`, { name, name_en: nameEn, slug });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seasons"] });
            toast.success("Season updated successfully");
            setIsEditModalOpen(false);
            setEditingSeason(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error("Failed to update season: " + (err.response?.data?.error || err.message));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/seasons/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seasons"] });
            toast.success("Season deleted");
        },
        onError: (err: any) => {
            toast.error("Failed to delete season: " + (err.response?.data?.error || err.message));
        }
    });

    const resetForm = () => {
        setName("");
        setNameEn("");
        setSlug("");
    };

    const handleEditClick = (season: any) => {
        setEditingSeason(season);
        setName(season.name);
        setNameEn(season.name_en);
        setSlug(season.slug);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (confirm("Are you sure you want to delete this season?")) {
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
                    <h2 className="text-3xl font-bold tracking-tight">Seasons</h2>
                    <p className="text-muted-foreground">Manage anime seasons (Winter, Spring, etc.).</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Season
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Season</DialogTitle>
                            <DialogDescription>
                                Create a new anime season.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name (Arabic)</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ربيع 2024" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nameEn">Name (English)</Label>
                                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Spring 2024" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="spring-2024" />
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
                        <DialogTitle>Edit Season</DialogTitle>
                        <DialogDescription>Update season details.</DialogDescription>
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
                    <CardTitle>All Seasons</CardTitle>
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
                            {seasons?.map((season: any) => (
                                <TableRow key={season.id}>
                                    <TableCell className="font-medium">{season.id}</TableCell>
                                    <TableCell>{season.name}</TableCell>
                                    <TableCell>{season.name_en}</TableCell>
                                    <TableCell>{season.slug}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(season)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(season.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {seasons?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No seasons found.
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
