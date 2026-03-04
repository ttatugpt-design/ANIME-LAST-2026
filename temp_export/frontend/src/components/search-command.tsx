import * as React from "react"
import {
    Settings,
    User,
    Shield,
    Key,
    UserPlus,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce"; // We need to create this or use standard debounce

export function SearchCommand() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const navigate = useNavigate();

    // Debounce query to avoid spamming API
    const debouncedQuery = useDebounce(query, 300);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const { data } = useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return null;
            const res = await api.get(`/search?q=${debouncedQuery}`);
            return res.data;
        },
        enabled: debouncedQuery.length > 0
    });

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
            >
                <span className="hidden lg:inline-flex">Search...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." onValueChange={setQuery} />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {data && (
                        <>
                            {data.users?.length > 0 && (
                                <CommandGroup heading="Users">
                                    {data.users.map((user: any) => (
                                        <CommandItem
                                            key={user.id}
                                            onSelect={() => runCommand(() => navigate('/users'))} // Ideally navigate to user detail
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            <span>{user.name}</span>
                                            <span className="ml-2 text-xs text-muted-foreground">{user.email}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                            {data.roles?.length > 0 && (
                                <CommandGroup heading="Roles">
                                    {data.roles.map((role: any) => (
                                        <CommandItem
                                            key={role.id}
                                            onSelect={() => runCommand(() => navigate('/roles'))}
                                        >
                                            <Shield className="mr-2 h-4 w-4" />
                                            <span>{role.name}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                            {data.permissions?.length > 0 && (
                                <CommandGroup heading="Permissions">
                                    {data.permissions.map((perm: any) => (
                                        <CommandItem
                                            key={perm.id}
                                            onSelect={() => runCommand(() => navigate('/permissions'))}
                                        >
                                            <Key className="mr-2 h-4 w-4" />
                                            <span>{perm.key}</span>
                                            <span className="ml-2 text-xs text-muted-foreground">{perm.description}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </>
                    )}
                    <CommandSeparator />
                    <CommandGroup heading="Quick Actions">
                        <CommandItem onSelect={() => runCommand(() => navigate('/users'))}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>Manage Users</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
