export interface StatItem {
  label: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: string;
  color: "violet" | "emerald" | "indigo" | "amber" | "rose" | "blue" | "sky" | "slate";
}

export interface AssignmentMock {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: "pending" | "submitted" | "overdue";
  urgency: "high" | "medium" | "low";
}

export interface NoteMock {
  id: string;
  title: string;
  subject: string;
  lastEdited: string;
  snippet: string;
}

export interface SubjectProgress {
  subject: string;
  completed: number;
  total: number;
  color: string;
}

export interface AIConversationMock {
  id: string;
  topic: string;
  preview: string;
  timestamp: string;
}

export interface DailyGoal {
  id: string;
  text: string;
  completed: boolean;
}

export interface ActivityMock {
  id: string;
  title: string;
  description: string;
  iconName: string;
  timestamp: string;
  category: string;
}

export interface BadgeMock {
  id: string;
  name: string;
  description: string;
  iconName: string;
  earnedDate: string;
  color: string;
}

export interface StreakMock {
  current: number;
  longest: number;
  badges: BadgeMock[];
}

export interface ChartPointMock {
  label: string;
  value: number;
}

// 1. STATS: 7 statistics cards requested by the user: Subjects, Notes, Flashcards, Assignments, Study Hours, AI Conversations, Weekly Progress
export const STATS: StatItem[] = [
  {
    label: "Active Subjects",
    value: "4 Subjects",
    change: "+1 added this month",
    isPositive: true,
    icon: "BookOpen",
    color: "blue",
  },
  {
    label: "Saved Notes",
    value: "24 Notebooks",
    change: "6 notes modified recently",
    isPositive: true,
    icon: "FileText",
    color: "violet",
  },
  {
    label: "Flashcards Created",
    value: "140 Cards",
    change: "+40 active recall units",
    isPositive: true,
    icon: "Layers",
    color: "indigo",
  },
  {
    label: "Pending Assignments",
    value: "3 Pending",
    change: "1 finished today",
    isPositive: true,
    icon: "CheckSquare",
    color: "rose",
  },
  {
    label: "Study Hours",
    value: "42.5 hrs",
    change: "+12.4% vs last week",
    isPositive: true,
    icon: "Clock",
    color: "emerald",
  },
  {
    label: "AI Conversations",
    value: "18 Sessions",
    change: "100% Socratic accuracy",
    isPositive: true,
    icon: "BrainCircuit",
    color: "sky",
  },
  {
    label: "Weekly Progress",
    value: "84% Completion",
    change: "+4.2% study efficiency",
    isPositive: true,
    icon: "Award",
    color: "amber",
  }
];

// 2. UPCOMING_ASSIGNMENTS
export const UPCOMING_ASSIGNMENTS: AssignmentMock[] = [
  {
    id: "a1",
    title: "Neuroscience Lab Report: Synaptic Plasticity",
    subject: "BIOL-402 Neurobiology",
    dueDate: "Tomorrow at 11:59 PM",
    status: "pending",
    urgency: "high",
  },
  {
    id: "a2",
    title: "Advanced Matrix Calculations Problem Set",
    subject: "MATH-301 Linear Algebra",
    dueDate: "July 8, 2026",
    status: "pending",
    urgency: "medium",
  },
  {
    id: "a3",
    title: "SaaS Database Index Design Implementation",
    subject: "CS-440 Database Systems",
    dueDate: "July 12, 2026",
    status: "submitted",
    urgency: "low",
  },
  {
    id: "a4",
    title: "Cognitive Psychology Research Proposal",
    subject: "PSYC-210 Cognitive Science",
    dueDate: "July 15, 2026",
    status: "pending",
    urgency: "medium",
  },
];

// 3. RECENT_NOTES
export const RECENT_NOTES: NoteMock[] = [
  {
    id: "n1",
    title: "Quantum Superposition & Decoherence Notes",
    subject: "PHYS-380 Quantum Mechanics",
    lastEdited: "2 hours ago",
    snippet: "Analyzing the interaction of open quantum systems with environmental degrees of freedom leading to the decay of phase terms...",
  },
  {
    id: "n2",
    title: "B-Tree Node Splits & Merging Algorithms",
    subject: "CS-440 Database Systems",
    lastEdited: "Yesterday",
    snippet: "Each internal node (except root) has a lower bound of ceil(m/2) keys. Insertion triggers split when keys exceed m-1...",
  },
  {
    id: "n3",
    title: "Eukaryotic DNA Replication Fork Assembly",
    subject: "BIOL-402 Neurobiology",
    lastEdited: "3 days ago",
    snippet: "CMG helicase activation occurs in S-phase through phosphorylation of Sld2 and Sld3 by DDK and CDK kinases...",
  },
];

// 4. SUBJECT_PROGRESS
export const SUBJECT_PROGRESS: SubjectProgress[] = [
  { subject: "BIOL-402 Neurobiology", completed: 8, total: 10, color: "bg-violet-600" },
  { subject: "MATH-301 Linear Algebra", completed: 14, total: 16, color: "bg-emerald-500" },
  { subject: "CS-440 Database Systems", completed: 5, total: 8, color: "bg-indigo-600" },
  { subject: "PHYS-380 Quantum Physics", completed: 4, total: 12, color: "bg-amber-500" },
];

// 5. RECENT_AI_CONVERSATIONS
export const RECENT_AI_CONVERSATIONS: AIConversationMock[] = [
  {
    id: "ai1",
    topic: "Explaining Schrödinger's wave equation",
    preview: "The wave function represents the probability amplitude of finding a quantum particle at a specific spatial coordinate...",
    timestamp: "10 mins ago",
  },
  {
    id: "ai2",
    topic: "Code debug: Drizzle ORM transaction deadlock",
    preview: "To prevent transaction lock contention, ensure that nested tables are modified in alphabetical primary key order...",
    timestamp: "1 hour ago",
  },
  {
    id: "ai3",
    topic: "Mnemonics for Cranial Nerves list",
    preview: "Here is the standard mnemonic to recall olfactory, optic, oculomotor, trochlear, trigeminal, abducens, facial...",
    timestamp: "Yesterday",
  },
];

// 6. DAILY_GOALS
export const DAILY_GOALS: DailyGoal[] = [
  { id: "g1", text: "Complete BIOL-402 Neuroscience readings", completed: true },
  { id: "g2", text: "Practice 20 Linear Algebra Flashcards", completed: true },
  { id: "g3", text: "Generate mock quiz for CS-440 Database indexes", completed: false },
  { id: "g4", text: "Review notes on Quantum Wave Decays", completed: false },
];

// 7. MOTIVATIONAL_QUOTES
export const MOTIVATIONAL_QUOTES = [
  { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { quote: "Focus on progress, not perfection. Every hour added today secures your mastery tomorrow.", author: "Study Hub Coach" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { quote: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { quote: "Procrastination makes easy things hard and hard things harder.", author: "Mason Cooley" },
  { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { quote: "Socratic inquiry reveals the truths already slumbering in your mind.", author: "Socrates" },
  { quote: "Spoon-feeding in the long run teaches us nothing but the shape of the spoon.", author: "E.M. Forster" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { quote: "The direction in which education starts a person determines their future in life.", author: "Plato" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", author: "Colin Powell" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "Do the best you can until you know better. Then when you know better, do better.", author: "Maya Angelou" },
  { quote: "Wonder is the beginning of wisdom.", author: "Socrates" },
  { quote: "Employ your time in improving yourself by other minds' insights, so that you shall gain easily what others labored hard for.", author: "Socrates" }
];

// 8. RECENT ACTIVITIES: Requested by the user
export const RECENT_ACTIVITIES: ActivityMock[] = [
  {
    id: "act-1",
    title: "Completed Neural Networks review",
    description: "Marked active recall checkpoints on feed-forward backpropagation formulas.",
    iconName: "CheckCircle2",
    timestamp: "20 mins ago",
    category: "Academic"
  },
  {
    id: "act-2",
    title: "Uploaded CS-440 PDF Syllabus",
    description: "Ingested class curriculum into Study Hub vector database for context parsing.",
    iconName: "FileUp",
    timestamp: "2 hours ago",
    category: "System"
  },
  {
    id: "act-3",
    title: "Asked AI about SQL locking",
    description: "Inquired about transaction lock tables in multi-node relational clusters.",
    iconName: "BrainCircuit",
    timestamp: "Yesterday",
    category: "AI Chat"
  },
  {
    id: "act-4",
    title: "Created Physics flashcard deck",
    description: "Instantiated 15 new high-fidelity active recall cards for Quantum Decoherence.",
    iconName: "Layers",
    timestamp: "3 days ago",
    category: "Tools"
  }
];

// 9. WEEKLY PROGRESS & MONTHLY PROGRESS CHART DATA: Requested by user
export const WEEKLY_CHART_DATA: ChartPointMock[] = [
  { label: "Mon", value: 4.5 },
  { label: "Tue", value: 6.2 },
  { label: "Wed", value: 3.8 },
  { label: "Thu", value: 7.4 },
  { label: "Fri", value: 5.0 },
  { label: "Sat", value: 8.5 },
  { label: "Sun", value: 7.1 }
];

export const MONTHLY_CHART_DATA: ChartPointMock[] = [
  { label: "Week 1", value: 32.5 },
  { label: "Week 2", value: 44.0 },
  { label: "Week 3", value: 38.2 },
  { label: "Week 4", value: 48.8 }
];

// 10. STUDY STREAK CARD DATA: Current streak, longest streak, achievement badges
export const STREAK_INFO: StreakMock = {
  current: 12,
  longest: 28,
  badges: [
    {
      id: "b1",
      name: "Consistent Scholar",
      description: "Earned for logging study sessions for 10 days in a row.",
      iconName: "Flame",
      earnedDate: "June 25, 2026",
      color: "amber"
    },
    {
      id: "b2",
      name: "Socratic Intellect",
      description: "Ask 15 high-fidelity conceptual questions to the AI Study Assistant.",
      iconName: "Sparkles",
      earnedDate: "June 28, 2026",
      color: "violet"
    },
    {
      id: "b3",
      name: "Database Overlord",
      description: "Complete all index construction quizzes with a perfect score.",
      iconName: "Database",
      earnedDate: "July 01, 2026",
      color: "emerald"
    }
  ]
};
