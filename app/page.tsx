'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StickyNote, PaperCard, TornDivider, Mascot, ProgressBar } from '@/components/paper';
import {
  Sparkles, Brain, CalendarClock, KanbanSquare, GraduationCap, BarChart3,
  Trophy, Flame, BookOpen, MessageSquareText, Layers, Lightbulb, Check,
  ArrowRight, Star, PencilLine, Coffee, StickyNote as NoteIcon,
} from 'lucide-react';

const features = [
  { icon: Brain, tint: 'blue' as const, title: 'AI Study Assistant', desc: 'Upload PDFs, notes & slides, then chat with your documents. Summaries, explanations, and answers grounded in your material.' },
  { icon: KanbanSquare, tint: 'mint' as const, title: 'AI Project Manager', desc: 'Create assignments & capstones. AI breaks them into tasks, milestones, and a realistic weekly plan with risk detection.' },
  { icon: CalendarClock, tint: 'pink' as const, title: 'Smart Calendar', desc: 'Auto-schedules study sessions, revision, and breaks — and reorganises itself when deadlines shift.' },
  { icon: GraduationCap, tint: 'violet' as const, title: 'Quiz Generator', desc: 'MCQ, true/false, fill-in-the-blank, essay & coding questions in easy/medium/hard. Track every attempt.' },
  { icon: Layers, tint: 'yellow' as const, title: 'Smart Flashcards', desc: "Auto-generated cards with spaced repetition that adapts to what you remember — and what you don't." },
  { icon: BarChart3, tint: 'coral' as const, title: 'Analytics & Weak Topics', desc: 'Animated charts for study hours, quiz scores, and productivity. AI flags weak topics and builds a revision plan.' },
];

const steps = [
  { n: 1, title: 'Upload your material', desc: 'Drop in PDFs, slides, notes, or images. StudyFlow reads and organises everything.', icon: BookOpen, color: '#4F7DF3' },
  { n: 2, title: 'Let AI plan your week', desc: 'Projects get broken into tasks, milestones land on your calendar, and study sessions are scheduled around your deadlines.', icon: CalendarClock, color: '#06D6A0' },
  { n: 3, title: 'Study with your AI tutor', desc: 'Ask questions, generate quizzes & flashcards, and get plain-English explanations of tough concepts.', icon: MessageSquareText, color: '#6C63FF' },
  { n: 4, title: 'Track, level up, repeat', desc: 'Earn XP, unlock achievements, keep your streak alive, and watch your productivity score climb.', icon: Trophy, color: '#FFB703' },
];

const faqs = [
  { q: 'What can the AI Study Assistant do?', a: 'It reads your uploaded documents and lets you ask questions, request summaries, simplify difficult sections, and generate examples — all grounded in your own material so answers stay relevant to your course.' },
  { q: 'How does the project manager work?', a: 'You describe an assignment or capstone. The AI breaks it into a checklist of tasks, suggests milestones with target dates, estimates workload, predicts completion, and flags risks like unrealistic deadlines.' },
  { q: 'Is my data private?', a: 'Each student only sees their own documents, projects, and history. Row-level security keeps your data isolated, and nothing is shared with other users.' },
  { q: 'Can I use it for group projects?', a: 'Yes — projects support members, shared checklists, and group calendar events. The Team plan adds shared spaces and leaderboards for study groups.' },
  { q: 'Does the calendar really auto-reschedule?', a: 'When a deadline changes, StudyFlow reflows your study sessions, revision blocks, and breaks around the new date so your week always stays realistic.' },
  { q: 'Is there a dark mode?', a: 'Yes — a warm notebook dark mode comes built in, and your preference is remembered across sessions.' },
];

function Doodle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`pointer-events-none absolute opacity-90 ${className}`}>{children}</div>;
}

export default function LandingPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-paper-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              StudyFlow<span className="text-primary"> AI</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button size="sm" asChild>
              <Link href="/app">Start app</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 md:pt-24">
        {/* floating doodles */}
        <Doodle className="left-2 top-10 hidden md:block"><PencilLine className="h-8 w-8 text-primary-violet animate-float-slow" /></Doodle>
        <Doodle className="right-6 top-20 hidden md:block"><Star className="h-6 w-6 text-secondary fill-secondary animate-float" /></Doodle>
        <Doodle className="left-10 bottom-24 hidden lg:block"><Coffee className="h-9 w-9 text-coral animate-float-slow" /></Doodle>
        <Doodle className="right-12 bottom-10 hidden lg:block"><NoteIcon className="h-7 w-7 text-pink fill-pink/40 animate-float" /></Doodle>

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1 text-xs font-bold text-secondary-foreground shadow-paper-sm">
              <Sparkles className="h-3.5 w-3.5" /> Your AI-powered study companion
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              Study smarter,<br />
              <span className="doodle-underline">not harder.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              StudyFlow AI brings your documents, projects, calendar, quizzes, and analytics into one playful workspace — with an AI tutor that actually understands your course material.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/app">Start app <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {['#4F7DF3', '#06D6A0', '#F78FB3', '#FFB703'].map((c) => (
                  <span key={c} className="h-8 w-8 rounded-full border-2 border-background" style={{ background: c }} />
                ))}
              </div>
              <span><strong className="text-foreground">12,000+</strong> students studying better</span>
            </div>
          </div>

          {/* Hero illustration: stacked paper cards */}
          <div className="relative h-[380px] md:h-[440px]">
            <PaperCard className="absolute right-6 top-2 w-64 rotate-3 p-4" lift={false}>
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Flame className="h-4 w-4 text-coral" /> 7-day streak!
              </div>
              <ProgressBar value={72} className="mt-3" color="#FF7F50" />
              <p className="mt-2 text-xs text-muted-foreground">72% to your weekly goal</p>
            </PaperCard>

            <StickyNote tint="yellow" rotate={-5} className="absolute left-2 top-24 w-52 p-4" lift>
              <div className="text-xs font-bold uppercase tracking-wide text-coral">Today</div>
              <div className="mt-1 text-sm font-semibold">Biology revision — Chapter 4</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-accent" /> 3 of 5 tasks done
              </div>
            </StickyNote>

            <PaperCard className="absolute bottom-4 left-10 w-72 -rotate-3 p-4" lift={false}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-violet">Quiz: Cell Biology</span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">88%</span>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1">
                {[1,1,1,1,0].map((v,i)=>(<span key={i} className={`h-2 rounded-full ${v?'bg-accent':'bg-muted'}`} />))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Weak topic: Mitosis stages</p>
            </PaperCard>

            <div className="absolute bottom-0 right-0">
              <Mascot mood="wave" size={130} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Features (sticky notes) ===== */}
      <section id="features" className="relative mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">Everything in one notebook</h2>
          <p className="mt-3 text-muted-foreground">Six colourful sticky-note modules that work together.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <StickyNote
              key={f.title}
              tint={f.tint}
              rotate={i % 2 === 0 ? -1.5 : 1.5}
              tapeColor={f.tint === 'yellow' ? 'pink' : 'yellow'}
              className="h-full"
            >
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-card/70 shadow-paper-sm">
                <f.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </StickyNote>
          ))}
        </div>
      </section>

      <TornDivider />

      {/* ===== How it works timeline ===== */}
      <section id="how" className="relative mx-auto max-w-5xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">From upload to unstoppable in four steps.</p>
        </div>
        <div className="relative">
          {/* hand-drawn connecting line */}
          <svg className="absolute left-6 top-4 hidden h-[calc(100%-2rem)] w-2 md:block" viewBox="0 0 8 600" preserveAspectRatio="none" aria-hidden>
            <path d="M4 0 C 0 100, 8 200, 4 300 S 0 500, 4 600" stroke="#4F7DF3" strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round" fill="none" />
          </svg>
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.n} className="relative flex items-start gap-5 pl-0 md:pl-10">
                <div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-background text-white shadow-paper" style={{ background: s.color }}>
                  <s.icon className="h-5 w-5" />
                </div>
                <PaperCard className="flex-1 p-5">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide" style={{ color: s.color }}>Step {s.n}</span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </PaperCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="relative mx-auto max-w-3xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">Questions?</h2>
          <p className="mt-3 text-muted-foreground">We've got answers, pinned on cards.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border border-border bg-paper p-5 shadow-paper-sm transition-all hover:shadow-paper open:ring-2 open:ring-primary/30">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display font-bold">
                {f.q}
                <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-paper-lg md:p-16">
          <Doodle className="left-6 top-6"><Star className="h-6 w-6 fill-white/40 text-white/60" /></Doodle>
          <Doodle className="right-8 bottom-8"><Lightbulb className="h-8 w-8 text-white/50" /></Doodle>
          <Mascot mood="celebrate" size={90} className="mx-auto mb-4" />
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">Start studying smarter today</h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">Join thousands of students using AI to plan, study, and stay motivated.</p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link href="/app">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display font-bold text-foreground">StudyFlow AI</span>
          </div>
          <p>Made with pencils, sticky notes, and a lot of coffee.</p>
          <p>© {new Date().getFullYear()} StudyFlow AI</p>
        </div>
      </footer>
    </div>
  );
}
