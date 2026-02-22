// src/services/discoverService.js
import { supabase } from '../lib/supabase';

/**
 * Get trending books based on community activity
 */
export const getTrendingBooks = async () => {
    try {
        // Get books with most recent activity (sessions, completions)
        const { data, error } = await supabase
            .from('books')
            .select(`
                *,
                profiles!books_user_id_fkey(username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        // Calculate trending score based on recent sessions
        // In production, you'd query reading_sessions joined with books
        return data || [];
    } catch (error) {
        console.error('Error fetching trending books:', error);
        return [];
    }
};

/**
 * Get active readers with their current books
 */
export const getActiveReaders = async () => {
    try {
        // Get users with recent reading sessions
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                username,
                avatar_url,
                book_count,
                total_reading_time
            `)
            .order('total_reading_time', { ascending: false })
            .limit(10);

        if (error) throw error;

        // For each user, get their current reading book
        // In production, join with books where status = 'reading_now'
        return data || [];
    } catch (error) {
        console.error('Error fetching active readers:', error);
        return [];
    }
};

/**
 * Get new book releases from Google Books API
 */
export const getNewReleases = async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=publishedDate:${dateStr}&orderBy=newest&maxResults=10&langRestrict=en`
        );

        if (!response.ok) throw new Error('Failed to fetch new releases');

        const data = await response.json();

        return (data.items || []).map(item => ({
            id: item.id,
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors?.join(', ') || 'Unknown',
            cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
            releaseDate: item.volumeInfo.publishedDate,
            description: item.volumeInfo.description,
        }));
    } catch (error) {
        console.error('Error fetching new releases:', error);
        return [];
    }
};

/** * Get today's quiz question.
 * Returns null if no quiz has been generated yet for today.
 */
export const getDailyQuiz = async () => {
    try {
        const todayUTC = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('daily_quiz')
            .select('*')
            .eq('quiz_date', todayUTC)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    } catch (error) {
        console.error('Error fetching daily quiz:', error);
        return null;
    }
};

/**
 * Get quiz history (past N quizzes, newest first).
 */
export const getQuizHistory = async (limit = 30) => {
    try {
        const { data, error } = await supabase
            .from('daily_quiz')
            .select('*')
            .order('quiz_date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching quiz history:', error);
        return [];
    }
};

/**
 * Submit a user's answer for a quiz.
 * Returns { is_correct, explanation, correct_answer }.
 */
export const submitQuizAnswer = async (userId, quizId, selectedAnswer, correctAnswer) => {
    try {
        const is_correct = selectedAnswer === correctAnswer;

        const { error } = await supabase
            .from('user_quiz_answers')
            .upsert({
                user_id: userId,
                quiz_id: quizId,
                selected_answer: selectedAnswer,
                is_correct,
            }, { onConflict: 'user_id,quiz_id' });

        if (error) throw error;
        return { is_correct, error: null };
    } catch (error) {
        console.error('Error submitting quiz answer:', error);
        return { is_correct: false, error };
    }
};

/**
 * Get the current user's answer for a specific quiz (if already answered).
 */
export const getUserQuizAnswer = async (userId, quizId) => {
    try {
        const { data, error } = await supabase
            .from('user_quiz_answers')
            .select('selected_answer, is_correct, answered_at')
            .eq('user_id', userId)
            .eq('quiz_id', quizId)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    } catch (error) {
        console.error('Error fetching user quiz answer:', error);
        return null;
    }
};

/**
 * Get quiz streak for a user (consecutive days answered correctly).
 */
export const getUserQuizStreak = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('user_quiz_answers')
            .select('is_correct, answered_at, daily_quiz(quiz_date)')
            .eq('user_id', userId)
            .order('answered_at', { ascending: false })
            .limit(60);

        if (error) throw error;

        let streak = 0;
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        for (let i = 0; i < (data || []).length; i++) {
            const row = data[i];
            const quizDate = new Date(row.daily_quiz?.quiz_date);
            quizDate.setUTCHours(0, 0, 0, 0);

            const expectedDate = new Date(today);
            expectedDate.setUTCDate(today.getUTCDate() - i);

            if (quizDate.getTime() !== expectedDate.getTime()) break;
            if (!row.is_correct) break;
            streak++;
        }

        return streak;
    } catch (error) {
        console.error('Error fetching quiz streak:', error);
        return 0;
    }
};

/**
 * Manually trigger AI quiz generation (for testing / admin use).
 */
export const triggerQuizGeneration = async () => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-daily-quiz');
        if (error) {
            // Extract the actual response body for debugging
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const body = await error.context.json();
                    console.error('Edge Function error body:', body);
                } catch (_) { /* ignore parse error */ }
            }
            throw error;
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error triggering quiz generation:', error);
        return { success: false, error };
    }
};

/** * Fetch publisher updates from the publisher_updates table.
 * Populated by the fetch-publisher-feeds Edge Function (runs every 6h).
 *
 * @param {number} limit - max results to return (default 20)
 * @param {string|null} publisherSlug - optional filter by single publisher slug
 */
export const getPublisherUpdates = async (limit = 20, publisherSlug = null) => {
    try {
        let query = supabase
            .from('publisher_updates')
            .select('id, publisher, publisher_slug, title, summary, link, image_url, published_at')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (publisherSlug) {
            query = query.eq('publisher_slug', publisherSlug);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching publisher updates:', error);
        return [];
    }
};

/**
 * Trigger a manual refresh of publisher feeds.
 * Calls the Edge Function directly (useful for a "Refresh" button).
 */
export const triggerPublisherFeedRefresh = async () => {
    try {
        const { supabase: sb } = await import('../lib/supabase');
        const { data, error } = await sb.functions.invoke('fetch-publisher-feeds');
        if (error) throw error;
        return { success: true, stats: data?.stats };
    } catch (error) {
        console.error('Error triggering feed refresh:', error);
        return { success: false, error };
    }
};

/**
 * Fetch Penguin Random House Instagram posts
 * Note: Instagram API requires authentication
 * For demo, return mock data or use Instagram Basic Display API
 */
export const getPenguinInstagramPosts = async () => {
    try {
        // In production, use Instagram Graph API:
        // https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token=YOUR_TOKEN
        
        // For now, return structured data
        // You can implement a backend endpoint that fetches from Instagram API
        
        return [
            {
                id: '1',
                image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=400&fit=crop',
                caption: '📚 New arrivals that will transport you to another world',
                likes: 12453,
                comments: 234,
                permalink: 'https://www.instagram.com/p/example1/'
            },
            {
                id: '2',
                image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop',
                caption: 'Weekend reading goals 💫',
                likes: 8921,
                comments: 156,
                permalink: 'https://www.instagram.com/p/example2/'
            },
            {
                id: '3',
                image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop',
                caption: 'Vintage vibes for your TBR pile 📖',
                likes: 15678,
                comments: 289,
                permalink: 'https://www.instagram.com/p/example3/'
            },
        ];
    } catch (error) {
        console.error('Error fetching Instagram posts:', error);
        return [];
    }
};

/**
 * Get community reading trends
 */
export const getReadingTrends = async () => {
    try {
        // Query books grouped by tags/genres with counts
        const { data, error } = await supabase
            .rpc('get_genre_trends'); // You'd create this SQL function

        if (error) {
            // Fallback to manual query
            const { data: books } = await supabase
                .from('books')
                .select('tags');

            // Count genre occurrences
            const genreCounts = {};
            books?.forEach(book => {
                book.tags?.forEach(tag => {
                    genreCounts[tag] = (genreCounts[tag] || 0) + 1;
                });
            });

            // Convert to array and calculate percentages
            const total = Object.values(genreCounts).reduce((a, b) => a + b, 0);
            return Object.entries(genreCounts)
                .map(([genre, count]) => ({
                    genre,
                    count,
                    percentage: Math.round((count / total) * 100),
                    change: '+0%' // Calculate from historical data
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching reading trends:', error);
        return [];
    }
};

/**
 * Get community stats
 */
export const getCommunityStats = async () => {
    try {
        const [booksResult, usersResult, sessionsResult] = await Promise.all([
            supabase.from('books').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('reading_sessions')
                .select('duration_minutes')
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        const totalBooks = booksResult.count || 0;
        const totalUsers = usersResult.count || 0;
        const weeklyMinutes = sessionsResult.data?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
        const weeklyHours = Math.round(weeklyMinutes / 60);

        // Count active today (users with sessions in last 24h)
        const { data: recentSessions } = await supabase
            .from('reading_sessions')
            .select('user_id')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const activeToday = new Set(recentSessions?.map(s => s.user_id) || []).size;

        return {
            totalBooks,
            totalUsers,
            activeToday,
            weeklyHours,
        };
    } catch (error) {
        console.error('Error fetching community stats:', error);
        return {
            totalBooks: 0,
            totalUsers: 0,
            activeToday: 0,
            weeklyHours: 0,
        };
    }
};

/**
 * Get or create fun fact of the day
 */
export const getFunFactOfDay = () => {
    const facts = [
        "The smell of old books is caused by the breakdown of chemical compounds in the paper.",
        "The longest novel ever written is 'Artamène ou le Grand Cyrus' at 13,095 pages.",
        "Iceland publishes more books per capita than any other country.",
        "The most expensive book ever sold was the Codex Leicester by Leonardo da Vinci for $30.8 million.",
        "Reading can reduce stress by up to 68% in just 6 minutes.",
        "The oldest known library was in ancient Mesopotamia, dating back to 2600 BC.",
        "J.K. Rowling was the first billionaire author.",
        "The word 'bookworm' originally referred to insects that ate through books.",
        "Oxford University has a library book that has been overdue for 350 years.",
        "The Guinness Book of World Records holds the record for being the most stolen book from libraries.",
    ];

    // Return a different fact each day
    const dayOfYear = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return facts[dayOfYear % facts.length];
};

/**
 * Get hot takes / controversial opinions
 */
export const getHotTakes = async () => {
    try {
        // In production, fetch from a dedicated hot_takes table
        // For now, return static data with ability to vote
        
        return [
            { id: 1, text: "E-readers are better than physical books for the environment", agree: 67, disagree: 33, author: 'BookLover23' },
            { id: 2, text: "You should finish every book you start, no matter what", agree: 42, disagree: 58, author: 'ReadingRebel' },
            { id: 3, text: "Audio books are just as legitimate as reading", agree: 78, disagree: 22, author: 'AudioFan99' },
            { id: 4, text: "Spoilers actually enhance the reading experience", agree: 23, disagree: 77, author: 'SpoilerKing' },
        ];
    } catch (error) {
        console.error('Error fetching hot takes:', error);
        return [];
    }
};

/**
 * Vote on a hot take
 */
export const voteOnHotTake = async (takeId, vote) => {
    try {
        // In production, store votes in database
        // Return updated percentages
        console.log(`Voted ${vote} on take ${takeId}`);
        return { success: true };
    } catch (error) {
        console.error('Error voting on hot take:', error);
        return { success: false, error };
    }
};