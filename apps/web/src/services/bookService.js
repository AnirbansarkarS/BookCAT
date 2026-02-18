// src/services/bookService.js
import { supabase } from '../lib/supabase';

/**
 * Get all books for a user
 */
export const getUserBooks = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }); // ✅ NOT updated_at

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching books:', error);
        return [];
    }
};

/**
 * Add a new book
 */
export const addBook = async (userId, bookData) => {
    try {
        const { data, error } = await supabase
            .from('books')
            .insert([{
                user_id: userId,
                title: bookData.title,
                authors: bookData.authors,
                cover_url: bookData.cover_url,
                status: bookData.status || 'Want to Read',
                progress: 0,
                current_page: 0,
                total_pages: bookData.total_pages || null,
                tags: bookData.tags || [],
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error adding book:', error);
        return { data: null, error };
    }
};

/**
 * Update book details — FIXED: no updated_at column
 */
export const updateBookDetails = async (bookId, updates) => {
    try {
        if (!bookId) {
            throw new Error('bookId is required');
        }

        // Validate and clean updates
        const cleanUpdates = {};
        
        if (updates.status !== undefined) {
            cleanUpdates.status = updates.status;
        }
        
        if (updates.current_page !== undefined) {
            cleanUpdates.current_page = Math.max(0, Math.floor(Number(updates.current_page) || 0));
        }
        
        if (updates.total_pages !== undefined) {
            cleanUpdates.total_pages = updates.total_pages ? Math.max(0, Math.floor(Number(updates.total_pages))) : null;
        }
        
        if (updates.progress !== undefined) {
            cleanUpdates.progress = Math.min(100, Math.max(0, Math.floor(Number(updates.progress) || 0)));
        }
        
        if (updates.tags !== undefined) {
            cleanUpdates.tags = Array.isArray(updates.tags) ? updates.tags : [];
        }

        // ✅ REMOVED: cleanUpdates.updated_at (column doesn't exist)

        console.log('📝 Updating book:', bookId, cleanUpdates);

        const { data, error } = await supabase
            .from('books')
            .update(cleanUpdates)
            .eq('id', bookId)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating book:', error);
            throw error;
        }

        console.log('✅ Book updated successfully:', data);
        return { data, error: null };
    } catch (error) {
        console.error('Error updating book details:', error);
        return { data: null, error };
    }
};

/**
 * Delete a book
 */
export const deleteBook = async (bookId) => {
    try {
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', bookId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting book:', error);
        return { error };
    }
};

/**
 * Log a reading session with proper validation
 */
export const logReadingSession = async (userId, bookId, durationMinutes, pagesRead = 0, intent = null) => {
    try {
        if (!userId || !bookId) {
            throw new Error('userId and bookId are required');
        }

        // Ensure duration is a valid positive integer (minimum 1)
        const validDuration = Math.max(1, Math.floor(Number(durationMinutes) || 0));
        
        // Ensure pages is a valid non-negative integer
        const validPages = Math.max(0, Math.floor(Number(pagesRead) || 0));

        console.log('📝 Logging reading session:', {
            userId,
            bookId,
            durationMinutes: validDuration,
            pagesRead: validPages,
            intent
        });

        const { data, error } = await supabase
            .from('reading_sessions')
            .insert([{
                user_id: userId,
                book_id: bookId,
                duration_minutes: validDuration,
                pages_read: validPages,
                intent: intent || null,
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) {
            console.error('❌ Error logging session:', error);
            throw error;
        }

        console.log('✅ Session logged successfully:', data);
        return { data, error: null };
    } catch (error) {
        console.error('Error logging reading session:', error);
        return { data: null, error };
    }
};

/**
 * Fetch all reading sessions for a user
 */
export const getReadingSessions = async (userId) => {
    try {
        if (!userId) {
            console.warn('No userId provided to getReadingSessions');
            return [];
        }

        const { data, error } = await supabase
            .from('reading_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reading sessions:', error);
            throw error;
        }

        console.log(`📊 Fetched ${data?.length || 0} reading sessions`);
        return data || [];
    } catch (error) {
        console.error('Error fetching reading sessions:', error);
        return [];
    }
};

/**
 * Search for books using Google Books API
 */
export const searchBooks = async (query) => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`
        );
        
        if (!response.ok) {
            throw new Error('Failed to search books');
        }

        const data = await response.json();
        
        return (data.items || []).map(item => ({
            google_id: item.id,
            title: item.volumeInfo.title,
            authors: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
            cover_url: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
            total_pages: item.volumeInfo.pageCount || null,
            description: item.volumeInfo.description || null,
        }));
    } catch (error) {
        console.error('Error searching books:', error);
        return [];
    }
};

/**
 * Check if a book with the same ISBN already exists
 */
export const checkDuplicateISBN = async (userId, isbn) => {
    if (!isbn) return { exists: false, book: null };
    
    try {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userId)
            .eq('isbn', isbn)
            .maybeSingle();

        if (error) throw error;
        return { exists: !!data, book: data };
    } catch (error) {
        console.error('Error checking duplicate ISBN:', error);
        return { exists: false, book: null };
    }
};

/**
 * Get a specific book by ID
 */
export const getBookById = async (bookId) => {
    try {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching book:', error);
        return null;
    }
};

/**
 * Fetch book details by ISBN from Google Books API
 */
export const fetchBookByISBN = async (isbn) => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch book data');
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            return null;
        }

        const book = data.items[0].volumeInfo;

        return {
            isbn: isbn,
            title: book.title || '',
            authors: book.authors?.join(', ') || '',
            published_year: book.publishedDate?.split('-')[0] || '',
            total_pages: book.pageCount || null,
            description: book.description || '',
            cover_url: book.imageLinks?.thumbnail?.replace('http:', 'https:') || book.imageLinks?.smallThumbnail?.replace('http:', 'https:') || null,
            publisher: book.publisher || '',
            categories: book.categories?.join(', ') || '',
        };
    } catch (error) {
        console.error('Error fetching book by ISBN:', error);
        return null;
    }
};

/**
 * Update book status (Reading, Completed, etc.)
 */
export const updateBookStatus = async (bookId, status) => {
    try {
        const { data, error } = await supabase
            .from('books')
            .update({ status })
            .eq('id', bookId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating book status:', error);
        return { data: null, error };
    }
};

/**
 * Update book progress
 */
export const updateBookProgress = async (bookId, progress, currentPage = null) => {
    try {
        const updates = { progress };
        if (currentPage !== null) {
            updates.current_page = currentPage;
        }

        const { data, error } = await supabase
            .from('books')
            .update(updates)
            .eq('id', bookId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating book progress:', error);
        return { data: null, error };
    }
};