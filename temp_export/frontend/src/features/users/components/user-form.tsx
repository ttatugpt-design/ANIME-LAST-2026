import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional().or(z.literal('')), // Optional for edit
    role: z.string(),
    avatar: z.any().optional(), // Changed to z.any() for file uploads
})

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

interface UserFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: any // Placeholder type
}

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
    const queryClient = useQueryClient();
    const [preview, setPreview] = useState<string | null>(null);
    const currentUser = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            password: "",
            role: user?.role?.name || "User",
        },
    })

    // Reset form when user changes
    useEffect(() => {
        if (open) {
            form.reset({
                name: user?.name || "",
                email: user?.email || "",
                password: "",
                role: user?.role?.name || "User",
            });
            setPreview(user?.avatar ? `${user.avatar}` : null);
        }
    }, [user, open, form]);

    const fileRef = form.register("avatar");

    const createMutation = useMutation({
        mutationFn: (data: FormData) => api.post("/users", data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User created successfully");
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Failed to create user");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: FormData) => api.put(`/users/${user?.id}`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });

            // If updating current user, refresh the page to update header
            if (currentUser && currentUser.id == user?.id) {
                window.location.reload();
                return;
            }

            toast.success("User updated successfully");
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Failed to update user");
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("email", values.email);
        if (values.password && values.password.length > 0) {
            formData.append("password", values.password);
        }
        // Hacky role mapping
        const roleId = values.role === "Admin" ? 1 : values.role === "User" ? 2 : 3;
        formData.append("role_id", roleId.toString());

        if (values.avatar && values.avatar.length > 0) {
            formData.append("avatar", values.avatar[0]);
        }

        if (user) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
        fileRef.onChange(e);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={preview || ""} className="object-cover" />
                                    <AvatarFallback className="text-2xl">{user?.name?.[0] || "?"}</AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                                >
                                    <Camera size={16} />
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        {...fileRef}
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="m@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password {user && "(Leave blank to keep current)"}</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                            <SelectItem value="User">User</SelectItem>
                                            <SelectItem value="Viewer">Viewer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Save</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
