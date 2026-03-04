import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { UserForm } from "@/features/users/components/user-form";
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { toast } from "sonner";
import api from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermission } from "@/stores/auth-store";

import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";

export default function UsersPage() {
    const [open, setOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const queryClient = useQueryClient();

    const canCreate = usePermission('users.create');
    const canUpdate = usePermission('users.update');
    const canDelete = usePermission('users.delete');

    const { data: users, isLoading } = useQuery({
        queryKey: ["users", debouncedSearch],
        queryFn: async () => {
            // Artificial delay to show spinner
            // await new Promise(resolve => setTimeout(resolve, 1000));
            const params = debouncedSearch ? `?q=${debouncedSearch}` : "";
            return (await api.get(`/users${params}`)).data;
        },
        placeholderData: keepPreviousData,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User deleted");
        }
    });

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setOpen(true);
    };

    const handleAdd = () => {
        setSelectedUser(null);
        setOpen(true);
    };

    if (isLoading) {
        return <PageLoader />;
    }



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Users</h2>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
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
                            <Plus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    )}
                </div>
            </div>

            <UserForm open={open} onOpenChange={setOpen} user={selectedUser} key={selectedUser?.id || 'new'} />

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Manage your team members and their roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Avatar</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                                </TableRow>
                            ) : (
                                users?.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <Avatar>
                                                <AvatarImage src={user.avatar ? `${user.avatar}` : ""} className="object-cover" />
                                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.role?.name}</TableCell>
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
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>Copy ID</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {canUpdate && (
                                                        <DropdownMenuItem onClick={() => handleEdit(user)}>Edit User</DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(user.id)}>Delete User</DropdownMenuItem>
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
