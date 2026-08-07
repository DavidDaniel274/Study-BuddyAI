'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap, Plus, Loader2, Sparkles, ArrowRight, Trophy, Check, X, RotateCw, Brain,
} from 'lucide-react';
import { PaperCard, StickyNote, EmptyState, ProgressBar, Mascot, Confetti } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, genId, nowIso } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { generateQuiz, QuizQuestion } from '@/lib/ai';
import { awardXp, logActivity, checkAchievements, pushNotification } from '@/lib/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Quiz = { id: string; title: string; topic: string; difficulty: string; question_count: number; created_at: string };

const diffColor: Record<string, string> = { easy: '#06D6A0', medium: '#FFB703', hard: '#FF7F50' };

export default function QuizzesPage() {
  const { userId } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ topic: '', difficulty: 'medium', count: '5' });
  const [active, setActive] = useState<{ quiz: Quiz; questions: QuizQuestion[] } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('quizzes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setQuizzes((data ?? []) as Quiz[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!userId || !form.topic.trim()) return;
    setCreating(true);
    const questions = generateQuiz(form.topic, form.difficulty, parseInt(form.count, 10));
    const { data, error } = await store.from('quizzes').insert({
      id: genId(),
      user_id: userId,
      title: `Quiz: ${form.topic}`,
      topic: form.topic,
      difficulty: form.difficulty,
      question_count: questions.length,
      created_at: nowIso(),
    });
    if (error) { setCreating(false); toast.error(error.message); return; }
    await store.from('quiz_questions').insert(
      questions.map((q) => ({
        id: genId(),
        quiz_id: (data as Quiz).id,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        created_at: nowIso(),
      }))
    );
    await awardXp(userId, 15, 'Generated a quiz', 'quiz');
    await logActivity(userId, 'generated quiz on', form.topic);
    setCreating(false);
    toast.success('Quiz generated! +15 XP');
    setOpen(false);
    setForm({ topic: '', difficulty: 'medium', count: '5' });
    load();
  };

  const startQuiz = async (q: Quiz) => {
    const { data } = await store.from('quiz_questions').select('*').eq('quiz_id', q.id).order('created_at');
    const questions: QuizQuestion[] = (data ?? []).map((r: any) => ({
      type: r.type, prompt: r.prompt, options: r.options, answer: r.answer, explanation: r.explanation,
    }));
    setActive({ quiz: q, questions });
  };

  if (active) return <QuizRunner quiz={active.quiz} questions={active.questions} onExit={() => { setActive(null); load(); }} />;

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Quizzes</h1>
          <p className="text-sm text-muted-foreground">Generate quizzes on any topic. MCQ, true/false & fill-in-the-blank.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Generate quiz</Button></DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-display text-xl">Generate a quiz</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Cell biology, Sorting algorithms" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Questions</Label>
                  <Select value={form.count} onValueChange={(v) => setForm({ ...form, count: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
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

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No quizzes yet" description="Generate your first quiz on any topic — AI creates the questions instantly." action={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Generate a quiz</Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q, i) => (
            <StickyNote key={q.id} tint={i % 3 === 0 ? 'violet' : i % 3 === 1 ? 'pink' : 'yellow'} rotate={i % 2 ? 1 : -1}>
              <div className="flex items-start justify-between">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold capitalize text-white" style={{ background: diffColor[q.difficulty] }}>{q.difficulty}</span>
                <span className="text-xs font-semibold text-muted-foreground">{q.question_count} Q</span>
              </div>
              <h3 className="mt-2 font-display text-base font-bold">{q.topic}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
              <Button size="sm" className="mt-4 w-full" onClick={() => startQuiz(q)}>Start quiz <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
            </StickyNote>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizRunner({ quiz, questions, onExit }: { quiz: Quiz; questions: QuizQuestion[]; onExit: () => void }) {
  const { userId } = useUser();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confetti, setConfetti] = useState(0);

  const q = questions[idx];
  const total = questions.length;
  const score = questions.reduce((s, question, i) => s + (answers[i]?.trim().toLowerCase() === question.answer.trim().toLowerCase() ? 1 : 0), 0);

  const finish = async () => {
    setSubmitted(true);
    if (!userId) return;
    const { error } = await store.from('quiz_attempts').insert({
      id: genId(), user_id: userId, quiz_id: quiz.id, score, total, answers, completed_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    await awardXp(userId, 20 + score * 5, `Quiz: ${score}/${total}`, 'quiz');
    await logActivity(userId, 'completed quiz', quiz.topic);
    const { data: attempts } = await store.from('quiz_attempts').select('id').eq('user_id', userId);
    await checkAchievements(userId, { quizzes: (attempts ?? []).length, xp_total: await getTotalXp(userId) });
    await pushNotification(userId, 'xp', `+${20 + score * 5} XP`, `You scored ${score}/${total} on ${quiz.topic}`, '/app/quizzes');
    if (score === total) { setConfetti((c) => c + 1); toast.success('Perfect score!'); }
    else toast.success(`Quiz done! ${score}/${total}`);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <Confetti fire={confetti} />
        <PaperCard className="mx-auto max-w-lg p-8 text-center" lift={false}>
          <Mascot mood={score === total ? 'celebrate' : 'happy'} size={120} className="mx-auto" />
          <h2 className="mt-4 font-display text-2xl font-extrabold">{score}/{total}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{score === total ? 'Perfect score! You crushed it.' : score >= total / 2 ? 'Nice work! Review the misses below.' : "Keep practicing — you'll get there."}</p>
          <div className="mt-4"><ProgressBar value={(score / total) * 100} height={12} color={diffColor[quiz.difficulty]} /></div>
          <div className="mt-6 space-y-3 text-left">
            {questions.map((question, i) => {
              const correct = answers[i]?.trim().toLowerCase() === question.answer.trim().toLowerCase();
              return (
                <div key={i} className={cn('rounded-xl border p-3', correct ? 'border-accent/30 bg-accent/5' : 'border-error/30 bg-error/5')}>
                  <div className="flex items-start gap-2">
                    {correct ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-error" />}
                    <div className="text-sm">
                      <p className="font-semibold">{question.prompt}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Your answer: {answers[i] || '(skipped)'}</p>
                      {!correct && <p className="text-xs font-semibold text-accent">Correct: {question.answer}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{question.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onExit}>Back to quizzes</Button>
            <Button className="flex-1" onClick={() => { setIdx(0); setAnswers({}); setSubmitted(false); }}><RotateCw className="mr-1 h-4 w-4" /> Retry</Button>
          </div>
        </PaperCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold">{quiz.topic}</h1>
          <p className="text-sm text-muted-foreground">Question {idx + 1} of {total}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
      </div>
      <ProgressBar value={((idx + 1) / total) * 100} height={8} color={diffColor[quiz.difficulty]} />

      <PaperCard className="p-6" lift={false}>
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-primary-violet/15 px-2 py-0.5 text-[11px] font-bold capitalize text-primary-violet">{q.type}</span>
        </div>
        <h2 className="font-display text-lg font-bold">{q.prompt}</h2>

        <div className="mt-5 space-y-2">
          {q.type === 'fillblank' ? (
            <Input value={answers[idx] ?? ''} onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })} placeholder="Type your answer..." />
          ) : q.options ? (
            q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setAnswers({ ...answers, [idx]: opt })}
                className={cn('flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm font-medium transition-all hover:-translate-y-0.5', answers[idx] === opt ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40')}
              >
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', answers[idx] === opt ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
                  {answers[idx] === opt && <Check className="h-3 w-3" />}
                </span>
                {opt}
              </button>
            ))
          ) : null}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</Button>
          {idx < total - 1 ? (
            <Button onClick={() => setIdx(idx + 1)}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
          ) : (
            <Button variant="accent" onClick={finish}><Trophy className="mr-1 h-4 w-4" /> Finish</Button>
          )}
        </div>
      </PaperCard>
    </div>
  );
}

async function getTotalXp(uid: string) {
  const { data } = await store.from('xp_log').select('amount').eq('user_id', uid);
  return ((data ?? []) as { amount: number }[]).reduce((s: number, r) => s + (r.amount || 0), 0);
}
