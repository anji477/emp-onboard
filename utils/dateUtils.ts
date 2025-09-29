// Centralized date utility functions

/**
 * Convert any date to YYYY-MM-DD format for HTML input fields
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/**
 * Convert date to readable display format (e.g., "Jan 15, 2024")
 */
export const formatDateForDisplay = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
};

/**
 * Parse database date safely without timezone issues
 */
export const parseDbDate = (dbDate: string | null | undefined): Date | null => {
  if (!dbDate) return null;
  
  try {
    // Handle MySQL date format (YYYY-MM-DD)
    if (typeof dbDate === 'string' && dbDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dbDate.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    
    const date = new Date(dbDate);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};