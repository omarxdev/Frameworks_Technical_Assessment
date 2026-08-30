"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const toIsoDay = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromIsoDay = (value?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const label = (value?: string) => {
  const date = fromIsoDay(value);
  if (!date) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const DatePicker = ({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  className,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = fromIsoDay(value);
  const text = label(value);

  const handleSelect = (date?: Date) => {
    if (!date) return;
    onChange(toIsoDay(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!text}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 font-normal",
            !text && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="shrink-0 opacity-70" />
          <span className="truncate">{text ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          onSelect={handleSelect}
          startMonth={fromIsoDay(min)}
          endMonth={max ? fromIsoDay(max) : undefined}
          disabled={[
            ...(min ? [{ before: fromIsoDay(min) as Date }] : []),
            ...(max ? [{ after: fromIsoDay(max) as Date }] : []),
          ]}
        />
      </PopoverContent>
    </Popover>
  );
};

export const DateTimePicker = ({
  id,
  value,
  onChange,
  min,
  disabled,
  className,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const [datePart = "", timePart = ""] = (value ?? "").split("T");

  const handleDate = (next: string) =>
    onChange(`${next}T${timePart || "09:00"}`);

  const handleTime = (next: string) => {
    if (!next) return;
    onChange(`${datePart || toIsoDay(new Date())}T${next}`);
  };

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <DatePicker
        id={id}
        value={datePart}
        onChange={handleDate}
        min={min}
        disabled={disabled}
        className="min-w-0 flex-1"
      />
      <input
        type="time"
        aria-label="Time"
        value={timePart}
        disabled={disabled}
        onChange={(event) => handleTime(event.target.value)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full shrink-0 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3 disabled:opacity-50 sm:w-32"
      />
    </div>
  );
};
