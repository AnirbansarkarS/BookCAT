import { supabase } from '../lib/supabase';

/**
 * Fetch book data from Google Books API by ISBN
 * @param {string} isbn - The ISBN code to search for
 * @returns {Promise<object|null>} Book data or null if not found
 */
export async function fetchBookByISBN(isbn) {
    try {
        const res = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
        );
        const data = await res.json();

        if (!data.items?.length) {
            return null;
        }

        const book = data.items[0].volumeInfo;

        return {
            isbn,
            title: book.title || 'Unknown Title',
            authors: book.authors?.join(', ') || 'Unknown Author',
            cover_url: book.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
            published_year: book.publishedDate?.split('-')[0] || null,
            description: book.description || null,
        };
    } catch (error) {
        console.error('Error fetching book from Google Books API:', error);
        throw new Error('Failed to fetch book data');
    }
}

/**
 * Get all books for a specific user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of books
 */
export async function getUserBooks(userId) {
    try {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user books:', error);
        throw error;
    }
}

/**
 * Add a new book to the database
 * @param {string} userId - The user's ID
 * @param {object} bookData - Book data object
 * @returns {Promise<object>} The created book record
 */
export async function addBook(userId, bookData) {
    try {
        const { data, error } = await supabase
            .from('books')
            .insert([
                {
                    user_id: userId,
                    ...bookData,
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding book:', error);
        throw error;
    }
}

/**
 * Update book status and progress
 * @param {string} bookId - The book's ID
 * @param {string} status - New status
 * @param {number} progress - Reading progress (0-100)
 * @returns {Promise<object>} The updated book record
 */
export async function updateBookStatus(bookId, status, progress) {
    try {
        const { data, error } = await supabase
            .from('books')
            .update({ status, progress })
            .eq('id', bookId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating book status:', error);
        throw error;
    }
}

/**
 * Delete a book
 * @param {string} bookId - The book's ID
 * @returns {Promise<void>}
 */
export async function deleteBook(bookId) {
    try {
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', bookId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting book:', error);
        throw error;
    }
}

/**
 * Check if a book with the same ISBN already exists for the user
 * @param {string} userId - The user's ID
 * @param {string} isbn - The ISBN to check
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateISBN(userId, isbn) {
    if (!isbn) return false;

    try {
        const { data, error } = await supabase
            .from('books')
            .select('id')
            .eq('user_id', userId)
            .eq('isbn', isbn)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking duplicate ISBN:', error);
        return false;
    }
}
