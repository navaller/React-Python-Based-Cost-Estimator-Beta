"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  items: { id: number; name: string }[]; // List of selectable items
  selectedItems: number[]; // Currently selected IDs
  onChange: (selected: number[]) => void; // Callback when selection changes
  label?: string; // Placeholder label
}

export default function MultiSelect({
  items,
  selectedItems,
  onChange,
  label = "Select Items",
}: MultiSelectProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // ✅ Toggle an item selection
  const toggleItem = (id: number) => {
    onChange(
      selectedItems.includes(id)
        ? selectedItems.filter((item) => item !== id) // Remove
        : [...selectedItems, id] // Add
    );
  };

  // ✅ Toggle "Select All" functionality
  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onChange([]); // Deselect all
    } else {
      onChange(items.map((item) => item.id)); // Select all
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedItems.length > 0
            ? `${selectedItems.length} Selected`
            : label}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {/* ✅ "Select All" option */}
              <CommandItem onSelect={toggleSelectAll}>
                Select All
                <Check
                  className={cn(
                    "ml-auto",
                    selectedItems.length === items.length
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
              </CommandItem>
              {/* ✅ List all items with checkboxes */}
              {items.map((item) => (
                <CommandItem key={item.id} onSelect={() => toggleItem(item.id)}>
                  {item.name}
                  <Check
                    className={cn(
                      "ml-auto",
                      selectedItems.includes(item.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
