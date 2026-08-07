'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Layers, Plus, Loader2, Sparkles, RotateCw, Check, X, Brain, ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import { PaperCard, StickyNote, EmptyState, Mascot } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, genId, nowIso } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { generateFlashcards } from '@/lib/ai';
import { awardXp, logActivity, checkAchievements } from '@/lib/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Card = { id: string; deck: string; front: string; back: string; ease: number; interval: number; reps: number; lapses: number; due: string };

export default function FlashcardsPage() {
  const { userId } = useUser();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ topic: '', deck: 'General', count: '8' });
  const [reviewing, setReviewing] = useState<Card[] | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('flashcards').select('*').eq('user_id', userId).order('due', { ascending: true });
    setCards((data ?? []) as Card[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const decks = Array.from(new Set(cards.map((c) => c.deck)));
  const dueCount = cards.filter((c) => new Date(c.due) <= new Date()).length;

  const create = async () => {
    if (!userId || !form.topic.trim()) return;
    setCreating(true);
    const generated = generateFlashcards(form.topic, parseInt(form.count, 10));
    await store.from('flashcards').insert(
      generated.map((c) => ({ id: genId(), user_id: userId, deck: form.deck, front: c.front, back: c.back, created_at: nowIso(), due: nowIso() }))
    );
    await awardXp(userId, 15, 'Generated flashcards', 'flashcard');
    await logActivity(userId, 'generated flashcards on', form.topic);
    setCreating(false);
    toast.success(`${generated.length} cards generated! +15 XP`);
    setOpen(false);
    setForm({ topic: '', deck: 'General', count: '8' });
    load();
  };

  const startReview = (deck?: string) => {
    const due = cards.filter((c) => new Date(c.due) <= new Date() && (!deck || c.deck === deck));
    if (due.length === 0) { toast.info('No cards due in this deck!'); return; }
    setReviewing(due);
  };

  if (reviewing) return <ReviewSession cards={reviewing} onExit={() => { setReviewing(null); load(); }} />;

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Flashcards</h1>
          <p className="text-sm text-muted-foreground">Auto-generated cards with spaced repetition that adapts to you.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Generate deck</Button></DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-display text-xl">Generate flashcards</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. French verbs, Organic chemistry" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deck name</Label>
                  <Input value={form.deck} onChange={(e) => setForm({ ...form, deck: e.target.value })} placeholder="General" />
                </div>
                <div className="space-y-1.5">
                  <Label>Card count</Label>
                  <Select value={form.count} onValueChange={(v) => setForm({ ...form, count: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating || !form.topic.trim()}>
                {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                {creating ? 'Generating...' : 'Generate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Due banner */}
      {dueCount > 0 && (
        <StickyNote tint="coral" rotate={-1}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mascot mood="wave" size={48} float={false} />
              <div>
                <p className="font-display text-base font-bold">{dueCount} card{dueCount > 1 ? 's' : ''} due for review</p>
                <p className="text-xs text-muted-foreground">Keep your streak and memory sharp!</p>
              </div>
            </div>
            <Button onClick={() => startReview()}>Review now</Button>
          </div>
        </StickyNote>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : cards.length === 0 ? (
        <EmptyState icon={Layers} title="No flashcards yet" description="Generate a deck on any topic — AI creates the cards and spaced repetition handles the rest." action={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Generate a deck</Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck, i) => {
            const deckCards = cards.filter((c) => c.deck === deck);
            const deckDue = deckCards.filter((c) => new Date(c.due) <= new Date()).length;
            return (
              <StickyNote key={deck} tint={i % 3 === 0 ? 'mint' : i % 3 === 1 ? 'blue' : 'yellow'} rotate={i % 2 ? 1 : -1}>
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-base font-bold">{deck}</h3>
                  <Badge variant="outline">{deckCards.length}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{deckDue} due now</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => startReview(deck)} disabled={deckDue === 0}>
                    Review {deckDue > 0 && `(${deckDue})`}
                  </Button>
                </div>
              </StickyNote>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewSession({ cards, onExit }: { cards: Card[]; onExit: () => void }) {
  const { userId } = useUser();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const grade = async (quality: 'again' | 'hard' | 'good' | 'easy') => {
    const card = cards[idx];
    let { ease, interval, reps, lapses } = card;
    if (quality === 'again') { reps = 0; lapses += 1; interval = 1; ease = Math.max(1.3, ease - 0.2); }
    else {
      reps += 1;
      if (quality === 'hard') { interval = Math.max(1, interval); ease = Math.max(1.3, ease - 0.15); }
      else if (quality === 'good') { interval = reps === 1 ? 1 : Math.round(interval * ease); ease = ease + 0.1; }
      else { interval = reps === 1 ? 2 : Math.round(interval * ease * 1.3); ease = ease + 0.15; }
    }
    const due = new Date(Date.now() + interval * 86400000).toISOString();
    await store.from('flashcards').update({ ease, interval, reps, lapses, due }).eq('id', card.id);
    if (userId) {
      await awardXp(userId, 3, 'Reviewed a card', 'flashcard');
      await logActivity(userId, 'reviewed card', card.front.slice(0, 30));
    }
    const next = idx + 1;
    setDone(next);
    if (next >= cards.length) {
      if (userId) checkAchievements(userId, { flashcards: done + 1 });
      toast.success(`Review done! ${cards.length} cards. +${cards.length * 3} XP`);
      onExit();
    } else {
      setIdx(next);
      setFlipped(false);
    }
  };

  const card = cards[idx];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold">Review · {card.deck}</h1>
          <p className="text-sm text-muted-foreground">Card {idx + 1} of {cards.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${((idx + 1) / cards.length) * 100}%` }} />
      </div>

      {/* Flip card */}
      <div className="[perspective:1200px]">
        <button
          onClick={() => setFlipped(!flipped)}
          className="relative block h-72 w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : undefined }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-paper-cream p-6 shadow-paper [backface-visibility:hidden]">
            <span className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Question</span>
            <p className="text-center font-display text-lg font-bold">{card.front}</p>
            <span className="absolute bottom-4 text-xs text-muted-foreground">Click to flip</span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 shadow-paper [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">Answer</span>
            <p className="text-center text-base font-medium">{card.back}</p>
            <span className="absolute bottom-4 text-xs text-muted-foreground">Click to flip back</span>
          </div>
        </button>
      </div>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          <Button variant="destructive" onClick={() => grade('again')}>Again</Button>
          <Button variant="outline" onClick={() => grade('hard')}>Hard</Button>
          <Button variant="outline" onClick={() => grade('good')}>Good</Button>
          <Button variant="accent" onClick={() => grade('easy')}>Easy</Button>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setFlipped(true)}>Show answer</Button>
      )}
    </div>
  );
}
