import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  HeartHandshake,
  ListTodo,
  MoonStar,
  Play,
  Plus,
  RefreshCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type Emotion = 'excited' | 'encouraging' | 'focused' | 'worried' | 'urgent' | 'celebrating';
type TaskType = 'focus' | 'health' | 'learn' | 'life' | 'creative';

type Task = {
  id: string;
  title: string;
  type: TaskType;
  estimatedMinutes: number;
  done: boolean;
  createdAt: string;
  completedAt?: string;
  accuracy?: number;
};

type StoredState = {
  tasks: Task[];
  streak: number;
  totalDone: number;
  lastPromptDate: string;
  lastCompleteDate: string;
  avatarMessage: string;
};

const STORAGE_KEY = 'dragonstreak-state-v1';

const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Read 12 pages of a book',
    type: 'learn',
    estimatedMinutes: 20,
    done: false,
    createdAt: 'today',
  },
  {
    id: 'task-2',
    title: 'Take a 20 minute walk',
    type: 'health',
    estimatedMinutes: 20,
    done: false,
    createdAt: 'today',
  },
  {
    id: 'task-3',
    title: 'Finish the report outline',
    type: 'focus',
    estimatedMinutes: 45,
    done: false,
    createdAt: 'today',
  },
];

const typeMeta: Record<TaskType, { label: string; color: string; icon: React.ReactNode }> = {
  focus: { label: 'Deep work', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: <Target className="size-3.5" /> },
  health: { label: 'Wellness', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <HeartHandshake className="size-3.5" /> },
  learn: { label: 'Learning', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <BookOpenIcon /> },
  life: { label: 'Life admin', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Sparkles className="size-3.5" /> },
  creative: { label: 'Creative', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <Gift className="size-3.5" /> },
};

const emotionCopy: Record<Emotion, { title: string; message: string; expression: string; tone: string }> = {
  excited: {
    title: 'Ready to glow',
    message: 'A fresh day, a clear mind, and a dragon who believes in you.',
    expression: '✦🐉✦',
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  encouraging: {
    title: 'You have this',
    message: 'Small steps still move the dragon forward.',
    expression: '🙂‍🐉',
    tone: 'bg-lime-50 text-lime-700 border-lime-200',
  },
  focused: {
    title: 'Focus mode',
    message: 'One task at a time. Pick the next brave step.',
    expression: '🧐🐲',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  worried: {
    title: 'A little worried',
    message: 'Some tasks are still waiting. Let’s make them easier to finish.',
    expression: '🥺🐉',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  urgent: {
    title: 'Dragon is tapping its claw',
    message: 'The day is almost done. You can still make it count.',
    expression: '🔥🐲',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  celebrating: {
    title: 'Streak alive!',
    message: 'You promised, you showed up, and the dragon is roaring with joy.',
    expression: '🎉🐉✨',
    tone: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
};

const taskTypeLabels: Record<TaskType, string> = {
  focus: 'Focus',
  health: 'Health',
  learn: 'Learn',
  life: 'Life',
  creative: 'Creative',
};

const DragonStreakApp = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [streak, setStreak] = useState(6);
  const [totalDone, setTotalDone] = useState(48);
  const [lastPromptDate, setLastPromptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lastCompleteDate, setLastCompleteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [avatarMessage, setAvatarMessage] = useState(emotionCopy.excited.message);
  const [activeTab, setActiveTab] = useState('today');
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('focus');
  const [newTaskMinutes, setNewTaskMinutes] = useState(25);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showMiniWidget, setShowMiniWidget] = useState(true);
  const { toast } = useToast();

  const pendingTasks = tasks.filter((task) => !task.done);
  const doneToday = tasks.filter((task) => task.done);
  const progress = tasks.length ? Math.round((doneToday.length / tasks.length) * 100) : 0;
  const urgency = pendingTasks.length === 0 ? 'celebrating' : progress < 25 ? 'urgent' : progress < 60 ? 'worried' : progress < 100 ? 'focused' : 'celebrating';
  const emotion = emotionCopy[urgency];
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredState;
        setTasks(parsed.tasks);
        setStreak(parsed.streak);
        setTotalDone(parsed.totalDone);
        setLastPromptDate(parsed.lastPromptDate);
        setLastCompleteDate(parsed.lastCompleteDate);
        setAvatarMessage(parsed.avatarMessage);
      }
    } catch {
      // Local storage can be unavailable in private browsing; the demo still works in memory.
    }
  }, []);

  useEffect(() => {
    const state: StoredState = { tasks, streak, totalDone, lastPromptDate, lastCompleteDate, avatarMessage };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [tasks, streak, totalDone, lastPromptDate, lastCompleteDate, avatarMessage]);

  useEffect(() => {
    const checkPrompts = () => {
      const date = new Date().toISOString().slice(0, 10);
      if (date !== lastPromptDate) {
        setIsPromptOpen(true);
        setLastPromptDate(date);
      }
    };
    checkPrompts();
    const interval = window.setInterval(checkPrompts, 60_000);
    return () => window.clearInterval(interval);
  }, [lastPromptDate]);

  const nextPendingTask = () => pendingTasks[carouselIndex % Math.max(pendingTasks.length, 1)];
  const selectPendingTask = (index: number) => {
    setCarouselIndex(index);
    setAvatarMessage('One task at a time. You can make this easy to start.');
  };

  const completeTask = (id: string) => {
    setTasks((current) => current.map((task) => (
      task.id === id
        ? { ...task, done: true, completedAt: new Date().toISOString(), accuracy: Math.max(72, 91 + Math.floor(Math.random() * 8)) }
        : task
    )));
    setTotalDone((value) => value + 1);
    const stillPending = tasks.some((task) => task.id === id && !task.done);
    if (stillPending) {
      setAvatarMessage('Dragon sees that one disappear. Keep rolling!');
    }
    toast({ title: 'Task completed', description: 'Your streak just got a little more impressive.' });
  };

  const carryForward = () => {
    const carried = tasks.filter((task) => task.done).map((task) => ({ ...task, id: `${task.id}-carry-${Date.now()}`, done: false, completedAt: undefined, accuracy: undefined }));
    setTasks((current) => [...current, ...carried]);
    setAvatarMessage('Tomorrow gets a fresh chance to shine. The dragon packed your leftovers.');
    setIsPromptOpen(false);
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      type: newTaskType,
      estimatedMinutes: Number(newTaskMinutes) || 25,
      done: false,
      createdAt: today,
    };
    setTasks((current) => [task, ...current]);
    setNewTaskTitle('');
    setNewTaskMinutes(25);
    setActiveTab('today');
    setAvatarMessage('New quest added! The dragon has sharpened its claws.');
  };

  const resetDay = () => {
    setTasks(sampleTasks);
    setStreak(6);
    setTotalDone(48);
    setLastPromptDate(today);
    setLastCompleteDate(today);
    setAvatarMessage('A clean slate is a brave little dragon trick.');
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekActivity = [true, true, false, true, true, true, true];
  const visibleTasks = activeTab === 'today' ? tasks : tasks.filter((task) => task.done);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FFF8EF] font-sans text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -right-24 top-48 h-72 w-72 rounded-full bg-yellow-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-rose-100/40 blur-3xl" />
      </div>
      <CloudPattern />

      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 pb-7 pt-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-[1.35rem] bg-orange-500 text-white shadow-[0_10px_25px_rgba(249,115,22,0.3)]">
            <DragonMark />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">DragonStreak</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Your tiny dragon for big promises</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
          <Flame className="size-4 text-orange-500" fill="currentColor" />
          <span className="font-black text-orange-600">{streak}</span>
          <span className="text-xs font-semibold text-slate-500">day streak</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 pb-28 sm:px-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)] lg:pb-8">
        <section className="space-y-5">
          <HeroCard progress={progress} streak={streak} totalDone={totalDone} emotion={emotion} />

          <Card className="overflow-hidden border-orange-100 bg-white/85 shadow-[0_18px_50px_rgba(121,66,22,0.08)] backdrop-blur">
            <CardHeader className="border-b border-orange-50 px-5 pb-4 pt-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-600">Daily mission board</Badge>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">8:00 PM ritual</span>
                  </div>
                  <CardTitle className="text-2xl font-extrabold tracking-tight sm:text-3xl">What will you make happen today?</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-slate-500">The dragon remembers your promises. Finish them, and tomorrow gets easier.</p>
                </div>
                <Button onClick={() => setIsPromptOpen(true)} className="rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
                  <Plus className="mr-2 size-4" />
                  Add tomorrow's quest
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-5 sm:px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-slate-100 p-1 sm:w-auto">
                  <TabsTrigger value="today" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Today</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Streak history</TabsTrigger>
                </TabsList>
                <div className="mt-5">
                  {activeTab === 'today' ? (
                                      <TaskCarousel tasks={tasks} carouselIndex={carouselIndex} onSelect={selectPendingTask} onComplete={completeTask} />
                                    ) : (
                                      <HistoryPanel tasks={tasks} totalDone={totalDone} weekDays={weekDays} weekActivity={weekActivity} />
                                    )}
                </div>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-orange-100 bg-white/70 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-row items-center gap-4 px-5 pb-4 pt-5 sm:px-6">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-yellow-100 text-yellow-600">
                <BellRing className="size-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-extrabold">The 8 PM dragon ritual</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Set your next-day goals while your brain is still warm.</p>
              </div>
              <Button onClick={() => setIsPromptOpen(true)} variant="outline" className="ml-auto rounded-full border-orange-200 bg-white text-orange-600 hover:bg-orange-50">
                <CalendarCheck className="mr-2 size-4" />
                Open prompt
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 sm:px-6">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">Ask at 8:00 PM</span>
                <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">Carry unfinished quests forward</span>
                <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">Celebrate every promise kept</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-5">
          <MascotCard emotion={emotion} />
          <Card className="border-orange-100 bg-white/85 shadow-sm backdrop-blur">
            <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                <Zap className="size-4 text-orange-500" />
                Momentum meter
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 sm:px-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily promise</p>
                  <p className="mt-1 text-4xl font-black tracking-tight text-orange-500">{progress}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dragon mood</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-700">{emotion.title}</p>
                </div>
              </div>
              <Progress value={progress} className="mt-5 h-3 rounded-full bg-orange-100" />
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{doneToday.length} done</span>
                <span>{pendingTasks.length} waiting</span>
                <span>{totalDone} lifetime</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-gradient-to-br from-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-orange-500/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-100">Tiny reminder</p>
                <h3 className="mt-2 text-lg font-extrabold leading-tight">The dragon is not judging. It is rooting.</h3>
              </div>
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
                <Sparkles className="size-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-orange-50 text-orange-100/90">If a task slips, it does not vanish. It becomes tomorrow's first tiny win.</p>
            <Button onClick={() => setShowMiniWidget((value) => !value)} variant="outline" className="mt-5 w-full rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20">
              {showMiniWidget ? 'Hide' : 'Show'} floating widget
            </Button>
          </Card>
        </aside>
      </div>

      {showMiniWidget && <FloatingWidget emotion={emotion} progress={progress} pending={pendingTasks.length} />}

      <GoalPrompt open={isPromptOpen} onClose={() => setIsPromptOpen(false)} onSubmit={(title, type, minutes) => {
          if (!title.trim()) return;
          const task: Task = {
            id: `task-${Date.now()}`,
            title: title.trim(),
            type: type,
            estimatedMinutes: minutes,
            done: false,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          setTasks((current) => [task, ...current]);
          setIsPromptOpen(false);
          setAvatarMessage('Tomorrow has a plan now. The dragon is proud already.');
        }} />
    </main>
  );
};

function HeroCard({ progress, streak, totalDone, emotion }: { progress: number; streak: number; totalDone: number; emotion: typeof emotionCopy[Emotion] }) {
  return (
    <Card className="overflow-hidden border-orange-100 bg-white shadow-[0_22px_60px_rgba(121,66,22,0.12)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-rose-500 to-violet-500 p-7 text-white sm:p-9">
        <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/15" />
        <div className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
              <MoonStar className="size-3.5" />
              Tonight’s dragon mood
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{emotion.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-orange-50">{emotion.message}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <MomentumPill label="streak" value={`${streak}d`} />
            <MomentumPill label="completed" value={`${totalDone}`} />
            <MomentumPill label="promise" value={`${progress}%`} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function MomentumPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/25 bg-white/15 px-3 py-3 text-center backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-100">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function TaskCarousel({ tasks, carouselIndex, onSelect, onComplete }: { tasks: Task[]; carouselIndex: number; onSelect: (index: number) => void; onComplete: (id: string) => void }) {
  const pending = tasks.filter((task) => !task.done);
  const visible = pending.length ? pending : tasks;
  const active = visible[Math.min(carouselIndex, visible.length - 1)];
  const activeIndex = visible.indexOf(active);
  const activeMeta = typeMeta[active.type];
  return (
    <div className="min-h-[280px]">
      {pending.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending carousel</span>
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-600">{carouselIndex + 1} / {pending.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button aria-label="Previous task" onClick={() => onSelect((activeIndex - 1 + pending.length) % pending.length)} variant="outline" className="size-8 rounded-full border-orange-200 bg-white hover:bg-orange-50">
              <ChevronLeft className="size-4" />
            </Button>
            <Button aria-label="Next task" onClick={() => onSelect((activeIndex + 1) % pending.length)} variant="outline" className="size-8 rounded-full border-orange-200 bg-white hover:bg-orange-50">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${activeMeta.color} rounded-full border`}>{activeMeta.icon}{activeMeta.label}</Badge>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">{active.estimatedMinutes} min</span>
          </div>
          <h3 className="mt-4 text-xl font-extrabold leading-tight sm:text-2xl">{active.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">Drag the dragon forward by doing this one thing. You can make the first step tiny.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-white px-3 py-1.5">Due today</span>
            <span className="rounded-full bg-white px-3 py-1.5">Carries forward if missed</span>
          </div>
        </div>
        <Button onClick={() => onComplete(active.id)} className="group h-full min-h-[154px] flex-col items-start justify-between rounded-[1.5rem] bg-orange-500 px-6 text-left text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-100">Mark complete</span>
            <span className="grid size-10 place-items-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
              <Check className="size-5" />
            </span>
          </div>
          <span className="text-sm font-semibold text-orange-50">I did it 🐉</span>
        </Button>
      </div>
      {tasks.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tasks.map((task) => (
            <button key={task.id} onClick={() => task.done && onSelect(tasks.indexOf(task))} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${task.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-orange-600'}`}>
              {task.done ? <Check className="mr-1 inline size-3" /> : <span className="mr-1 inline-block size-3 rounded-full border-2 border-current opacity-50" />}
              {task.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ tasks, totalDone, weekDays, weekActivity }: { tasks: Task[]; totalDone: number; weekDays: string[]; weekActivity: boolean[] }) {
  const completed = tasks.filter((task) => task.done);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Accuracy snapshot</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{completed.length ? `${Math.round((completed.reduce((sum, task) => sum + (task.accuracy || 0), 0) / completed.length))}%` : '--'}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
          <Trophy className="size-5" />
        </div>
      </div>
      <div className="space-y-2">
        {completed.slice(0, 5).map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-emerald-900">{task.title}</p>
              <p className="mt-1 text-xs text-emerald-700">{taskTypeLabels[task.type]} · {task.accuracy}% accuracy</p>
            </div>
            <span className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white"><Check className="size-4" /></span>
          </div>
        ))}
        {!completed.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">Complete a task to start your accuracy trail.</p>}
      </div>
      <div className="rounded-2xl border border-orange-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><CalendarCheck className="size-4 text-orange-500" /> Last seven days</div>
          <span className="text-xs font-semibold text-slate-400">6 / 7 days</span>
        </div>
        <div className="mt-4 flex items-end gap-2">
          {weekActivity.map((active, index) => (
            <div key={weekDays[index]} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={`w-full rounded-t-lg ${active ? 'bg-orange-400' : 'bg-slate-200'}`} style={{ height: active ? `${18 + index * 6}px` : '12px' }} />
              <span className={`text-[10px] font-bold ${active ? 'text-orange-600' : 'text-slate-400'}`}>{weekDays[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MascotCard({ emotion }: { emotion: typeof emotionCopy[Emotion] }) {
  return (
    <Card className="overflow-hidden border-orange-100 bg-white shadow-[0_18px_50px_rgba(121,66,22,0.1)]">
      <div className={`relative h-52 overflow-hidden ${emotion.tone}`}>
        <div className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/50" />
        <div className="absolute -bottom-12 right-8 h-36 w-36 rounded-full bg-white/35" />
        <div className="absolute left-5 top-5 rounded-full bg-white/45 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Live dragon feed</div>
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dragon reaction</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{emotion.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{emotion.message}</p>
          </div>
          <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-xl">
            <div className="text-4xl leading-none animate-bounce-slow">{emotion.expression}</div>
          </div>
        </div>
      </div>
      <CardContent className="px-5 pb-5 pt-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <HeartHandshake className="size-4 text-rose-500" />
          <span>Press the floating dragon to see your next move.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FloatingWidget({ emotion, progress, pending }: { emotion: typeof emotionCopy[Emotion]; progress: number; pending: number }) {
  return (
    <button onClick={() => window.dispatchEvent(new CustomEvent('dragonstreak:widget-click'))} className="fixed bottom-5 right-5 z-30 grid size-16 place-items-center rounded-full border-4 border-white bg-orange-500 text-2xl shadow-[0_14px_35px_rgba(249,115,22,0.4)] transition-transform hover:-translate-y-1 hover:scale-105 active:scale-95">
      <span className="animate-pulse">{emotion.expression}</span>
      <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-white text-xs font-black text-orange-600 shadow">{pending}</span>
      <span className="absolute -left-1 -top-1 grid size-6 place-items-center rounded-full bg-white text-xs font-black text-orange-600 shadow">{progress}%</span>
    </button>
  );
}

function GoalPrompt({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (title: string, type: TaskType, minutes: number) => void }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('focus');
  const [newTaskMinutes, setNewTaskMinutes] = useState(25);
  
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md rounded-[2rem] border-orange-100 bg-white p-0 shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-100 to-rose-100 px-6 pb-6 pt-8 text-center">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/40" />
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-orange-500 text-4xl shadow-lg shadow-orange-500/25 animate-bounce-slow">🐉</div>
          <DialogHeader className="relative mt-5">
            <DialogTitle className="text-2xl font-black tracking-tight">Tomorrow's tiny dragon pact</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-500">Name one promise you will keep. Your dragon will show up at 8 PM to ask.</DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(newTaskTitle, newTaskType, newTaskMinutes); }} className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-sm font-bold">What should I ask you tomorrow?</Label>
            <Input id="goal" autoFocus placeholder="e.g. Finish one page of my notebook" className="h-12 rounded-xl border-orange-200 bg-orange-50 px-4 text-sm font-semibold" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-bold">Task type</Label>
              <select id="type" value={newTaskType} onChange={(event) => setNewTaskType(event.target.value as TaskType)} className="h-12 w-full rounded-xl border border-orange-200 bg-white px-3 text-sm font-semibold text-slate-700">
                {Object.entries(taskTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes" className="text-sm font-bold">Minutes</Label>
              <Input id="minutes" type="number" min="5" max="240" value={newTaskMinutes} onChange={(event) => setNewTaskMinutes(Number(event.target.value))} className="h-12 rounded-xl border border-orange-200 px-4 text-sm font-semibold" />
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" onClick={onClose} variant="outline" className="h-12 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50">Not yet</Button>
            <Button type="submit" className="h-12 rounded-xl bg-orange-500 px-6 font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
              <Sparkles className="mr-2 size-4" />
              Yes, let’s do this
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BookOpenIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
}

function DragonMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-8" fill="none">
      <path d="M13 35c2-10 9-18 19-20 9-2 18 2 20 10 1 5-2 8-5 11l-5 5" fill="#FFF3D6" opacity="0" />
      <path d="M13 35c-1-10 5-20 15-24 10-4 22-1 27 8 3 6 1 12-4 16l-6 5" fill="#FF6B35" />
      <path d="M13 35c-1-10 5-20 15-24 10-4 22-1 27 8 3 6 1 12-4 16l-6 5" stroke="#D9481D" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 20c-2-5 0-9 5-11 2 4 3 8 1 12" fill="#FFB36B" />
      <circle cx="38" cy="27" r="4" fill="#fff" /><circle cx="39" cy="28" r="2" fill="#1E293B" />
      <path d="M25 36c5 5 13 5 18 0" stroke="#8A3B18" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 38l-6 3m42-3 6 3m-46 1 4 5m34-5-4 5" stroke="#D9481D" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 47c5 5 15 5 20 0" stroke="#D9481D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloudPattern() {
  return (
    <div aria-hidden="true" className="absolute inset-0 opacity-50">
      <div className="absolute left-[8%] top-[14%] h-10 w-28 rounded-full bg-slate-200/70" />
      <div className="absolute left-[11%] top-[10%] h-12 w-22 rounded-full bg-slate-200/60" />
      <div className="absolute right-[12%] top-[22%] h-8 w-24 rounded-full bg-orange-200/50" />
      <div className="absolute right-[16%] top-[18%] h-10 w-20 rounded-full bg-orange-200/50" />
      <div className="absolute bottom-[18%] left-[24%] h-7 w-20 rounded-full bg-yellow-200/50" />
      <div className="absolute bottom-[15%] left-[27%] h-9 w-16 rounded-full bg-yellow-200/50" />
      <div className="absolute left-[50%] top-[12%] h-5 w-16 rounded-full bg-rose-200/50" />
    </div>
  );
}

export { DragonStreakApp };
