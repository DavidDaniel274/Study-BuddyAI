// AI generation utilities for StudyFlow.
// Includes: scope guard (only study-related topics), document-aware quiz/notes/flashcard generation,
// and assistant reply logic that grounds answers in uploaded document content.

export type TaskSuggestion = { title: string; est_minutes: number; due_offset_days: number };
export type MilestoneSuggestion = { title: string; target_offset_days: number };

export type ScheduledTask = {
  title: string;
  est_minutes: number;
  date: string;
  start_time: string;
  end_time: string;
};

export type ProjectPlan = {
  tasks: TaskSuggestion[];
  milestones: MilestoneSuggestion[];
  predicted_days: number;
  weekly_goal: string;
  risk: string;
  risks: string[];
};

// ─── Scope Guard ────────────────────────────────────────────────────────────
// The AI tutor ONLY answers study/academic questions. If a question is clearly
// off-topic (recipes, weather, entertainment, etc.) it politely declines.
// If the question relates to academics even tangentially (cooking practical,
// business case study, etc.) it assists.

const OFF_TOPIC_PATTERNS = [
  /\b(recipe|recipes|cook|cooking|bake|baking)\b(?!\s*(?:practical|class|exam|assignment|project|study|test))/i,
  /\b(weather|temperature outside|forecast)\b/i,
  /\b(movie|movies|film|films|tv show|netflix|spotify)\b/i,
  /\b(joke|funny story|make me laugh)\b/i,
  /\b(football|basketball|baseball|soccer match|cricket score)\b/i,
  /\b(dating|relationship advice|my boyfriend|my girlfriend)\b/i,
  /\b(stock market|crypto|bitcoin|investment advice)\b/i,
  /\b(horoscope|astrology|zodiac)\b/i,
  /\b(news today|current events|politics)\b/i,
  /\b(google it|search the web)\b/i,
  /\b(write me a song|write a poem|write a story)\b/i,
];

const STUDY_CONTEXT_PATTERNS = [
  /\b(study|learn|exam|test|quiz|assignment|project|homework|revision|notes?|flashcard|essay|report|research|thesis|dissertation|presentation|practical|lab|tutorial|lecture|seminar|course|module|syllabus|curriculum|grade|grading|rubric|deadline|due date|submission)\b/i,
  /\b(explain|summar(i[sz]e|y)|analy[sz]e|compare|contrast|define|describ|outlin|review)\b/i,
  /\b(textbook|chapter|reading|passage|article|paper|journal|source|citation|reference|bibliography)\b/i,
  /\b(math|calculus|algebra|geometry|statistics|physics|chemistry|biology|history|literature|philosophy|economics|psychology|sociology|engineering|programming|computer science)\b/i,
  /\b(cooking practical|food tech|culinary arts?|nutrition|food science|hospitality)\b/i,
  /\b(business (case|plan|study)|marketing|accounting|finance|management)\b/i,
  /\b(help me (understand|prepare|study|learn|practice))\b/i,
  /\b(what (is|are) |how (do|does|can) |why (is|does|do) )/i,
];

export function isOffTopic(question: string): boolean {
  const q = question.toLowerCase();
  // Check explicit off-topic patterns
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(q)) {
      // But allow if there's clear study context
      for (const studyPattern of STUDY_CONTEXT_PATTERNS) {
        if (studyPattern.test(q)) return false;
      }
      return true;
    }
  }
  return false;
}

export function scopeGuardReply(): string {
  return "I'm your AI study tutor, so I can only help with academic and study-related questions — things like understanding concepts, summarising documents, preparing for exams, planning assignments, or practising with quizzes.\n\nIf your question is about a class, subject, or study topic, feel free to ask! For everything else, you might want to use a general assistant.";
}

// ─── Content Analysis Utilities ─────────────────────────────────────────────

// Split document content into meaningful sentences
function splitSentences(content: string): string[] {
  return content
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 400);
}

// Extract key terms (words appearing frequently, excluding common words)
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'it', 'its', 'they', 'them', 'their', 'there', 'here', 'where', 'when', 'why', 'how', 'what', 'which',
  'who', 'whom', 'whose', 'if', 'then', 'else', 'also', 'such', 'than', 'too', 'very', 'just', 'only',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
  'over', 'under', 'again', 'further', 'once', 'as', 'not', 'no', 'nor', 'so', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'same', 'own', 'my', 'your', 'his', 'her', 'we',
  'you', 'he', 'she', 'me', 'him', 'us', 'am', 'because', 'while', 'whereas', 'however', 'therefore',
  'thus', 'hence', 'since', 'though', 'although', 'within', 'without', 'upon', 'among', 'between',
]);

function extractKeyTerms(content: string, maxCount = 15): string[] {
  const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map((entry) => entry[0]);
}

// ─── Personalized Schedule / Project Plan Generation ──────────────────────
// Analyzes the user's actual title + description to extract:
// - Subject area (math, biology, programming, etc.)
// - Deliverable type (essay, report, presentation, code, poster, etc.)
// - Specific keywords that map to concrete sub-tasks
// - Complexity signals (word count, chapters, data, experiments)
// Then builds a plan where every task references the actual project content.

type SubjectArea = {
  id: string;
  label: string;
  keywords: string[];
  researchTerms: string[];
};

const SUBJECT_AREAS: SubjectArea[] = [
  { id: 'cs', label: 'Computer Science / Programming', keywords: ['code', 'coding', 'program', 'programming', 'algorithm', 'software', 'app', 'application', 'api', 'database', 'python', 'java', 'javascript', 'react', 'node', 'sql', 'html', 'css', 'compiler', 'data structure', 'machine learning', 'ai', 'neural network', 'deep learning'], researchTerms: ['architecture', 'design pattern', 'testing', 'deployment', 'optimization', 'complexity'] },
  { id: 'math', label: 'Mathematics', keywords: ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'probability', 'theorem', 'proof', 'equation', 'differential', 'integral', 'matrix', 'vector', 'linear', 'trigonometry', 'topology', 'number theory'], researchTerms: ['derivation', 'lemma', 'corollary', 'axiom', 'conjecture'] },
  { id: 'physics', label: 'Physics', keywords: ['physics', 'quantum', 'mechanics', 'thermodynamics', 'electromagnetism', 'relativity', 'optics', 'kinematics', 'force', 'energy', 'momentum', 'wave', 'particle', 'field'], researchTerms: ['experiment', 'measurement', 'uncertainty', 'simulation'] },
  { id: 'chem', label: 'Chemistry', keywords: ['chemistry', 'chemical', 'molecule', 'reaction', 'compound', 'organic', 'inorganic', 'polymer', 'catalyst', 'bond', 'acid', 'base', 'oxidation', 'reduction', 'synthesis', 'titration', 'spectroscopy'], researchTerms: ['procedure', 'lab report', 'safety', 'analysis'] },
  { id: 'bio', label: 'Biology', keywords: ['biology', 'cell', 'dna', 'rna', 'protein', 'gene', 'genetics', 'evolution', 'ecology', 'organism', 'enzyme', 'membrane', 'photosynthesis', 'mitosis', 'meiosis', 'taxonomy', 'anatomy', 'physiology'], researchTerms: ['hypothesis', 'specimen', 'staining', 'microscopy', 'dissection'] },
  { id: 'lit', label: 'Literature / English', keywords: ['essay', 'literature', 'novel', 'poem', 'poetry', 'shakespeare', 'narrative', 'theme', 'character', 'metaphor', 'symbolism', 'analysis', 'critique', 'rhetoric', 'sonnet', 'prose', 'drama', 'author'], researchTerms: ['close reading', 'citation', 'thesis statement', 'draft'] },
  { id: 'history', label: 'History / Humanities', keywords: ['history', 'historical', 'war', 'revolution', 'empire', 'colonial', 'ancient', 'medieval', 'renaissance', 'civilization', 'archaeology', 'document', 'primary source', 'timeline', 'century'], researchTerms: ['archive', 'source analysis', 'historiography', 'citation'] },
  { id: 'econ', label: 'Economics / Business', keywords: ['economics', 'economy', 'market', 'business', 'finance', 'accounting', 'supply', 'demand', 'gdp', 'inflation', 'trade', 'investment', 'marketing', 'strategy', 'case study', 'startup', 'revenue', 'profit'], researchTerms: ['data analysis', 'forecast', 'financial model', 'stakeholder'] },
  { id: 'psych', label: 'Psychology / Sociology', keywords: ['psychology', 'sociology', 'behavior', 'behaviour', 'cognitive', 'social', 'developmental', 'perception', 'memory', 'learning', 'personality', 'disorder', 'therapy', 'culture', 'group dynamics', 'survey', 'interview'], researchTerms: ['literature review', 'participant', 'ethics approval', 'data collection', 'SPSS'] },
  { id: 'eng', label: 'Engineering', keywords: ['engineering', 'circuit', 'mechanical', 'electrical', 'civil', 'structural', 'thermodynamic', 'control system', 'cad', 'robotics', 'arduino', 'sensor', 'actuator', 'motor', 'blueprint', 'specification'], researchTerms: ['design spec', 'prototype', 'testing', 'calibration', 'feasibility'] },
  { id: 'med', label: 'Medical / Health', keywords: ['medical', 'medicine', 'clinical', 'patient', 'diagnosis', 'treatment', 'anatomy', 'pharmacology', 'pathology', 'nursing', 'public health', 'epidemiology', 'disease', 'symptom'], researchTerms: ['case study', 'literature review', 'ethics', 'clinical guideline'] },
  { id: 'art', label: 'Art / Design', keywords: ['art', 'design', 'painting', 'drawing', 'sculpture', 'portfolio', 'creative', 'illustration', 'typography', 'branding', 'ux', 'ui', 'graphic', 'photography', 'exhibition'], researchTerms: ['concept sketch', 'critique', 'iteration', 'final piece', 'presentation'] },
];

type DeliverableType = {
  id: string;
  label: string;
  keywords: string[];
  phases: string[];
};

const DELIVERABLES: DeliverableType[] = [
  { id: 'essay', label: 'Essay', keywords: ['essay', 'paper', 'argument', 'thesis', 'persuasive', 'analytical'], phases: ['Analyse the prompt & identify key arguments', 'Research evidence for each argument', 'Write thesis statement & outline', 'Draft body paragraphs with evidence', 'Write introduction & conclusion', 'Revise for clarity & flow', 'Final proofread & format citations'] },
  { id: 'report', label: 'Report', keywords: ['report', 'lab report', 'technical report', 'case study', 'feasibility'], phases: ['Review report structure & requirements', 'Collect data / conduct experiment', 'Analyse results & create charts/tables', 'Write methodology & findings sections', 'Draft discussion & recommendations', 'Format references & appendices', 'Final review & submit'] },
  { id: 'presentation', label: 'Presentation', keywords: ['presentation', 'slides', 'powerpoint', 'talk', 'pitch', 'keynote', 'demo'], phases: ['Define key message & audience takeaways', 'Research content & gather visuals', 'Create slide outline (story arc)', 'Design slides with visuals & minimal text', 'Write speaker notes for each slide', 'Rehearse with timer & get feedback', 'Final polish & practice delivery'] },
  { id: 'code', label: 'Code / Software', keywords: ['code', 'build', 'develop', 'app', 'program', 'software', 'prototype', 'implementation', 'system'], phases: ['Define requirements & user stories', 'Design architecture & choose tech stack', 'Set up project structure & environment', 'Implement core feature (MVP)', 'Implement secondary features', 'Write tests & debug', 'Documentation & deployment prep'] },
  { id: 'poster', label: 'Poster / Visual', keywords: ['poster', 'infographic', 'display', 'exhibit', 'visual presentation'], phases: ['Define key message & target audience', 'Research & organize content sections', 'Sketch layout & visual hierarchy', 'Create digital design (Canva/Illustrator)', 'Add data visualizations & charts', 'Review for clarity & readability', 'Print-ready export & final check'] },
  { id: 'research', label: 'Research Paper', keywords: ['research', 'study', 'investigation', 'dissertation', 'thesis', 'systematic review', 'meta-analysis'], phases: ['Define research question & scope', 'Literature review — find 10-15 sources', 'Read & annotate key sources', 'Design methodology & data collection', 'Collect & analyse data', 'Write results & discussion', 'Format citations & final proofread'] },
  { id: 'exam', label: 'Exam Prep', keywords: ['exam', 'test', 'midterm', 'final', 'revision', 'mock'], phases: ['Review syllabus & identify weak areas', 'Create study schedule by topic', 'Study topic 1: notes + practice problems', 'Study topic 2: notes + practice problems', 'Study remaining topics + past papers', 'Take full mock exam under timed conditions', 'Review mistakes & final consolidation'] },
];

type ProjectAnalysis = {
  subject: SubjectArea | null;
  deliverable: DeliverableType | null;
  isGroup: boolean;
  isCapstone: boolean;
  hasDeadline: boolean;
  daysAvailable: number;
  keywords: string[];
  complexity: 'low' | 'medium' | 'high';
  specificTopics: string[];
};

function analyzeProject(title: string, description: string, dueDate: string | null, type: string): ProjectAnalysis {
  const combined = `${title} ${description}`.toLowerCase();
  const words = combined.split(/\s+/);

  // Detect subject
  let subject: SubjectArea | null = null;
  let bestScore = 0;
  for (const s of SUBJECT_AREAS) {
    let score = 0;
    for (const kw of s.keywords) {
      if (combined.includes(kw)) score += kw.includes(' ') ? 3 : 1;
    }
    if (score > bestScore) { bestScore = score; subject = s; }
  }

  // Detect deliverable
  let deliverable: DeliverableType | null = null;
  let bestDeliverableScore = 0;
  for (const d of DELIVERABLES) {
    let score = 0;
    for (const kw of d.keywords) {
      if (combined.includes(kw)) score += 2;
    }
    if (score > bestDeliverableScore) { bestDeliverableScore = score; deliverable = d; }
  }

  // Detect group / capstone
  const isGroup = type === 'group' || /\b(group|team|partner|collaborat)\b/.test(combined);
  const isCapstone = type === 'capstone' || /\b(capstone|final year|dissertation|major project)\b/.test(combined);

  // Days available
  const hasDeadline = !!dueDate;
  const daysAvailable = dueDate
    ? Math.max(1, Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000))
    : 21;

  // Extract specific topic keywords from title (non-stopwords, 4+ chars)
  const specificTopics = words
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && /^[a-z]+$/.test(w))
    .slice(0, 5);

  // Complexity
  const wordCount = combined.split(/\s+/).length;
  const hasData = /\b(data|experiment|survey|interview|collect|analyse|analyze|statistics|sample)\b/.test(combined);
  const hasMultipleParts = /\b(part\s*[123]|chapter|section|phase|component|module)\b/.test(combined);
  const complexity: 'low' | 'medium' | 'high' =
    (isCapstone || hasData || hasMultipleParts || wordCount > 40) ? 'high' :
    (deliverable?.id === 'research' || deliverable?.id === 'code' || wordCount > 20) ? 'medium' : 'low';

  // Extract meaningful keywords for task naming
  const keywords = specificTopics.slice(0, 3);

  return { subject, deliverable, isGroup, isCapstone, hasDeadline, daysAvailable, keywords, complexity, specificTopics };
}

// Build personalized tasks from the analysis
function buildPersonalizedTasks(analysis: ProjectAnalysis, title: string, description: string): TaskSuggestion[] {
  const { subject, deliverable, keywords, complexity, daysAvailable } = analysis;
  const topicLabel = keywords[0] ? keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1) : 'project';

  // Start with the deliverable's phase structure (these are real, actionable steps)
  let phaseLabels: string[] = deliverable?.phases ?? [
    'Review requirements & break down the scope',
    'Research & gather key information',
    'Plan structure & outline main sections',
    'Work on core content',
    'Review & refine',
    'Final check & submit',
  ];

  // Personalize each phase label with the actual topic
  const tasks: TaskSuggestion[] = phaseLabels.map((label, idx) => {
    // Inject topic keywords into task titles
    let personalizedTitle = label;
    if (idx === 0 && keywords.length > 0) {
      personalizedTitle = `${label} for ${topicLabel}`;
    } else if (idx === 1 && subject) {
      personalizedTitle = `${label} — focus on ${subject.researchTerms[0] ?? 'key sources'} in ${subject.label.split(' / ')[0].toLowerCase()}`;
    } else if (idx === 2 && keywords.length > 0) {
      personalizedTitle = `Outline: ${keywords.join(', ')} — structure main sections`;
    } else if (idx >= 3 && idx < phaseLabels.length - 2 && keywords.length > 0) {
      // For middle (core work) phases, include the specific topic
      personalizedTitle = `${label} — ${keywords.slice(0, 2).join(' & ')}`;
    }

    // Estimate time based on complexity and phase position
    let est_minutes: number;
    if (idx === 0) est_minutes = 30;
    else if (idx === phaseLabels.length - 1) est_minutes = 30;
    else if (idx === 1) est_minutes = complexity === 'high' ? 120 : 60; // research
    else if (idx === 2) est_minutes = 45; // outline
    else if (idx >= 3 && idx < phaseLabels.length - 2) est_minutes = complexity === 'high' ? 180 : 90; // core work
    else est_minutes = 60; // revision

    // Distribute due dates evenly across available days
    const totalPhases = phaseLabels.length;
    const due_offset_days = Math.max(1, Math.round((idx + 1) * (daysAvailable / totalPhases)));

    return { title: personalizedTitle, est_minutes, due_offset_days };
  });

  // Add subject-specific extra tasks
  if (subject?.id === 'cs' && deliverable?.id === 'code') {
    tasks.splice(3, 0, { title: `Write unit tests for ${topicLabel} modules`, est_minutes: 60, due_offset_days: Math.round(daysAvailable * 0.5) });
  }
  if (subject?.id === 'lit' && deliverable?.id === 'essay') {
    tasks.splice(2, 0, { title: `Close reading: annotate key passages on ${topicLabel}`, est_minutes: 60, due_offset_days: Math.round(daysAvailable * 0.25) });
  }
  if (subject?.id === 'psych' || subject?.id === 'bio') {
    if (/\b(survey|questionnaire|interview|experiment)\b/.test(`${title} ${description}`.toLowerCase())) {
      tasks.splice(3, 0, { title: `Get ethics approval & prepare data collection for ${topicLabel}`, est_minutes: 45, due_offset_days: Math.round(daysAvailable * 0.3) });
    }
  }

  // Add group-specific coordination tasks
  if (analysis.isGroup) {
    tasks.unshift({ title: 'Kickoff meeting: assign roles & set up shared workspace', est_minutes: 30, due_offset_days: 1 });
    const midPoint = Math.round(daysAvailable * 0.5);
    tasks.splice(Math.ceil(tasks.length / 2), 0, { title: 'Group sync: review progress & unblock issues', est_minutes: 30, due_offset_days: midPoint });
  }

  // Recalculate due offsets to spread evenly after insertions
  const totalTasks = tasks.length;
  tasks.forEach((task, idx) => {
    task.due_offset_days = Math.max(1, Math.round((idx + 1) * (daysAvailable / totalTasks)));
  });

  return tasks;
}

function buildPersonalizedMilestones(analysis: ProjectAnalysis, tasks: TaskSuggestion[]): MilestoneSuggestion[] {
  const { keywords } = analysis;
  const topicLabel = keywords[0] ?? 'project';

  if (tasks.length < 3) return [];

  const milestones: MilestoneSuggestion[] = [];
  const third = Math.floor(tasks.length / 3);

  milestones.push({ title: `Research & outline for ${topicLabel} complete`, target_offset_days: tasks[third]?.due_offset_days ?? 3 });
  milestones.push({ title: `Core work on ${topicLabel} done`, target_offset_days: tasks[third * 2]?.due_offset_days ?? 7 });
  milestones.push({ title: `Ready to submit ${topicLabel}`, target_offset_days: tasks[tasks.length - 1]?.due_offset_days ?? 10 });

  return milestones;
}

export function generateSchedule(
  title: string,
  description: string,
  dueDate: string | null,
  type: string,
  preferredTime: string = '09:00',
): ScheduledTask[] {
  const plan = generateProjectPlan(title, description, dueDate, type);
  const startDate = new Date();
  const endDate = dueDate ? new Date(dueDate) : new Date(Date.now() + plan.predicted_days * 86400000);
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));

  const [ph, pm] = preferredTime.split(':').map(Number);
  const startMinutesOfDay = (ph || 9) * 60 + (pm || 0);

  return plan.tasks.map((task, idx) => {
    const dayOffset = Math.min(task.due_offset_days, totalDays);
    const date = new Date(startDate.getTime() + dayOffset * 86400000);
    const dateStr = date.toISOString().slice(0, 10);

    // Vary times slightly so not every task is at the same time
    const timeVariation = idx > 0 ? (idx % 3) * 30 : 0;
    const startTotalMin = startMinutesOfDay + timeVariation;
    const endTotalMin = startTotalMin + Math.min(task.est_minutes, 120);
    const fmt = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      title: task.title,
      est_minutes: task.est_minutes,
      date: dateStr,
      start_time: fmt(startTotalMin),
      end_time: fmt(endTotalMin),
    };
  });
}

export function generateProjectPlan(title: string, description: string, dueDate: string | null, type: string): ProjectPlan {
  const analysis = analyzeProject(title, description, dueDate, type);
  const tasks = buildPersonalizedTasks(analysis, title, description);
  const milestones = buildPersonalizedMilestones(analysis, tasks);

  const totalMinutes = tasks.reduce((s, t) => s + t.est_minutes, 0);
  const predicted_days = Math.max(...tasks.map((t) => t.due_offset_days));

  // Personalized weekly goal
  const hoursRounded = Math.round(totalMinutes / 60 / 3);
  const subjectLabel = analysis.subject?.label.split(' / ')[0] ?? 'your subject';
  const deliverableLabel = analysis.deliverable?.label ?? 'project';
  let weekly_goal = `Aim for ~${hoursRounded} hours this week on your ${deliverableLabel.toLowerCase()} in ${subjectLabel.toLowerCase()}.`;

  if (analysis.isGroup) {
    weekly_goal += ` Sync with your group at least twice.`;
  }
  if (analysis.complexity === 'high') {
    weekly_goal += ` This is a complex ${deliverableLabel.toLowerCase()} — start early and don't leave the core work to the last week.`;
  }

  // Personalized risks
  const risks: string[] = [];
  if (analysis.hasDeadline) {
    const daysLeft = analysis.daysAvailable;
    if (daysLeft < predicted_days) {
      risks.push(`Only ${daysLeft} days until deadline but the plan needs ~${predicted_days} days. Start immediately or reduce scope — consider cutting ${tasks.length > 5 ? 'one of the secondary tasks' : 'non-essential sections'}.`);
    }
    if (daysLeft < 7) {
      risks.push(`Tight deadline (${daysLeft} days). Block ${Math.ceil(hoursRounded / 7)}h daily focused slots to stay on track.`);
    }
  }
  if (analysis.isGroup) {
    risks.push(`Group project: coordinate early so members aren't blocked waiting on each other. Use the kickoff meeting to assign clear owners to each task.`);
  }
  if (analysis.deliverable?.id === 'research') {
    risks.push(`Literature review for ${analysis.keywords[0] ?? 'your topic'} often takes longer than expected. Start broad, then narrow to 10-15 high-quality sources.`);
  }
  if (analysis.deliverable?.id === 'code') {
    risks.push(`Software projects often underestimate debugging time. Reserve at least 20% of your time for testing and fixing.`);
  }
  if (analysis.complexity === 'high' && !analysis.hasDeadline) {
    risks.push(`No deadline set but this is a complex ${deliverableLabel.toLowerCase()}. Consider adding a due date so the plan has realistic time pressure.`);
  }

  const risk = risks[0] ?? `Your ${deliverableLabel.toLowerCase()} plan looks realistic. Focus on the core ${analysis.keywords[0] ?? 'topic'} work in the middle phases.`;

  return { tasks, milestones, predicted_days, weekly_goal, risk, risks };
}

// ─── Document-Aware Quiz Generation ────────────────────────────────────────

export type QuizQuestion = {
  type: 'mcq' | 'truefalse' | 'fillblank';
  prompt: string;
  options: string[] | null;
  answer: string;
  explanation: string;
};

export function generateQuiz(topic: string, difficulty: string, count: number, docContext?: string | null): QuizQuestion[] {
  // If we have document context, generate questions FROM the document
  if (docContext && docContext.length > 200) {
    return generateQuizFromContent(docContext, difficulty, count);
  }
  return generateGenericQuiz(topic, difficulty, count);
}

function generateQuizFromContent(content: string, difficulty: string, count: number): QuizQuestion[] {
  const sentences = splitSentences(content);
  const keyTerms = extractKeyTerms(content, 20);
  const qs: QuizQuestion[] = [];
  const diff = difficulty.toLowerCase();

  // Generate fill-in-the-blank questions from key sentences
  for (const sentence of sentences) {
    if (qs.length >= count) break;
    // Find a key term in the sentence to blank out
    const sentenceWords = sentence.match(/\b[a-z]{4,}\b/gi) ?? [];
    const blankable = sentenceWords.find((w) => keyTerms.includes(w.toLowerCase()) && w.length > 5);
    if (blankable) {
      const blanked = sentence.replace(new RegExp(blankable, 'i'), '_____');
      qs.push({
        type: 'fillblank',
        prompt: `Fill in the blank: "${blanked}"`,
        options: null,
        answer: blankable,
        explanation: `The word "${blankable}" is key to this concept in the document.`,
      });
    }
  }

  // Generate true/false questions from sentences
  for (const sentence of sentences) {
    if (qs.length >= count) break;
    if (sentence.length > 30 && sentence.length < 200) {
      const isTrue = Math.random() > 0.35;
      if (isTrue) {
        qs.push({
          type: 'truefalse',
          prompt: `True or False: ${sentence}`,
          options: null,
          answer: 'True',
          explanation: 'This statement is directly supported by the document.',
        });
      } else {
        // Negate or modify the sentence to make it false
        const modified = sentence.replace(/\b(is|are|was|were|can|will|does|do)\b/i, (match) => {
          const opposites: Record<string, string> = { is: 'is not', are: 'are not', was: 'was not', were: 'were not', can: 'cannot', will: 'will not', does: 'does not', do: 'do not' };
          return opposites[match.toLowerCase()] ?? match;
        });
        if (modified !== sentence) {
          qs.push({
            type: 'truefalse',
            prompt: `True or False: ${modified}`,
            options: null,
            answer: 'False',
            explanation: `The original document states: "${sentence}"`,
          });
        }
      }
    }
  }

  // Generate MCQ questions using key terms
  for (const term of keyTerms) {
    if (qs.length >= count) break;
    // Find a sentence containing this term
    const contextSentence = sentences.find((s) => s.toLowerCase().includes(term));
    if (contextSentence) {
      const distractors = keyTerms
        .filter((t) => t !== term && t.length > 4)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      if (distractors.length >= 3) {
        const options = [term, ...distractors].sort(() => Math.random() - 0.5);
        qs.push({
          type: 'mcq',
          prompt: `According to the document, which term best fits this context: "${contextSentence.slice(0, 120)}..."?`,
          options,
          answer: term,
          explanation: `"${term}" is the correct term based on the document content.`,
        });
      }
    }
  }

  // If we still need more questions, fall back to generic
  if (qs.length < count) {
    const generic = generateGenericQuiz('the document topic', difficulty, count - qs.length);
    qs.push(...generic);
  }

  const result = qs.slice(0, count);
  // Adjust difficulty
  if (diff === 'hard') {
    result.forEach((q) => { q.prompt = q.prompt.replace('best', 'most nuanced'); });
  }
  return result;
}

function generateGenericQuiz(topic: string, difficulty: string, count: number): QuizQuestion[] {
  const t = topic.trim() || 'the topic';
  const qs: QuizQuestion[] = [];
  const templates: QuizQuestion[] = [
    { type: 'mcq', prompt: `Which best defines the core concept of ${t}?`, options: ['A foundational principle', 'An unrelated side detail', 'A historical date', 'A personal opinion'], answer: 'A foundational principle', explanation: `The core concept of ${t} is its foundational principle.` },
    { type: 'truefalse', prompt: `${t} can be applied to real-world problems.`, options: null, answer: 'True', explanation: `${t} has practical applications.` },
    { type: 'mcq', prompt: `A common misconception about ${t} is:`, options: ['It is too advanced to learn', 'It only works in theory', 'It requires no practice', 'All of these are misconceptions'], answer: 'All of these are misconceptions', explanation: `${t} is learnable, practical, and benefits from practice.` },
    { type: 'fillblank', prompt: `The study of ${t} helps develop ___ thinking.`, options: null, answer: 'critical', explanation: `Studying ${t} builds critical thinking.` },
    { type: 'mcq', prompt: `Which is the best first step when learning ${t}?`, options: ['Master the fundamentals', 'Skip to advanced topics', 'Memorise without context', 'Avoid examples'], answer: 'Master the fundamentals', explanation: 'Fundamentals are always the best starting point.' },
    { type: 'truefalse', prompt: `Understanding ${t} requires regular review over time.`, options: null, answer: 'True', explanation: 'Spaced review strengthens retention.' },
    { type: 'fillblank', prompt: `Applying ${t} to examples improves ___.`, options: null, answer: 'understanding', explanation: 'Concrete examples deepen understanding.' },
    { type: 'mcq', prompt: `Which difficulty level reinforces ${t} best?`, options: ['Slightly above current level', 'Far below current level', 'Only exam-level', 'No practice at all'], answer: 'Slightly above current level', explanation: 'Desirable difficulty boosts learning.' },
    { type: 'truefalse', prompt: `Teaching ${t} to someone else strengthens your own grasp.`, options: null, answer: 'True', explanation: 'The Feynman technique — teaching aids retention.' },
    { type: 'mcq', prompt: `Which is a sign you've mastered ${t}?`, options: ['You can explain it simply', 'You can only recite definitions', 'You avoid the topic', 'You forget between sessions'], answer: 'You can explain it simply', explanation: 'Simple explanation signals deep understanding.' },
  ];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    qs.push({ ...templates[i] });
  }
  return qs;
}

// ─── Document-Aware Flashcard Generation ───────────────────────────────────

export type Flashcard = { front: string; back: string };

export function generateFlashcards(topic: string, count: number, docContext?: string | null): Flashcard[] {
  if (docContext && docContext.length > 200) {
    return generateFlashcardsFromContent(docContext, count);
  }
  return generateGenericFlashcards(topic, count);
}

function generateFlashcardsFromContent(content: string, count: number): Flashcard[] {
  const sentences = splitSentences(content);
  const keyTerms = extractKeyTerms(content, 25);
  const cards: Flashcard[] = [];

  // Definition-style cards: "What does X mean?" → sentence containing X
  for (const term of keyTerms) {
    if (cards.length >= count) break;
    const contextSentence = sentences.find((s) => s.toLowerCase().includes(term));
    if (contextSentence) {
      cards.push({
        front: `What does "${term}" mean in the context of this document?`,
        back: contextSentence,
      });
    }
  }

  // Key concept cards: pick important sentences and create Q&A
  for (const sentence of sentences) {
    if (cards.length >= count) break;
    if (sentence.length > 40 && sentence.length < 250) {
      // Create a question by removing the subject or turning into a question
      const term = keyTerms.find((t) => sentence.toLowerCase().includes(t));
      if (term) {
        cards.push({
          front: `Regarding ${term}: what does the document say?`,
          back: sentence,
        });
      }
    }
  }

  if (cards.length < count) {
    cards.push(...generateGenericFlashcards('the document topic', count - cards.length));
  }

  return cards.slice(0, count);
}

function generateGenericFlashcards(topic: string, count: number): Flashcard[] {
  const t = topic.trim() || 'the topic';
  const cards: Flashcard[] = [
    { front: `What is ${t}?`, back: `${t} is a foundational concept worth understanding through examples and practice.` },
    { front: `Why is ${t} important?`, back: `${t} develops critical thinking and has real-world applications.` },
    { front: `Name a key principle of ${t}.`, back: 'Start from fundamentals and build up through examples.' },
    { front: `How do you apply ${t}?`, back: 'Break the problem down, identify fundamentals, then apply with examples.' },
    { front: `Common misconception about ${t}?`, back: 'That it is too advanced — it is learnable with regular practice.' },
    { front: `Best way to review ${t}?`, back: 'Spaced repetition with active recall — not passive re-reading.' },
    { front: `A simple example of ${t}.`, back: 'Explaining it to a friend in your own words using a concrete scenario.' },
    { front: `Sign you've mastered ${t}?`, back: 'You can explain it simply and apply it to new problems.' },
    { front: `What makes ${t} hard at first?`, back: 'Unfamiliar vocabulary — once terms click, the ideas follow.' },
    { front: `Next step after learning ${t}?`, back: 'Practice with varied problems and teach someone else.' },
  ];
  return cards.slice(0, Math.min(count, cards.length));
}

// ─── Document-Aware Notes Generation ───────────────────────────────────────

export type Note = { heading: string; content: string; bulletPoints: string[] };

export function generateNotes(docContext: string, topic?: string): Note[] {
  if (!docContext || docContext.length < 200) {
    return generateGenericNotes(topic || 'the topic');
  }

  const sentences = splitSentences(docContext);
  const keyTerms = extractKeyTerms(docContext, 12);
  const notes: Note[] = [];

  // Group sentences by themes based on key terms
  const usedSentences = new Set<number>();

  // Overview section
  const overviewSentences = sentences.slice(0, 5).filter((s) => s.length > 30);
  if (overviewSentences.length > 0) {
    notes.push({
      heading: 'Overview',
      content: overviewSentences.slice(0, 3).join(' '),
      bulletPoints: overviewSentences.slice(0, 5).map((s) => s.slice(0, 150)),
    });
  }

  // Key Terms section
  if (keyTerms.length > 0) {
    const termBullets = keyTerms.slice(0, 8).map((term) => {
      const contextSentence = sentences.find((s, i) => s.toLowerCase().includes(term) && !usedSentences.has(i));
      const idx = sentences.findIndex((s, i) => s.toLowerCase().includes(term) && !usedSentences.has(i));
      if (idx >= 0) usedSentences.add(idx);
      return contextSentence ? `${term}: ${contextSentence.slice(0, 120)}` : `${term} — key term in this document`;
    });
    notes.push({
      heading: 'Key Terms & Definitions',
      content: 'Important terminology used throughout the document:',
      bulletPoints: termBullets,
    });
  }

  // Main Concepts — group remaining sentences into themes
  const remainingSentences = sentences.filter((s, i) => !usedSentences.has(i) && s.length > 40);
  const conceptGroups: string[][] = [];
  const groupSize = Math.ceil(remainingSentences.length / Math.min(4, Math.ceil(remainingSentences.length / 3)));

  for (let i = 0; i < remainingSentences.length; i += groupSize) {
    conceptGroups.push(remainingSentences.slice(i, i + groupSize));
  }

  conceptGroups.forEach((group, idx) => {
    if (group.length === 0) return;
    const groupTerms = extractKeyTerms(group.join(' '), 5);
    const heading = groupTerms[0]
      ? `${groupTerms[0].charAt(0).toUpperCase() + groupTerms[0].slice(1)} & Related Concepts`
      : `Main Concept ${idx + 1}`;
    notes.push({
      heading,
      content: group.slice(0, 2).join(' '),
      bulletPoints: group.slice(0, 6).map((s) => s.slice(0, 150)),
    });
  });

  // Summary section
  if (sentences.length > 10) {
    const lastSentences = sentences.slice(-3).filter((s) => s.length > 30);
    if (lastSentences.length > 0) {
      notes.push({
        heading: 'Summary & Key Takeaways',
        content: lastSentences.join(' '),
        bulletPoints: [
          `The document covers ${keyTerms.slice(0, 3).join(', ')}`,
          `${sentences.length} key statements were identified`,
          'Review the key terms above for exam preparation',
        ],
      });
    }
  }

  return notes.length > 0 ? notes : generateGenericNotes(topic || 'the document');
}

function generateGenericNotes(topic: string): Note[] {
  const t = topic.trim() || 'the topic';
  return [
    {
      heading: 'Overview',
      content: `${t} is a foundational concept that connects several key ideas.`,
      bulletPoints: [
        `${t} builds from fundamental principles`,
        'Understanding it unlocks more advanced topics',
        'It has real-world applications worth knowing',
      ],
    },
    {
      heading: 'Key Terms',
      content: 'Important terminology to remember:',
      bulletPoints: [
        'Core concept — the foundational principle',
        'Application — how the concept is used in practice',
        'Common pitfall — what to avoid when applying it',
      ],
    },
    {
      heading: 'Study Tips',
      content: 'How to master this topic:',
      bulletPoints: [
        'Start with fundamentals before advanced topics',
        'Use spaced repetition for retention',
        'Practice with worked examples',
        'Teach someone else to solidify understanding',
      ],
    },
  ];
}

// ─── Assistant Reply Logic (scope-guarded, document-aware) ──────────────────

export type AssistantMessage = { role: 'user' | 'assistant'; content: string };

export function generateAssistantReply(question: string, docContext: string | null): string {
  // Scope guard — refuse off-topic questions
  if (isOffTopic(question)) {
    return scopeGuardReply();
  }

  const q = question.toLowerCase();

  // Document-aware responses
  if (docContext && docContext.length > 200) {
    const sentences = splitSentences(docContext);
    const keyTerms = extractKeyTerms(docContext, 8);

    if (q.includes('summar')) {
      const topSentences = sentences.slice(0, 6).map((s) => s.slice(0, 180));
      return `Here's a summary based on your document:\n\n${topSentences.join('\n\n')}\n\nKey terms: ${keyTerms.join(', ')}\n\nWant me to expand on any of these points or generate notes?`;
    }

    if (q.includes('explain') || q.includes('simpl')) {
      const relevant = sentences.find((s) =>
        keyTerms.some((t) => s.toLowerCase().includes(t)),
      );
      if (relevant) {
        return `Based on your document, here's a simpler explanation:\n\n${relevant.slice(0, 200)}\n\nIn plain terms: the main idea is about ${keyTerms.slice(0, 3).join(', ')}. Once you understand how these connect, the rest follows.\n\nWant me to break it down further or give an example?`;
      }
      return `Let me break it down based on your document:\n\nThe document covers ${keyTerms.join(', ')}. The core idea is stated here: "${sentences[0]?.slice(0, 180) ?? 'N/A'}..."\n\nWould you like me to expand on a specific part?`;
    }

    if (q.includes('key point') || q.includes('main point') || q.includes('important')) {
      const points = sentences.slice(0, 5).map((s, i) => `${i + 1}. ${s.slice(0, 160)}`);
      return `Key points from your document:\n\n${points.join('\n\n')}\n\nWant me to turn these into flashcards or a quiz?`;
    }

    if (q.includes('quiz') || q.includes('test') || q.includes('question')) {
      return `I can generate a quiz from your document! Go to the Quizzes page, select "From document", and I'll create MCQ, true/false, and fill-in-the-blank questions directly from the content. You can also ask me to generate notes here first.`;
    }

    if (q.includes('note')) {
      return `I can create structured notes from your document! The notes will be organized by: Overview, Key Terms & Definitions, Main Concepts, and Summary. You can access generated notes from the document panel. Want me to outline the key terms now?`;
    }

    // Default: search document for relevant content
    const questionTerms = question.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    const relevantSentences = sentences
      .filter((s) => questionTerms.some((t) => s.toLowerCase().includes(t) && !STOP_WORDS.has(t)))
      .slice(0, 3);

    if (relevantSentences.length > 0) {
      return `Based on your document, here's what I found:\n\n${relevantSentences.map((s) => `"${s.slice(0, 200)}"`).join('\n\n')}\n\nThis relates to: ${keyTerms.slice(0, 4).join(', ')}. Would you like me to go deeper on any of these?`;
    }

    return `I've read through your document. It covers ${keyTerms.join(', ')} and contains ${sentences.length} key statements. Ask me to summarize, explain, generate notes, or create a quiz from it!`;
  }

  // No document — general study help (still scope-guarded)
  if (q.includes('summar')) return 'I can summarise any document you upload — just drop a PDF, text file, or paste a URL into the Assistant and I\'ll read the full content and give you the key points.';
  if (q.includes('plan')) return 'Sure! Head to Projects, create one, and hit "Suggest schedule". I\'ll break it into tasks, milestones, and a weekly goal with risk detection — and automatically add everything to your calendar.';
  if (q.includes('quiz')) return 'I can generate a quiz on any topic or from any uploaded document! Go to Quizzes, enter a topic and difficulty, and I\'ll create MCQ, true/false, and fill-in-the-blank questions. If you upload a document first, the questions come directly from its content.';
  if (q.includes('flash')) return 'Flashcards are in the Flashcards tab — give me a topic or upload a document and I\'ll generate a deck with spaced repetition built in.';
  if (q.includes('note')) return 'Upload a document and I\'ll generate structured notes organized by overview, key terms, main concepts, and summary — all grounded in the actual content.';
  if (q.includes('url') || q.includes('link') || q.includes('website')) return 'You can paste a URL (like an online textbook or article) in the Assistant and I\'ll fetch and read the full page content — not just headers and footers, but the actual body text. Then I can summarise, generate notes, or create a quiz from it.';
  if (q.includes('pdf')) return 'Yes! I can read PDFs. Upload one in the Assistant and I\'ll extract text from every page. Then I can summarise, explain, generate notes, or create quizzes from the content.';
  return 'I\'m your AI study tutor! I can help with:\n\n• Summarising and explaining documents (PDF, text, or web links)\n• Generating structured notes from your materials\n• Creating quizzes and flashcards from document content\n• Planning projects and auto-scheduling your calendar\n\nUpload a document or paste a link to get started, or ask me about any study topic!';
}

// ─── AI Tools (scope-guarded, document-aware) ──────────────────────────────

export type AiTool =
  | 'summarize' | 'explain' | 'simplify' | 'study-guide' | 'examples'
  | 'rewrite' | 'compare' | 'translate' | 'mnemonic' | 'revision-notes'
  | 'generate-notes' | 'generate-quiz';

export const AI_TOOLS: { id: AiTool; label: string; icon: string; desc: string }[] = [
  { id: 'summarize', label: 'Summarise', icon: 'FileText', desc: 'Key points from your document' },
  { id: 'explain', label: 'Explain', icon: 'Lightbulb', desc: 'Break down a difficult concept' },
  { id: 'simplify', label: 'Simplify', icon: 'Sparkles', desc: 'Rewrite in simpler language' },
  { id: 'study-guide', label: 'Study Guide', icon: 'BookOpen', desc: 'Structured guide with sections' },
  { id: 'generate-notes', label: 'Make Notes', icon: 'NotebookPen', desc: 'Structured notes from document' },
  { id: 'generate-quiz', label: 'Make Quiz', icon: 'GraduationCap', desc: 'Quiz questions from document' },
  { id: 'examples', label: 'Examples', icon: 'ListChecks', desc: 'Generate worked examples' },
  { id: 'rewrite', label: 'Rewrite Notes', icon: 'PenLine', desc: 'Clean up your notes' },
  { id: 'compare', label: 'Compare', icon: 'GitCompare', desc: 'Compare two concepts' },
  { id: 'translate', label: 'Translate', icon: 'Languages', desc: 'Translate to plain English' },
  { id: 'mnemonic', label: 'Mnemonic', icon: 'Brain', desc: 'Memory device for a topic' },
  { id: 'revision-notes', label: 'Revision Notes', icon: 'NotebookPen', desc: 'Condensed revision sheet' },
];

export function runAiTool(tool: AiTool, input: string, docContext: string | null): string {
  // Scope guard
  if (isOffTopic(input)) {
    return scopeGuardReply();
  }

  const topic = input.trim() || 'the topic';
  const sentences = docContext ? splitSentences(docContext) : [];
  const keyTerms = docContext ? extractKeyTerms(docContext, 10) : [];
  const snippet = docContext ? docContext.slice(0, 400).replace(/\s+/g, ' ') : null;

  switch (tool) {
    case 'summarize':
      if (sentences.length > 0) {
        const topPoints = sentences.slice(0, 8).map((s, i) => `${i + 1}. ${s.slice(0, 180)}`);
        return `Summary of your document:\n\n${topPoints.join('\n\n')}\n\nKey terms: ${keyTerms.join(', ')}\n\nWant me to expand on any point or generate a quiz?`;
      }
      return `Upload a document and I'll summarise it into key points, main arguments, and essential terms. You can also type a topic and I'll give you a conceptual summary.`;

    case 'explain':
      if (sentences.length > 0) {
        const relevant = sentences.find((s) => keyTerms.some((t) => s.toLowerCase().includes(t))) ?? sentences[0];
        return `Let me explain this, grounded in your document:\n\n1. What it is: ${relevant.slice(0, 200)}\n2. Why it matters: ${keyTerms.slice(0, 3).join(', ')} are central to understanding this.\n3. How it works: The document describes the mechanism through these key terms.\n4. Common pitfalls: Watch out for confusing surface details with the underlying principle.\n\nWant an example or analogy?`;
      }
      return `Let me explain ${topic} step by step:\n\n1. What it is: ${topic} is a foundational concept connecting several key ideas.\n2. Why it matters: Understanding it unlocks more advanced topics.\n3. How it works: Break down the problem, identify patterns, apply principles.\n4. Common pitfalls: Many confuse surface details with the underlying principle.\n\nWant an example or analogy?`;

    case 'simplify':
      if (sentences.length > 0) {
        return `Here's your document in simple terms:\n\n${sentences.slice(0, 4).map((s) => s.slice(0, 150)).join(' ')}\n\nIn everyday language: the main idea is about ${keyTerms.slice(0, 3).join(', ')}. Once those click, everything else follows.\n\nWant me to simplify it further?`;
      }
      return `Here's ${topic} in simple terms:\n\nImagine explaining it to a friend who's never seen it. The main idea: take something complex, find the simplest version, and build up. That's ${topic} in a nutshell.`;

    case 'study-guide':
      if (sentences.length > 0) {
        const sections = [
          '## 1. Overview',
          sentences.slice(0, 3).join(' '),
          '\n## 2. Key Terms',
          ...keyTerms.slice(0, 8).map((t) => `• ${t}`),
          '\n## 3. Core Concepts',
          ...sentences.slice(3, 8).map((s) => `• ${s.slice(0, 150)}`),
          '\n## 4. Practice Questions',
          `1. Define ${keyTerms[0] ?? topic} in your own words.`,
          `2. Give an example of how ${keyTerms[0] ?? topic} is used.`,
          `3. What's a common misconception about it?`,
          '\n## 5. Review Checklist',
          '- [ ] I can explain it simply',
          '- [ ] I can apply it to a new problem',
          '- [ ] I can identify it in context',
        ];
        return `Study Guide: ${topic}\n\n${sections.join('\n')}`;
      }
      return `Study Guide: ${topic}\n\n## 1. Overview\n${topic} is a key concept worth mastering.\n\n## 2. Key Terms\n• Term 1 — definition\n• Term 2 — how it relates\n\n## 3. Practice Questions\n1. Define ${topic} in your own words.\n2. Give an example.\n\n## 4. Review Checklist\n- [ ] I can explain it simply\n- [ ] I can apply it`;

    case 'generate-notes':
      if (sentences.length > 0) {
        const notes = generateNotes(docContext!, topic);
        const formatted = notes.map((n) =>
          `### ${n.heading}\n${n.content}\n${n.bulletPoints.map((b) => `  • ${b}`).join('\n')}`,
        ).join('\n\n');
        return `Here are structured notes from your document:\n\n${formatted}`;
      }
      return 'Upload a document and I\'ll generate structured notes organized by overview, key terms, main concepts, and summary — all grounded in the actual content.';

    case 'generate-quiz':
      if (sentences.length > 0) {
        const quiz = generateQuiz(topic, 'medium', 5, docContext);
        const formatted = quiz.map((q, i) => {
          const opts = q.options ? `\nOptions: ${q.options.join(' | ')}` : '';
          return `Q${i + 1}. [${q.type.toUpperCase()}] ${q.prompt}${opts}\nAnswer: ${q.answer}\nExplanation: ${q.explanation}`;
        }).join('\n\n');
        return `Here's a 5-question quiz from your document:\n\n${formatted}\n\nWant me to generate more questions or create a full quiz in the Quizzes page?`;
      }
      return 'Upload a document and I\'ll generate quiz questions directly from its content — MCQ, true/false, and fill-in-the-blank.';

    case 'examples':
      return `Worked examples for ${topic}:\n\nExample 1 (Basic):\nStart with the simplest case. Identify the core principle, apply it directly, verify.\n\nExample 2 (Intermediate):\nAdd complexity — combine two ideas. Break into steps, solve each.\n\nExample 3 (Advanced):\nApply ${topic} to a real-world scenario.\n\n${snippet ? `From your document: "${snippet.slice(0, 120)}..."` : 'Want me to generate practice questions too?'}`;

    case 'rewrite':
      if (snippet) {
        return `Here are your notes cleaned up:\n\n${snippet.slice(0, 250)}...\n\nReorganised:\n• Main topic stated clearly\n• Supporting points grouped logically\n• Action items separated\n• Key terms highlighted\n\nWant me to turn these into flashcards?`;
      }
      return 'Paste or upload your notes and I\'ll reorganise them into clean, structured notes with headings, bullets, and highlighted key terms.';

    case 'compare':
      return `Compare: ${topic}\n\n1. Similarities — what do they share? Both involve the same underlying principle.\n2. Differences — where do they diverge? Key difference is in scope and application.\n3. When to use each — context matters.\n\n${snippet ? `From your document: "${snippet.slice(0, 120)}..."` : 'Tell me the two concepts and I\'ll break it down.'}`;

    case 'translate':
      if (snippet) {
        return `Here's your document in plain English:\n\n${snippet.slice(0, 250)}...\n\nIn everyday language: the main idea is that the topic can be understood through its core components, and once you know those, everything follows.\n\nWant me to simplify further?`;
      }
      return 'Upload a document with technical or academic language and I\'ll rewrite it in plain English.';

    case 'mnemonic':
      return `Mnemonic for ${topic}:\n\nTry: "${topic.toUpperCase().slice(0, 5).split('').join('. ')}."\n\nOr make an acronym from the first letters of each key step.\n\nExample: Read, Understand, Apply, Practice, Remember → "RUAPR" → "Rabbits Usually Avoid Purple Radishes."\n\nSilly but sticky!`;

    case 'revision-notes':
      if (sentences.length > 0) {
        return `Revision Notes: ${topic}\n\n• Core: ${sentences[0]?.slice(0, 150) ?? 'N/A'}\n• Key terms: ${keyTerms.slice(0, 5).join(', ')}\n• Top 3 things to remember:\n  1. ${sentences[1]?.slice(0, 100) ?? 'The foundational rule'}\n  2. ${sentences[2]?.slice(0, 100) ?? 'The common exception'}\n  3. ${sentences[3]?.slice(0, 100) ?? 'The real-world application'}\n• Quick self-test: Can you explain it in one sentence?\n• Common exam question: "Explain and give an example"`;
      }
      return `Revision Notes: ${topic}\n\n• Core definition: ${topic} connects multiple ideas\n• Key principle: identify → analyse → apply → verify\n• Top 3:\n  1. The foundational rule\n  2. The common exception\n  3. The real-world application\n• Self-test: Can you explain it in one sentence?`;

    default:
      return "Pick a tool above and I'll help you study smarter!";
  }
}
