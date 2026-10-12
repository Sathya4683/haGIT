"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export interface MenuItem {
    label: string;
    icon?: React.ReactNode;
    onSelect: () => void;
    danger?: boolean;
}

/** Accessible dropdown menu in the haGIT style. */
export function Menu({ trigger, items, align = "end" }: { trigger: React.ReactNode; items: MenuItem[]; align?: "start" | "end" }) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align={align}
                    sideOffset={6}
                    className="z-[60] min-w-[11rem] p-1 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] shadow-brutal dark:shadow-brutal-dark animate-fade-in"
                >
                    {items.map((item) => (
                        <DropdownMenu.Item
                            key={item.label}
                            onSelect={item.onSelect}
                            className={cn(
                                "flex items-center gap-2 px-2.5 py-2 text-xs font-bold outline-none cursor-pointer select-none",
                                "data-[highlighted]:bg-[rgb(var(--paper-alt))]",
                                item.danger && "text-red-600 dark:text-red-400",
                            )}
                        >
                            {item.icon}
                            {item.label}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
