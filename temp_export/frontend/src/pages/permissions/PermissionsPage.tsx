import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionForm } from "@/features/permissions/components/permission-form";
import { toast } from "sonner";
import { usePermission } from "@/stores/auth-store";

import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";

export default function PermissionsPage() {
    const [open, setOpen] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<any>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const queryClient = useQueryClient();

    const canCreate = usePermission('permissions.create');
    const canUpdate = usePermission('permissions.update');
    const canDelete = usePermission('permissions.delete');

    const { data: permissions, isLoading } = useQuery({
        queryKey: ["permissions", debouncedSearch],
        queryFn: async () => {
            const params = debouncedSearch ? `?q=${debouncedSearch}` : "";
            // Artificial delay to show spinner
            // await new Promise(resolve => setTimeout(resolve, 1000));
            return (await api.get(`/permissions${params}`)).data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/permissions/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["permissions"] });
            toast.success("Permission deleted");
        }
    });

    const handleEdit = (perm: any) => {
        setSelectedPermission(perm);
        setOpen(true);
    };

    const handleAdd = () => {
        setSelectedPermission(null);
        setOpen(true);
    };

    if (isLoading) {
        return <PageLoader />;
    }



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Permissions</h2>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search permissions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-8"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {canCreate && (
                        <Button onClick={handleAdd}>
                            <Plus className="mr-2 h-4 w-4" /> Add Permission
                        </Button>
                    )}
                </div>
            </div>

            <PermissionForm open={open} onOpenChange={setOpen} permission={selectedPermission} key={selectedPermission?.id || 'new'} />

            <Card>
                <CardHeader>
                    <CardTitle>All Permissions</CardTitle>
                    <CardDescription>Manage system permissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Key</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                                </TableRow>
                            ) : (
                                permissions?.map((perm: any) => (
                                    <TableRow key={perm.id}>
                                        <TableCell className="font-medium">{perm.key}</TableCell>
                                        <TableCell>{perm.description}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    {canUpdate && (
                                                        <DropdownMenuItem onClick={() => handleEdit(perm)}>Edit</DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(perm.id)}>Delete</DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
