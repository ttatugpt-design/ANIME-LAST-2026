import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Search, Globe, Link2, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { useParams } from "react-router-dom";

const accountTypes = [
    { value: 'doodstream', label: 'Doodstream' },
    { value: 'streamtape', label: 'Streamtape' },
    { value: 'mixdrop', label: 'Mixdrop' },
    { value: 'voe', label: 'voe.sx' }
];

export default function MirroredAccountsPage() {
    const { lang } = useParams<{ lang: string }>();
    const isAr = lang === 'ar';
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    const [formData, setFormData] = useState({
        name: "",
        api_key: "",
        type: "mirrored",
        linked_accounts_json: "[]",
    });
    const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
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
        mutationFn: async (data: any) => {
            if (!editingAccount) return;
            return await api.put(`/embed-accounts/${editingAccount.id}`, data);
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
        setFormData({ name: "", api_key: "", type: "mirrored", linked_accounts_json: "[]" });
        setLinkedAccounts([]);
    };

    const handleEditClick = (account: any) => {
        setEditingAccount(account);
        const linked = JSON.parse(account.linked_accounts_json || "[]");
        setFormData({
            name: account.name || "",
            api_key: account.api_key || "",
            type: "mirrored",
            linked_accounts_json: account.linked_accounts_json || "[]"
        });
        setLinkedAccounts(linked);
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
        const dataToSubmit = {
            ...formData,
            linked_accounts_json: JSON.stringify(linkedAccounts)
        };
        createMutation.mutate(dataToSubmit);
    };

    const handleUpdate = () => {
        const dataToSubmit = {
            ...formData,
            linked_accounts_json: JSON.stringify(linkedAccounts)
        };
        updateMutation.mutate(dataToSubmit);
    };

    const addLinkedAccount = () => {
        setLinkedAccounts([...linkedAccounts, { type: "doodstream", api_key: "", api_password: "" }]);
    };

    const removeLinkedAccount = (index: number) => {
        setLinkedAccounts(linkedAccounts.filter((_, i) => i !== index));
    };

    const updateLinkedAccount = (index: number, field: string, value: string) => {
        const newArr = [...linkedAccounts];
        newArr[index] = { ...newArr[index], [field]: value };
        setLinkedAccounts(newArr);
    };

    const filteredAccounts = (accounts || []).filter((acc: any) => 
        acc.type === 'mirrored' &&
        acc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Globe className="h-8 w-8 text-primary" />
                        {isAr ? "حسابات Mirrored.to" : "Mirrored.to Accounts"}
                    </h2>
                    <p className="text-muted-foreground">
                        {isAr ? "إدارة حسابات الرفع المتعدد عبر Mirrored.to." : "Manage multi-upload accounts via Mirrored.to."}
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
                                <DialogTitle>{isAr ? "حساب Mirrored جديد" : "New Mirrored Account"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>{isAr ? "اسم الحساب / الوصف" : "Account Name / Description"}</Label>
                                    <Input
                                        placeholder={isAr ? "مثال: حسابي في ميرورد" : "Ex: My Mirrored Account"}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        dir="auto"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>API Key</Label>
                                    <Input
                                        placeholder="Enter Mirrored.to API Key"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4 border-t pt-4 mt-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-primary font-bold">{isAr ? "السيرفرات المربوطة" : "Linked Servers"}</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addLinkedAccount}>
                                            <Plus className="h-3 w-3 mr-1" />
                                            {isAr ? "إضافة سيرفر" : "Add Server"}
                                        </Button>
                                    </div>
                                    {linkedAccounts.map((la, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-end border p-2 rounded bg-muted/30">
                                            <div className="col-span-3 grid gap-1">
                                                <Label className="text-[10px] uppercase opacity-70">{isAr ? "النوع" : "Type"}</Label>
                                                <Select value={la.type} onValueChange={(v) => updateLinkedAccount(index, 'type', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {accountTypes.map(type => (
                                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-4 grid gap-1">
                                                <Label className="text-[10px] uppercase opacity-70">{la.type === 'streamtape' ? 'Login ID' : 'API Key'}</Label>
                                                <Input 
                                                    value={la.api_key} 
                                                    onChange={(e) => updateLinkedAccount(index, 'api_key', e.target.value)}
                                                    placeholder="Key"
                                                />
                                            </div>
                                            <div className="col-span-3 grid gap-1">
                                                <Label className="text-[10px] uppercase opacity-70">Password / Secret</Label>
                                                <Input 
                                                    value={la.api_password || ""} 
                                                    onChange={(e) => updateLinkedAccount(index, 'api_password', e.target.value)}
                                                    placeholder="Optional"
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-center pb-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLinkedAccount(index)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
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
                        <DialogTitle>{isAr ? "تعديل حساب ميرورد" : "Edit Mirrored Account"}</DialogTitle>
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

                        <div className="space-y-4 border-t pt-4 mt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-primary font-bold">{isAr ? "السيرفرات المربوطة" : "Linked Servers"}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addLinkedAccount}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    {isAr ? "إضافة سيرفر" : "Add Server"}
                                </Button>
                            </div>
                            {linkedAccounts.map((la, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end border p-2 rounded bg-muted/30">
                                    <div className="col-span-3 grid gap-1">
                                        <Label className="text-[10px] uppercase opacity-70">{isAr ? "النوع" : "Type"}</Label>
                                        <Select value={la.type} onValueChange={(v) => updateLinkedAccount(index, 'type', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accountTypes.map(type => (
                                                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-4 grid gap-1">
                                        <Label className="text-[10px] uppercase opacity-70">{la.type === 'streamtape' ? 'Login ID' : 'API Key'}</Label>
                                        <Input 
                                            value={la.api_key} 
                                            onChange={(e) => updateLinkedAccount(index, 'api_key', e.target.value)}
                                            placeholder="Key"
                                        />
                                    </div>
                                    <div className="col-span-3 grid gap-1">
                                        <Label className="text-[10px] uppercase opacity-70">Password / Secret</Label>
                                        <Input 
                                            value={la.api_password || ""} 
                                            onChange={(e) => updateLinkedAccount(index, 'api_password', e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-center pb-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLinkedAccount(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            {isAr ? "إلغاء" : "Cancel"}
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {isAr ? "حفظ التغييرات" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>{isAr ? "جميع حسابات Mirrored.to" : "All Mirrored.to Accounts"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>{isAr ? "الاسم" : "Name"}</TableHead>
                                    <TableHead>API Key</TableHead>
                                    <TableHead>{isAr ? "السيرفرات المربوطة" : "Linked Servers"}</TableHead>
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
                                            <div className="flex flex-wrap gap-1">
                                                {JSON.parse(account.linked_accounts_json || "[]").map((la: any, i: number) => (
                                                    <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full border border-primary/20">
                                                        <Link2 className="h-2 w-2" />
                                                        {la.type}
                                                    </span>
                                                ))}
                                                {JSON.parse(account.linked_accounts_json || "[]").length === 0 && (
                                                    <span className="text-muted-foreground text-xs italic">{isAr ? "لا يوجد" : "None"}</span>
                                                )}
                                            </div>
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
                                        <TableCell colSpan={4} className="text-center h-24">
                                            {isAr ? "لا توجد حسابات ميرورد." : "No mirrored accounts found."}
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
