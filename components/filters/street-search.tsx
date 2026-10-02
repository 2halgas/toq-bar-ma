"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_QUERY_LENGTH } from "@/lib/search-params";

const DEBOUNCE_MS = 250;

interface StreetSearchProps {
  /** Query currently in the URL. */
  value: string;
  onCommit: (query: string) => void;
}

export function StreetSearch({ value, onCommit }: StreetSearchProps) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Adopt URL changes made elsewhere (reset, back/forward), but not the URL
  // catching up with our own debounced commits — that would eat fresh keystrokes.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== committed) {
      setDraft(value);
      setCommitted(value);
    }
  }

  const commit = (value: string) => {
    setCommitted(value.trim());
    onCommit(value.trim());
  };

  // Typing updates the input immediately and the URL (and results) shortly after.
  useEffect(() => {
    if (draft.trim() === committed) return;
    const timer = window.setTimeout(() => {
      setCommitted(draft.trim());
      onCommit(draft.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, committed, onCommit]);

  return (
    <form
      role="search"
      className="space-y-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        commit(draft);
        inputRef.current?.blur(); // hides the on-screen keyboard on phones
      }}
    >
      <Label htmlFor={inputId}>Улица или микрорайон</Label>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          id={inputId}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Например, Айгерим-1 или Ратушного"
          aria-describedby={hintId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Очистить поиск"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => {
              setDraft("");
              commit("");
              inputRef.current?.focus();
            }}
          >
            <XIcon aria-hidden />
          </Button>
        )}
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        Можно писать «мкр», «м-н» или без сокращений; регистр и ё/е не важны.
      </p>
    </form>
  );
}
