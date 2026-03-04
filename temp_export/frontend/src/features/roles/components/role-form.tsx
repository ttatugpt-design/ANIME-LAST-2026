import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "sonner"
import { MultiSelect } from "@/components/ui/multi-select"
import { useEffect, useState } from "react"

const formSchema = z.object({
    name: z.string().min(2),
    permission_ids: z.array(z.string()).optional(), // MultiSelect uses strings, parse to numbers
})

interface RoleFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    role?: any
}

export function RoleForm({ open, onOpenChange, role }: RoleFormProps) {
    const queryClient = useQueryClient();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Fetch Permissions
    const { data: permissions } = useQuery({
        queryKey: ["permissions"],
        queryFn: async () => (await api.get("/permissions")).data
    });

    const permOptions = permissions?.map((p: any) => ({
        label: p.key + (p.description ? ` (${p.description})` : ""),
        value: String(p.id)
    })) || [];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            permission_ids: [],
        },
    })

    // sync defaults
    useEffect(() => {
        if (role) {
            form.reset({
                name: role.name,
                permission_ids: role.permissions?.map((p: any) => String(p.id)) || []
            });
        } else {
            form.reset({
                name: "",
                permission_ids: []
            });
        }
    }, [role, open, form]);

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/roles", { ...data, permission_ids: data.permission_ids.map(Number) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Role created");
            onOpenChange(false);
        },
        onError: (error: any) => toast.error("Failed to create role")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/roles/${role.id}`, { ...data, permission_ids: data.permission_ids.map(Number) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Role updated");
            onOpenChange(false);
        },
        onError: (error: any) => toast.error("Failed to update role")
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (role) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-w-lg max-h-[85vh] flex flex-col transition-transform duration-300 ease-in-out ${isDropdownOpen ? '-translate-x-64' : ''}`}>
                <DialogHeader>
                    <DialogTitle>{role ? "Edit Role" : "Add Role"}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Admin" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="permission_ids"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Permissions</FormLabel>
                                        <FormControl>
                                            <MultiSelect
                                                options={permOptions}
                                                selected={field.value || []}
                                                onChange={field.onChange}
                                                placeholder="Select permissions..."
                                                onOpenChange={setIsDropdownOpen}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full">Save</Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
