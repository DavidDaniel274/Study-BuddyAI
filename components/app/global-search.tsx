'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, KanbanSquare, Layers, GraduationCap, CheckSquare, Target, X } from 'lucide-react';
import { store } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { cn } from '@/lib/utils';

type SearchResult = { id: string; title: string; type: string; href: string };

export function GlobalSearch() {
  const { userId } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!userId || !query.trim()) { setResults([]); return; }
    (async () => {
      const q = query.toLowerCase();
      const [projects, docs, cards, quizzes, todos, goals] = await Promise.all([
        store.from('projects').select('id, title').eq('user_id', userId),
        store.from('documents').select('id, name').eq('user_id', userId),
        store.from('flashcards').select('id, front').eq('user_id', userId),
        store.from('quizzes').select('id, topic').eq('user_id', userId),
        store.from('todos').select('id, title').eq('user_id', userId),
        store.from('goals').select('id, title').eq('user_id', userId),
      ]);
      const all: SearchResult[] = [
        ...((projects.data ?? []).map((p: any) => ({ id: p.id, title: p.title, type: 'Project', href: `/app/projects/${p.id}` }))),
        ...((docs.data ?? []).map((d: any) => ({ id: d.id, title: d.name, type: 'Document', href: '/app/assistant' }))),
        ...((cards.data ?? []).map((c: any) => ({ id: c.id, title: c.front, type: 'Flashcard', href: '/app/flashcards' }))),
        ...((quizzes.data ?? []).map((qz: any) => ({ id: qz.id, title: qz.topic, type: 'Quiz', href: '/app/quizzes' }))),
        ...((todos.data ?? []).map((t: any) => ({ id: t.id, title: t.title, type: 'To-Do', href: '/app/todos' }))),
        ...((goals.data ?? []).map((g: any) => ({ id: g.id, title: g.title, type: 'Goal', href: '/app/goals' }))),
      ];
      setResults(all.filter((r) => r.title.toLowerCase().includes(q)).slice(0, 12));
    })();
  }, [userId, query]);

  const typeIcon: Record<string, any> = {
    Project: KanbanSquare, Document: FileText, Flashcard: Layers, Quiz: GraduationCap, 'To-Do': CheckSquare, Goal: Target,
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-paper shadow-paper-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, documents, flashcards, tasks..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim() && results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No results found.</p>
          ) : !query.trim() ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Start typing to search across everything...</p>
          ) : (
            results.map((r) => {
              const Icon = typeIcon[r.type] ?? FileText;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => { router.push(r.href); setOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.type}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-bold">Esc</kbd> to close · <kbd className="rounded bg-muted px-1.5 py-0.5 font-bold">⌘K</kbd> to open
        </div>
      </div>
    </div>
  );
}
