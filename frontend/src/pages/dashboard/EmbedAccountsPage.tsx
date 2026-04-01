import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Search, Server } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
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

export default function EmbedAccountsPage() {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    const [formData, setFormData] = useState({
        name: "",
        api_key: "",
    });
    const [editingAccount, setEditingAccount] = useState<any>(null);

    const { data: accounts, isLoading } = useQuery({
        queryKey: ["embed-accounts"],
        queryFn: async () => (await api.get("/embed-accounts")).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return await api.post("/embed-accounts", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["embed-accounts"] });
            toast.success(isAr ? "تم إضافة الحساب بنجاح" : "Account added successfully");
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || err.message);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingAccount) return;
            return await api.put(`/embed-accounts/${editingAccount.id}`, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["embed-accounts"] });
            toast.success(isAr ? "تم تحديث الحساب بنجاح" : "Account updated successfully");
            setIsEditModalOpen(false);
            setEditingAccount(null);
            resetForm();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || err.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/embed-accounts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["embed-accounts"] });
            toast.success(isAr ? "تم حذف الحساب" : "Account deleted");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || err.message);
        }
    });

    const resetForm = () => {
        setFormData({ name: "", api_key: "" });
    };

    const handleEditClick = (account: any) => {
        setEditingAccount(account);
        setFormData({
            name: account.name || "",
            api_key: account.api_key || "",
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        if (window.confirm(isAr ? "هل أنت متأكد من حذف هذا الحساب؟" : "Are you sure you want to delete this account?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        if (!formData.name || !formData.api_key) {
            toast.error(isAr ? "يرجى تعبئة كافة الحقول" : "Please fill all fields");
            return;
        }
        createMutation.mutate(formData);
    };

    const filteredAccounts = accounts?.filter((acc: any) => 
        acc.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Server className="h-8 w-8 text-primary" />
                        {isAr ? "سيرفرات Embed" : "Embed Accounts"}
                    </h2>
                    <p className="text-muted-foreground">
                        {isAr ? "إدارة حسابات الرفع (API Keys) مثل Doodstream." : "Manage upload accounts (API Keys) like Doodstream."}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={isAr ? "بحث..." : "Search..."}
                            className={`pl-8 w-[250px] ${isAr ? 'pr-8 pl-2' : ''}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                {isAr ? "إضافة حساب" : "Add Account"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{isAr ? "حساب جديد" : "New Account"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>{isAr ? "اسم الحساب / الوصف" : "Account Name / Description"}</Label>
                                    <Input
                                        placeholder={isAr ? "مثال: الحساب الرئيسي" : "Ex: Main Account"}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        dir="auto"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>API Key</Label>
                                    <Input
                                        placeholder="Enter API Key from provider"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                    {isAr ? "إلغاء" : "Cancel"}
                                </Button>
                                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                    {isAr ? "حفظ" : "Save"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isAr ? "تعديل حساب" : "Edit Account"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{isAr ? "اسم الحساب / الوصف" : "Account Name / Description"}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                dir="auto"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>API Key</Label>
                            <Input
                                value={formData.api_key}
                                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            {isAr ? "إلغاء" : "Cancel"}
                        </Button>
                        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                            {isAr ? "حفظ التغييرات" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>{isAr ? "جميع الحسابات" : "All Accounts"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>{isAr ? "الاسم" : "Name"}</TableHead>
                                    <TableHead>API Key</TableHead>
                                    <TableHead>{isAr ? "النوع" : "Type"}</TableHead>
                                    <TableHead className="text-right">{isAr ? "إجراءات" : "Actions"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccounts.map((account: any) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">{account.id}</TableCell>
                                        <TableCell className="font-semibold">{account.name}</TableCell>
                                        <TableCell>
                                            <code className="bg-muted px-2 py-1 rounded text-xs select-all">
                                                {account.api_key}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{account.type || 'Doodstream'}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(account)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(account.id)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredAccounts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            {isAr ? "لا توجد حسابات." : "No accounts found."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
