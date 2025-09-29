// Timezone utility functions for consistent timezone handling across the application

export interface TimezoneInfo {
  value: string;
  label: string;
  offset: string;
  region: string;
}

// Get current time in a specific timezone
export const getCurrentTimeInTimezone = (timezone: string): string => {
  try {
    return new Date().toLocaleString('en-US', {
      timeZone: timezone,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    console.error('Invalid timezone:', timezone);
    return new Date().toLocaleString('en-US', { hour12: true });
  }
};

// Get timezone offset in hours
export const getTimezoneOffset = (timezone: string): string => {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
    
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offset));
    const minutes = Math.round((Math.abs(offset) - hours) * 60);
    
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return 'UTC+00:00';
  }
};

// Convert time from one timezone to another
export const convertTimezone = (
  dateTime: string | Date,
  fromTimezone: string,
  toTimezone: string
): Date => {
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    // Create a date string in the source timezone
    const sourceTime = new Date(date.toLocaleString('en-US', { timeZone: fromTimezone }));
    
    // Convert to target timezone
    return new Date(sourceTime.toLocaleString('en-US', { timeZone: toTimezone }));
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return new Date();
  }
};

// Format working hours display with timezone
export const formatWorkingHours = (
  startTime: string,
  endTime: string,
  timezone: string,
  workingDays: string[]
): string => {
  try {
    const daysText = workingDays.length === 7 
      ? 'Every day'
      : workingDays.length === 5 && 
        workingDays.includes('Monday') && 
        workingDays.includes('Tuesday') && 
        workingDays.includes('Wednesday') && 
        workingDays.includes('Thursday') && 
        workingDays.includes('Friday')
      ? 'Monday - Friday'
      : workingDays.join(', ');
    
    const timeZoneAbbr = new Date().toLocaleString('en-US', { 
      timeZone: timezone, 
      timeZoneName: 'short' 
    }).split(' ').pop();
    
    return `${daysText}, ${startTime} - ${endTime} ${timeZoneAbbr}`;
  } catch (error) {
    return `${startTime} - ${endTime}`;
  }
};

// Check if current time is within working hours
export const isWithinWorkingHours = (
  startTime: string,
  endTime: string,
  timezone: string,
  workingDays: string[]
): boolean => {
  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: timezone 
    });
    
    if (!workingDays.includes(currentDay)) {
      return false;
    }
    
    const currentTime = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return currentTime >= startTime && currentTime <= endTime;
  } catch (error) {
    return false;
  }
};

// Get comprehensive timezone list
export const getTimezoneList = (): TimezoneInfo[] => [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'UTC+00:00', region: 'UTC' },
  
  // North America
  { value: 'America/New_York', label: 'Eastern Time (New York)', offset: 'UTC-05:00', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: 'UTC-06:00', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: 'UTC-07:00', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: 'UTC-08:00', region: 'North America' },
  { value: 'America/Phoenix', label: 'Arizona Time (Phoenix)', offset: 'UTC-07:00', region: 'North America' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', offset: 'UTC-09:00', region: 'North America' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', offset: 'UTC-10:00', region: 'North America' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', offset: 'UTC-05:00', region: 'North America' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', offset: 'UTC-08:00', region: 'North America' },
  
  // Europe
  { value: 'Europe/London', label: 'GMT (London)', offset: 'UTC+00:00', region: 'Europe' },
  { value: 'Europe/Paris', label: 'CET (Paris)', offset: 'UTC+01:00', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'CET (Berlin)', offset: 'UTC+01:00', region: 'Europe' },
  { value: 'Europe/Rome', label: 'CET (Rome)', offset: 'UTC+01:00', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'CET (Madrid)', offset: 'UTC+01:00', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'CET (Amsterdam)', offset: 'UTC+01:00', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'CET (Stockholm)', offset: 'UTC+01:00', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'MSK (Moscow)', offset: 'UTC+03:00', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'TRT (Istanbul)', offset: 'UTC+03:00', region: 'Europe' },
  
  // Asia Pacific
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)', offset: 'UTC+09:00', region: 'Asia Pacific' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)', offset: 'UTC+08:00', region: 'Asia Pacific' },
  { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)', offset: 'UTC+08:00', region: 'Asia Pacific' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)', offset: 'UTC+08:00', region: 'Asia Pacific' },
  { value: 'Asia/Seoul', label: 'KST (Seoul)', offset: 'UTC+09:00', region: 'Asia Pacific' },
  { value: 'Asia/Kolkata', label: 'IST (Mumbai)', offset: 'UTC+05:30', region: 'Asia Pacific' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)', offset: 'UTC+04:00', region: 'Asia Pacific' },
  { value: 'Australia/Sydney', label: 'AEDT (Sydney)', offset: 'UTC+11:00', region: 'Asia Pacific' },
  { value: 'Australia/Melbourne', label: 'AEDT (Melbourne)', offset: 'UTC+11:00', region: 'Asia Pacific' },
  { value: 'Pacific/Auckland', label: 'NZDT (Auckland)', offset: 'UTC+13:00', region: 'Asia Pacific' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'BRT (São Paulo)', offset: 'UTC-03:00', region: 'South America' },
  { value: 'America/Argentina/Buenos_Aires', label: 'ART (Buenos Aires)', offset: 'UTC-03:00', region: 'South America' },
  { value: 'America/Lima', label: 'PET (Lima)', offset: 'UTC-05:00', region: 'South America' },
  { value: 'America/Bogota', label: 'COT (Bogotá)', offset: 'UTC-05:00', region: 'South America' },
  
  // Africa & Middle East
  { value: 'Africa/Cairo', label: 'EET (Cairo)', offset: 'UTC+02:00', region: 'Africa & Middle East' },
  { value: 'Africa/Johannesburg', label: 'SAST (Johannesburg)', offset: 'UTC+02:00', region: 'Africa & Middle East' },
  { value: 'Africa/Lagos', label: 'WAT (Lagos)', offset: 'UTC+01:00', region: 'Africa & Middle East' },
  { value: 'Asia/Riyadh', label: 'AST (Riyadh)', offset: 'UTC+03:00', region: 'Africa & Middle East' }
];

// Auto-detect user's timezone
export const detectUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'UTC';
  }
};