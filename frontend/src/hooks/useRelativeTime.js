<<<<<<< HEAD
﻿import { useState, useEffect, useCallback, useRef } from 'react';

const useRelativeTime = (dateInput, autoUpdate = false) => {
  const [relativeTime, setRelativeTime] = useState('');
  const intervalRef = useRef(null);
  
  // Memoize the format function to prevent unnecessary recreations
  const formatRelativeTime = useCallback((targetDate) => {
    const now = new Date();
    let target;
    
    // Handle different date input types
    try {
      target = new Date(targetDate);
      // Check if date is valid
      if (isNaN(target.getTime())) {
        return 'Invalid date';
      }
    } catch {
      return 'Invalid date';
    }
    
    // Calculate differences
    const diffMs = now - target;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Future dates
    if (diffMs < 0) {
      const futureDiff = Math.abs(diffMs);
      const futureSeconds = Math.floor(futureDiff / 1000);
      const futureMinutes = Math.floor(futureSeconds / 60);
      
      if (futureMinutes < 1) {
        return 'In a few seconds';
      }
      if (futureMinutes < 60) {
        return `In ${futureMinutes} minute${futureMinutes !== 1 ? 's' : ''}`;
      }
      
      // For far future dates, show actual date
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayOfWeek = dayNames[target.getDay()];
      const month = monthNames[target.getMonth()];
      const day = target.getDate();
      const year = target.getFullYear();
      
      return `${dayOfWeek}, ${month} ${day}, ${year}`;
    }
    
    // Past dates
    // Just now (up to 44 seconds)
    if (diffSeconds < 45) {
      return 'Just now';
    }
    
    // 45 seconds to 1 minute
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }
    
    // 1 minute to 59 minutes
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    
    // 1 hour to 23 hours
    if (diffHours < 24) {
      // Check for "Yesterday" - more precise calculation
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (target.getDate() === yesterday.getDate() && 
          target.getMonth() === yesterday.getMonth() && 
          target.getFullYear() === yesterday.getFullYear()) {
        return 'Yesterday';
      }
      
      return `${diffHours}h ago`;
    }
    
    // 1 day to 6 days
    if (diffDays < 7) {
      // Check if it was yesterday (for exact 24-48 hour range)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (target.getDate() === yesterday.getDate() && 
          target.getMonth() === yesterday.getMonth() && 
          target.getFullYear() === yesterday.getFullYear()) {
        return 'Yesterday';
      }
      
      return `${diffDays}d ago`;
    }
    
    // More than 7 days - show exact date with year
    if (diffDays > 7) {
      const day = target.getDate();
      const month = target.toLocaleString('en-US', { month: 'short' });
      const targetYear = target.getFullYear();
      
      return `${day} ${month}, ${targetYear}`;
    }
    
    // 1 week (exactly 7 days)
    return `${diffDays}d ago`;
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial calculation
    setRelativeTime(formatRelativeTime(dateInput));
    
    // Auto-update if enabled
    if (autoUpdate) {
      intervalRef.current = setInterval(() => {
        setRelativeTime(formatRelativeTime(dateInput));
      }, 60000); // Update every minute
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [dateInput, autoUpdate, formatRelativeTime]);

  // Return the relative time string and a manual refresh function
  return relativeTime;
};

export default useRelativeTime;
=======
// Re-export from canonical location
export { default } from '../core/hooks/useRelativeTime';
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
