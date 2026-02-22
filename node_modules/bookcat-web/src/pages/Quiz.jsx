import React, { useState, useEffect } from 'react';
import {
    Brain, CheckCircle, XCircle, Clock, BookOpen,
    Zap, Award, RefreshCw, ChevronLeft, Loader2, Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import {
    getDailyQuiz,
    getQuizHistory,
    submitQuizAnswer,
    getUserQuizAnswer,
    getUserQuizStreak,
} from '../services/discoverService';

// ─── Quiz type meta ────────────────────────────────────────────────────────────
const QUIZ_TYPE_META = {
    quote:  { label: 'Guess the Book',    color: 'from-violet-500 to-purple-600',  icon: BookOpen },
    author: { label: 'Who Wrote This?',   color: 'from-blue-500 to-indigo-600',    icon: Brain },
    genre:  { label: 'What Genre?',       color: 'from-emerald-500 to-teal-600',   icon: Award },
    era:    { label: 'Which Era?',        color: 'from-amber-500 to-orange-600',   icon: Clock },
    plot:   { label: 'Match the Plot',    color: 'from-pink-500 to-rose-600',      icon: BookOpen },
    trivia: { label: 'Literary Trivia',   color: 'from-cyan-500 to-sky-600',       icon: Brain },
};

// ─── Single interactive quiz card ─────────────────────────────────────────────
function QuizCard({ quiz, userId, compact = false, initialAnswer = null }) {
    const typeMeta = QUIZ_TYPE_META[quiz.question_type] || QUIZ_TYPE_META.trivia;
    const TypeIcon = typeMeta.icon;

    const [selected, setSelected] = useState(
        initialAnswer !== null ? initialAnswer.selected_answer : null
    );
    const [revealed, setRevealed] = useState(initialAnswer !== null);
    const [submitting, setSubmitting] = useState(false);

    const handleSelect = async (idx) => {
        if (revealed || submitting) return;
        setSelected(idx);
        setSubmitting(true);

        if (userId) {
            await submitQuizAnswer(userId, quiz.id, idx, quiz.correct_answer);
        }

        setRevealed(true);
        setSubmitting(false);
    };

    const isCorrect = selected === quiz.correct_answer;

    return (
        <div className={cn(
            'bg-surface border border-white/5 rounded-2xl overflow-hidden',
            !compact && 'shadow-xl',
        )}>
            {/* Header gradient strip */}
            <div className={cn('bg-gradient-to-r p-4 flex items-center justify-between', typeMeta.color)}>
                <div className="flex items-center gap-2">
                    <TypeIcon className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold text-sm">{typeMeta.label}</span>
                </div>
                <span className="text-white/80 text-xs font-medium">
                    {new Date(quiz.quiz_date + 'T00:00:00').toLocaleDateString('en', {
                        weekday: compact ? undefined : 'short',
                        month: 'short',
                        day: 'numeric',
                    })}
                </span>
            </div>

            <div className={cn('p-4', !compact && 'p-6')}>
                {/* Book + question */}
                <div className="mb-1">
                    <p className="text-xs text-text-muted mb-2">
                        📖 {quiz.book_title}{quiz.book_author ? ` · ${quiz.book_author}` : ''}
                    </p>
                    <p className={cn(
                        'text-white font-semibold leading-snug',
                        compact ? 'text-sm' : 'text-base',
                    )}>
                        {quiz.question}
                    </p>
                </div>

                {/* Options */}
                <div className={cn('grid gap-2', compact ? 'mt-3' : 'mt-4')}>
                    {(quiz.options || []).map((opt, idx) => {
                        const isChosen  = selected === idx;
                        const isCorrectOpt = idx === quiz.correct_answer;

                        let style = 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:border-white/20';
                        if (revealed) {
                            if (isCorrectOpt) {
                                style = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
                            } else if (isChosen && !isCorrectOpt) {
                                style = 'bg-red-500/20 border-red-500/50 text-red-300';
                            } else {
                                style = 'bg-white/[0.02] border-white/5 text-text-muted';
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelect(idx)}
                                disabled={revealed || submitting}
                                className={cn(
                                    'flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium',
                                    style,
                                    !revealed && 'cursor-pointer',
                                    revealed && 'cursor-default',
                                )}
                            >
                                <span className={cn(
                                    'w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-bold',
                                    revealed && isCorrectOpt ? 'border-emerald-500 text-emerald-400 bg-emerald-500/20'
                                        : revealed && isChosen ? 'border-red-500 text-red-400 bg-red-500/20'
                                        : 'border-white/20 text-text-muted',
                                )}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {opt}
                                {revealed && isCorrectOpt && (
                                    <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
                                )}
                                {revealed && isChosen && !isCorrectOpt && (
                                    <XCircle className="w-4 h-4 text-red-400 ml-auto flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Result + explanation */}
                {revealed && (
                    <div className={cn(
                        'mt-4 p-3 rounded-xl border text-sm',
                        isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/20 text-red-300',
                    )}>
                        <p className="font-semibold mb-1">{isCorrect ? '✅ Correct!' : '❌ Not quite!'}</p>
                        {quiz.explanation && (
                            <p className="text-xs text-white/70 leading-relaxed">{quiz.explanation}</p>
                        )}
                    </div>
                )}

                {/* Waiting state */}
                {!revealed && selected === null && !compact && (
                    <p className="mt-4 text-center text-xs text-text-muted">
                        Pick an option above to answer
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Main Quiz Page ────────────────────────────────────────────────────────────
export default function Quiz() {
    const { user } = useAuth();

    const [todayQuiz, setTodayQuiz]       = useState(null);
    const [history, setHistory]           = useState([]);
    const [todayAnswer, setTodayAnswer]   = useState(null);
    const [streak, setStreak]             = useState(0);
    const [loading, setLoading]           = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [userAnswersMap, setUserAnswersMap] = useState({});

    useEffect(() => {
        if (!user) return;
        loadAll();
    }, [user]);

    const loadAll = async () => {
        setLoading(true);
        setHistoryLoading(true);

        const [quiz, hist, st] = await Promise.all([
            getDailyQuiz(),
            getQuizHistory(30),
            getUserQuizStreak(user.id),
        ]);

        setTodayQuiz(quiz);
        setStreak(st);
        setLoading(false);

        setHistory(hist);
        setHistoryLoading(false);

        // Fetch user answers for all quizzes
        if (hist.length > 0) {
            const answerChecks = hist.map(q => getUserQuizAnswer(user.id, q.id));
            const answers = await Promise.all(answerChecks);
            const map = {};
            hist.forEach((q, i) => {
                if (answers[i]) map[q.id] = answers[i];
            });
            setUserAnswersMap(map);

            // Check today's answer
            if (quiz) {
                const a = await getUserQuizAnswer(user.id, quiz.id);
                setTodayAnswer(a);
            }
        }
    };

    // Stats
    const answeredCount  = Object.keys(userAnswersMap).length;
    const correctCount   = Object.values(userAnswersMap).filter(a => a.is_correct).length;
    const accuracy       = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    to="/discover"
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-text-muted hover:text-white"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Brain className="w-7 h-7 text-violet-400" /> Daily Quiz
                    </h1>
                    <p className="text-sm text-text-muted">One literary question per day — can you keep your streak?</p>
                </div>
            </div>

            {/* Streak & stats bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
                    <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-white">{streak}</div>
                    <p className="text-xs text-text-muted">Day Streak</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-white">{correctCount}</div>
                    <p className="text-xs text-text-muted">Correct</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-4 text-center">
                    <Award className="w-6 h-6 text-violet-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-white">{accuracy}%</div>
                    <p className="text-xs text-text-muted">Accuracy</p>
                </div>
            </div>

            {/* Today's quiz */}
            <div>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" /> Today's Challenge
                </h2>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : todayQuiz ? (
                    <QuizCard
                        quiz={todayQuiz}
                        userId={user?.id}
                        initialAnswer={todayAnswer}
                    />
                ) : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-10 text-center">
                        <Brain className="w-12 h-12 text-text-muted mx-auto mb-3" />
                        <p className="text-white font-semibold mb-1">No quiz yet for today</p>
                        <p className="text-sm text-text-muted">
                            The AI generates a new quiz every day at midnight UTC.
                        </p>
                    </div>
                )}
            </div>

            {/* Past quizzes */}
            <div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-400" /> Past Quizzes
                    <span className="text-xs text-text-muted font-normal ml-1">
                        ({history.filter(q => q.id !== todayQuiz?.id).length} quizzes)
                    </span>
                </h2>

                {historyLoading ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-surface border border-white/5 rounded-2xl p-4 animate-pulse space-y-3">
                                <div className="h-6 bg-white/5 rounded w-1/3" />
                                <div className="h-4 bg-white/5 rounded w-full" />
                                <div className="h-10 bg-white/5 rounded" />
                                <div className="h-10 bg-white/5 rounded" />
                                <div className="h-10 bg-white/5 rounded" />
                                <div className="h-10 bg-white/5 rounded" />
                            </div>
                        ))}
                    </div>
                ) : history.filter(q => q.id !== todayQuiz?.id).length === 0 ? (
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                        <p className="text-text-muted text-sm">No past quizzes yet. Come back tomorrow!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {history
                            .filter(q => q.id !== todayQuiz?.id)
                            .map(quiz => (
                                <QuizCard
                                    key={quiz.id}
                                    quiz={quiz}
                                    userId={user?.id}
                                    compact
                                    initialAnswer={userAnswersMap[quiz.id] || null}
                                />
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
