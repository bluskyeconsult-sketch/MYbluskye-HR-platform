// src/utils/safeDate.js
export function safeFormatDate(dateValue, defaultValue = '') {
  if (!dateValue) return defaultValue;
  
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return defaultValue;
  
  return d.toISOString().split('T')[0];
}

export function safeParseDate(dateString) {
  if (!dateString) return null;
  
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  
  return d;
}

// For input type="date" - prevents NaN errors
export function getDateInputValue(dateValue) {
  if (!dateValue) return '';
  
  // Handle different date formats
  let d;
  if (typeof dateValue === 'string') {
    d = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    d = dateValue;
  } else {
    return '';
  }
  
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
