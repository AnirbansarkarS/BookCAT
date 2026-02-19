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