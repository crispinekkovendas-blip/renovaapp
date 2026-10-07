"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconSearch } from "@/components/icons";

export function PatientSearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      startTransition(() => {
        router.replace(`/pacientes?${params.toString()}`, { scroll: false });
      });
    }, 250);
  }

  return (
    <div className="relative mb-4 max-w-md">
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-900/40" />
      <input
        className="input pl-9"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Buscar paciente"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Buscar por nome, CPF ou telefone…"
      />
    </div>
  );
}
