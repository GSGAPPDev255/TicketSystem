// src/lib/rlsErrorHandler.js
// Handles RLS permission errors with user-friendly messages

export function handleRLSError(error, showToast) {
  // Check if it's an RLS permission error
  if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
    showToast('You do not have permission to access this resource', 'error');
    return true;
  }

  // Check for other permission-related errors
  if (error?.code === '42501' || error?.message?.includes('permission denied')) {
    showToast('Permission denied. Please contact your administrator.', 'error');
    return true;
  }

  // Check for constraint violations
  if (error?.code === '23505') {
    showToast('This record already exists', 'error');
    return true;
  }

  if (error?.code === '23503') {
    showToast('Cannot delete: this item is referenced by other records', 'error');
    return true;
  }

  // Generic database error
  if (error?.code?.startsWith('23') || error?.code?.startsWith('42')) {
    showToast('Database error. Please try again.', 'error');
    return true;
  }

  // Network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    showToast('Network error. Please check your connection.', 'error');
    return true;
  }

  return false; // Not an RLS error
}

// Wrapper for Supabase queries with automatic error handling
export async function supabaseQuery(queryFn, showToast, successMessage = null) {
  try {
    const result = await queryFn();
    
    if (result.error) {
      const handled = handleRLSError(result.error, showToast);
      if (!handled) {
        showToast(result.error.message || 'An error occurred', 'error');
      }
      return { data: null, error: result.error };
    }

    if (successMessage) {
      showToast(successMessage, 'success');
    }

    return result;
  } catch (error) {
    const handled = handleRLSError(error, showToast);
    if (!handled) {
      showToast('An unexpected error occurred', 'error');
    }
    return { data: null, error };
  }
}
