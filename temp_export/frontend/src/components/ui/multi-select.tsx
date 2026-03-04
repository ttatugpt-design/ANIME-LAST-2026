import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type Option = {
    label: string
    value: string
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
    onOpenChange?: (open: boolean) => void
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    onOpenChange,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        onOpenChange?.(newOpen)
    }

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item))
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10"
                >
                    <div className="flex flex-wrap gap-1">
                        {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
                        {selected.map((item) => (
                            <Badge variant="secondary" key={item} className="mr-1 mb-1" onClick={(e) => { e.stopPropagation(); handleUnselect(item); }}>
                                {options.find((opt) => opt.value === item)?.label || item}
                                <X className="ml-1 h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                            </Badge>
                        ))}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[500px] p-0"
                side="right"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                        if (selected.includes(option.value)) {
                                            onChange(selected.filter((item) => item !== option.value))
                                        } else {
                                            onChange([...selected, option.value])
                                        }
                                        setOpen(true)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.value) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
