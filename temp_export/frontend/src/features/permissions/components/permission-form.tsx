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
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "sonner"

const formSchema = z.object({
    key: z.string().min(2),
    description: z.string().optional(),
})

interface PermissionFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    permission?: any
}

export function PermissionForm({ open, onOpenChange, permission }: PermissionFormProps) {
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            key: permission?.key || "",
            description: permission?.description || "",
        },
    })

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/permissions", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["permissions"] });
            toast.success("Permission created");
            onOpenChange(false);
        },
        onError: (error: any) => toast.error("Failed to create permission")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/permissions/${permission.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["permissions"] });
            toast.success("Permission updated");
            onOpenChange(false);
        },
        onError: (error: any) => toast.error("Failed to update permission")
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (permission) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{permission ? "Edit Permission" : "Add Permission"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Key</FormLabel>
                                    <FormControl>
                                        <Input placeholder="users.create" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Allows creating users" {...field} />
                                    </FormControl>
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
