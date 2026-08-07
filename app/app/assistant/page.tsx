'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Brain, Upload, FileText, Loader2, Send, Trash2, Sparkles, File, X, Link as LinkIcon,
} from 'lucide-react';
import { PaperCard, StickyNote, EmptyState, Mascot } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { store, genId, nowIso } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { generateAssistantReply, runAiTool, AI_TOOLS, AiTool } from '@/lib/ai';
import { awardXp, logActivity, checkAchievements } from '@/lib/gamification';
import { extractDocument, extractUrlContent } from '@/lib/document-extraction';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Doc = { id: string; name: string; type: string; size_bytes: number; content: string; summary: string | null; pages?: number; created_at: string };
type Msg = { id: string; role: string; content: string; created_at: string };

export default function AssistantPage() {
  const { userId } = useUser();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [extractingUrl, setExtractingUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTool, setActiveTool] = useState<AiTool | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadDocs = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setDocs((data ?? []) as Doc[]);
  }, [userId]);

  const loadMessages = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(50);
    setMessages((data ?? []) as Msg[]);
  }, [userId]);

  useEffect(() => { loadDocs(); loadMessages(); }, [loadDocs, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const extracted = await extractDocument(file);
      const { data, error } = await store.from('documents').insert({
        id: genId(),
        user_id: userId,
        name: extracted.name,
        type: extracted.type,
        size_bytes: extracted.sizeBytes,
        content: extracted.content,
        pages: extracted.pages,
        created_at: nowIso(),
      });
      if (error) { toast.error(error.message); return; }
      await awardXp(userId, 10, 'Uploaded a document', 'document');
      await logActivity(userId, 'uploaded', extracted.name);
      toast.success(extracted.content.startsWith('[Error') ? 'Document uploaded (limited text)' : 'Document uploaded! +10 XP');
      loadDocs();
      if (data) setActiveDoc(data as Doc);
    } catch (err: any) {
      toast.error(`Failed to read file: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onUrlExtract = async () => {
    if (!urlInput.trim() || !userId) return;
    setExtractingUrl(true);
    try {
      const extracted = await extractUrlContent(urlInput.trim());
      const { data, error } = await store.from('documents').insert({
        id: genId(),
        user_id: userId,
        name: extracted.name,
        type: 'url',
        size_bytes: extracted.sizeBytes,
        content: extracted.content,
        pages: extracted.pages,
        created_at: nowIso(),
      });
      if (error) { toast.error(error.message); return; }
      await awardXp(userId, 10, 'Added a link', 'document');
      await logActivity(userId, 'linked', extracted.name);
      toast.success('Page content extracted! +10 XP');
      loadDocs();
      if (data) setActiveDoc(data as Doc);
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err: any) {
      toast.error(`Failed to extract URL: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setExtractingUrl(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !userId) return;
    const question = input.trim();
    setInput('');
    setSending(true);
    // save user message
    const { data: userMsg } = await store.from('chat_messages').insert({
      id: genId(), user_id: userId, role: 'user', content: question, document_id: activeDoc?.id ?? null, created_at: nowIso(),
    });
    if (userMsg) setMessages((prev) => [...prev, userMsg as Msg]);

    // generate reply
    // generate reply — use AI tool if one is active, otherwise general chat
    const reply = activeTool
      ? runAiTool(activeTool, question, activeDoc?.content ?? null)
      : generateAssistantReply(question, activeDoc?.content ?? null);
    const { data: aiMsg } = await store.from('chat_messages').insert({
      id: genId(), user_id: userId, role: 'assistant', content: reply, created_at: nowIso(),
    });
    if (aiMsg) setMessages((prev) => [...prev, aiMsg as Msg]);

    await awardXp(userId, 5, 'Asked the AI tutor', 'chat');
    setSending(false);
  };

  const deleteDoc = async (d: Doc) => {
    await store.from('documents').delete().eq('id', d.id);
    if (activeDoc?.id === d.id) setActiveDoc(null);
    loadDocs();
    toast.success('Document removed');
  };

  const suggested = ['Summarise this document', 'Explain the main concept simply', 'Give me 3 examples', 'What should I study first?'];

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div>
        <h1 className="font-display text-2xl font-extrabold">AI Study Assistant</h1>
        <p className="text-sm text-muted-foreground">Upload documents and chat with your material. Summaries, explanations, examples — grounded in what you upload.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Document sidebar */}
        <div className="space-y-4">
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv,.json,.html,.htm,.rtf,.log,.text" onChange={onUpload} className="hidden" />
          <PaperCard className="p-4" lift={false}>
            <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading || extractingUrl}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              {uploading ? 'Extracting text...' : 'Upload document'}
            </Button>
            <button
              onClick={() => setShowUrlInput((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              <LinkIcon className="h-3.5 w-3.5" /> Add from URL
            </button>
            {showUrlInput && (
              <div className="mt-2 flex gap-1.5">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onUrlExtract(); } }}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                />
                <Button size="sm" onClick={onUrlExtract} disabled={extractingUrl || !urlInput.trim()} className="h-8 px-2">
                  {extractingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Go'}
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">PDF, TXT, MD, HTML, or paste a URL. I read the full text — no guessing.</p>
          </PaperCard>

          <PaperCard className="p-4" lift={false}>
            <h3 className="mb-3 font-display text-sm font-bold">Your documents</h3>
            {docs.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No documents yet.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className={cn('group flex items-center gap-2 rounded-xl border p-2.5 transition-all', activeDoc?.id === d.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:shadow-paper-sm')}>
                    <button onClick={() => setActiveDoc(activeDoc?.id === d.id ? null : d)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{d.name}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">{d.type}</p>
                      </div>
                    </button>
                    <button onClick={() => deleteDoc(d)} className="opacity-0 transition-opacity group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-error" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PaperCard>
        </div>

        {/* Chat area */}
        <PaperCard className="flex h-[600px] flex-col p-0" lift={false}>
          {activeDoc && (
            <div className="flex items-center justify-between border-b border-border/60 bg-primary/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-primary" />
                <span className="truncate text-sm font-semibold">{activeDoc.name}</span>
              </div>
              <button onClick={() => setActiveDoc(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Mascot mood="wave" size={100} />
                <h3 className="mt-4 font-display text-lg font-bold">Hi! I'm your AI tutor.</h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">{activeDoc ? `Ask me anything about "${activeDoc.name}".` : 'Upload a document to chat with it, or ask me a general study question.'}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggested.map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="rounded-full border border-border bg-paper px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-primary-violet text-white' : 'bg-primary text-primary-foreground')}>
                    {m.role === 'user' ? <span className="text-xs font-bold">You</span> : <Brain className="h-4 w-4" />}
                  </div>
                  <div className={cn('max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm', m.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted/60 text-foreground')}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Brain className="h-4 w-4" /></div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3">
                  <span className="h-2 w-2 animate-soft-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-soft-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-soft-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/60 p-3">
            {/* AI tools toolbar */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {AI_TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTool(t.id); setInput(activeDoc ? activeDoc.name : ''); }}
                  className={cn('rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all hover:-translate-y-0.5', activeTool === t.id ? 'bg-primary text-primary-foreground shadow-paper-sm' : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary')}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {activeTool && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-primary">AI Tool: {AI_TOOLS.find((t) => t.id === activeTool)?.label}</span>
                <span className="text-muted-foreground">— {AI_TOOLS.find((t) => t.id === activeTool)?.desc}</span>
                <button onClick={() => setActiveTool(null)} className="ml-auto"><X className="h-3 w-3" /></button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask a question..."
                rows={1}
                className="min-h-[44px] resize-none"
              />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-11">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </PaperCard>
      </div>
    </div>
  );
}
