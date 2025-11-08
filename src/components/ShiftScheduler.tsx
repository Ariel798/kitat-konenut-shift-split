import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, Trash2, Users, Clock, Settings, Edit3, Check, X, Share2, Link } from 'lucide-react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  availableShifts: Record<number, string[]>; // day of week -> array of available time slots
}

interface Shift {
  day: number;
  timeSlot: string;
  members: string[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const TIME_SLOTS = ['06:00-12:00', '12:00-18:00', '18:00-00:00', '00:00-06:00'];

// Helper function to determine if a time slot is day or night
const isDayShift = (timeSlot: string) => {
  return ['06:00-12:00', '12:00-18:00'].includes(timeSlot);
};

const LEGACY_SLOT_MAP: Record<string, string[]> = {
  '06:00-10:00': ['06:00-12:00'],
  '10:00-14:00': ['06:00-12:00', '12:00-18:00'],
  '14:00-18:00': ['12:00-18:00'],
  '18:00-22:00': ['18:00-00:00'],
  '22:00-02:00': ['18:00-00:00', '00:00-06:00'],
  '02:00-06:00': ['00:00-06:00'],
};

const normalizeSlotsToCurrent = (slots: string[] = []) => {
  const normalized = new Set<string>();

  slots.forEach(slot => {
    if (TIME_SLOTS.includes(slot)) {
      normalized.add(slot);
      return;
    }

    const mapped = LEGACY_SLOT_MAP[slot];
    if (mapped) {
      mapped.forEach(newSlot => normalized.add(newSlot));
    }
  });

  return TIME_SLOTS.filter(slot => normalized.has(slot));
};

const normalizeAvailabilityMap = (availability: Record<number, string[]> = {}) => {
  const normalized: Record<number, string[]> = {};

  for (let day = 0; day < 7; day++) {
    const daySlots = availability[day] || [];
    const normalizedSlots = normalizeSlotsToCurrent(daySlots);
    if (normalizedSlots.length > 0) {
      normalized[day] = normalizedSlots;
    }
  }

  return normalized;
};

// Add new encode/decode functions above ShiftScheduler
const encodeShareData = (data: { shifts: Shift[], settings: any, teamMembers: TeamMember[], selectedWeek: string }): string => {
  return encodeURIComponent(JSON.stringify(data));
};

const decodeShareData = (encoded: string): { shifts: Shift[], settings: any, teamMembers: TeamMember[], selectedWeek: string } => {
  return JSON.parse(decodeURIComponent(encoded));
};

// Color generation function for team members
const generateMemberColors = (memberNames: string[]) => {
  const colors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-red-100 text-red-800 border-red-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-lime-100 text-lime-800 border-lime-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'bg-slate-100 text-slate-800 border-slate-200',
    'bg-gray-100 text-gray-800 border-gray-200',
    'bg-zinc-100 text-zinc-800 border-zinc-200'
  ];
  
  const colorMap: Record<string, string> = {};
  memberNames.forEach((name, index) => {
    colorMap[name] = colors[index % colors.length];
  });
  
  return colorMap;
};

const ShiftScheduler = () => {
  // Calculate the current Sunday (or today if it's Sunday)
  const getCurrentSunday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek; // If today is Sunday, subtract 0 days
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - daysToSubtract);
    return format(sunday, 'yyyy-MM-dd');
  };

  const [selectedWeek, setSelectedWeek] = useState(getCurrentSunday());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAvailableShifts, setNewMemberAvailableShifts] = useState<Record<number, string[]>>({});
  const [minDayWorkers, setMinDayWorkers] = useState(1);
  const [minNightWorkers, setMinNightWorkers] = useState(1);
  const [maxShiftsPerEmployee, setMaxShiftsPerEmployee] = useState(10);
  const [dayShiftWorkers, setDayShiftWorkers] = useState(1);
  const [nightShiftWorkers, setNightShiftWorkers] = useState(1);
  
  // Local input states for better mobile handling
  const [dayShiftWorkersInput, setDayShiftWorkersInput] = useState('1');
  const [nightShiftWorkersInput, setNightShiftWorkersInput] = useState('1');
  const [maxShiftsPerEmployeeInput, setMaxShiftsPerEmployeeInput] = useState('10');

  // Editing states
  const [editingShift, setEditingShift] = useState<{day: number, timeSlot: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  // Team member editing states
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberAvailableShifts, setEditMemberAvailableShifts] = useState<Record<number, string[]>>({});

  // Worker availability viewer states
  const [showAvailabilityViewer, setShowAvailabilityViewer] = useState(false);
  const [selectedWorkerForView, setSelectedWorkerForView] = useState<string>('');

  // Share and network states
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Ref for smooth scrolling to availability viewer
  const availabilityViewerRef = React.useRef<HTMLDivElement>(null);
  // Ref for smooth scrolling to shifts table
  const shiftsTableRef = React.useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 });

  // localStorage functions for worker names
  const saveWorkerNamesToStorage = (names: string[]) => {
    try {
      localStorage.setItem('shiftScheduler_workerNames', JSON.stringify(names));
    } catch (error) {
      console.error('Failed to save worker names to localStorage:', error);
    }
  };

  const loadWorkerNamesFromStorage = (): string[] => {
    try {
      const saved = localStorage.getItem('shiftScheduler_workerNames');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load worker names from localStorage:', error);
      return [];
    }
  };

  // localStorage functions for complete team member data
  const saveTeamMembersToStorage = (members: TeamMember[]) => {
    try {
      const normalizedMembers = members.map(normalizeTeamMember);
      localStorage.setItem('shiftScheduler_teamMembers', JSON.stringify(normalizedMembers));
    } catch (error) {
      console.error('Failed to save team members to localStorage:', error);
    }
  };

  const normalizeTeamMember = (member: TeamMember): TeamMember => ({
    ...member,
    availableShifts: normalizeAvailabilityMap(member.availableShifts || {})
  });

  const normalizeShift = (shift: Shift): Shift | null => {
    if (TIME_SLOTS.includes(shift.timeSlot)) {
      return shift;
    }

    const mappedSlots = normalizeSlotsToCurrent([shift.timeSlot]);
    if (mappedSlots.length === 0) {
      return null;
    }

    return {
      ...shift,
      timeSlot: mappedSlots[0]
    };
  };

  const normalizeShifts = (shiftList: Shift[]) => {
    const normalized: Shift[] = [];

    shiftList.forEach(shift => {
      const normalizedShift = normalizeShift(shift);
      if (!normalizedShift) {
        return;
      }

      const existingIndex = normalized.findIndex(
        s => s.day === normalizedShift.day && s.timeSlot === normalizedShift.timeSlot
      );

      if (existingIndex >= 0) {
        const existing = normalized[existingIndex];
        const uniqueMembers = Array.from(new Set([...existing.members, ...normalizedShift.members]));
        normalized[existingIndex] = { ...existing, members: uniqueMembers };
      } else {
        normalized.push(normalizedShift);
      }
    });

    normalized.sort((a, b) => {
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      return TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot);
    });

    return normalized;
  };

  const loadTeamMembersFromStorage = (): TeamMember[] => {
    try {
      const saved = localStorage.getItem('shiftScheduler_teamMembers');
      if (!saved) return [];

      const parsed = JSON.parse(saved) as TeamMember[];
      return parsed.map(normalizeTeamMember);
    } catch (error) {
      console.error('Failed to load team members from localStorage:', error);
      return [];
    }
  };

  // localStorage functions for shift settings
  const saveShiftSettingsToStorage = (settings: {
    dayShiftWorkers: number;
    nightShiftWorkers: number;
    maxShiftsPerEmployee: number;
  }) => {
    try {
      localStorage.setItem('shiftScheduler_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save shift settings to localStorage:', error);
    }
  };

  const loadShiftSettingsFromStorage = () => {
    try {
      const saved = localStorage.getItem('shiftScheduler_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setDayShiftWorkers(settings.dayShiftWorkers || 1);
        setNightShiftWorkers(settings.nightShiftWorkers || 1);
        setMaxShiftsPerEmployee(settings.maxShiftsPerEmployee || 10);
        setDayShiftWorkersInput((settings.dayShiftWorkers || 1).toString());
        setNightShiftWorkersInput((settings.nightShiftWorkers || 1).toString());
        setMaxShiftsPerEmployeeInput((settings.maxShiftsPerEmployee || 10).toString());
      }
    } catch (error) {
      console.error('Failed to load shift settings from localStorage:', error);
    }
  };

  // Load saved worker names on component mount
  useEffect(() => {
    // Load saved team members with their availability
    const savedTeamMembers = loadTeamMembersFromStorage();
    if (savedTeamMembers.length > 0) {
      setTeamMembers(savedTeamMembers);
    } else {
      // Fallback: Load saved worker names (for backward compatibility)
      const savedNames = loadWorkerNamesFromStorage();
      if (savedNames.length > 0) {
        // Create team members with full availability for saved names
        const savedMembers: TeamMember[] = savedNames.map((name, index) => ({
          id: `saved-${Date.now()}-${index}`,
          name,
          availableShifts: initializeAvailableShifts()
        }));
      setTeamMembers(savedMembers.map(normalizeTeamMember));
      }
    }
    
    // Load saved shift settings
    loadShiftSettingsFromStorage();
    
    // Check for shared blob in URL (jsonblob.com quick hack)
    const urlParams = new URLSearchParams(window.location.search);
    const blobId = urlParams.get('blob');
    if (blobId) {
      fetch(`https://jsonblob.com/api/jsonBlob/${blobId}`)
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(decoded => {
          const decodedSettings = decoded.settings || {};
          const normalizedShifts = normalizeShifts(decoded.shifts || []);
          const normalizedMembers = (decoded.teamMembers || []).map(normalizeTeamMember);

          setShifts(normalizedShifts);
          setTeamMembers(normalizedMembers);
          setDayShiftWorkers(decodedSettings.dayShiftWorkers || 1);
          setNightShiftWorkers(decodedSettings.nightShiftWorkers || 1);
          setMaxShiftsPerEmployee(decodedSettings.maxShiftsPerEmployee || 10);
          setDayShiftWorkersInput((decodedSettings.dayShiftWorkers || 1).toString());
          setNightShiftWorkersInput((decodedSettings.nightShiftWorkers || 1).toString());
          setMaxShiftsPerEmployeeInput((decodedSettings.maxShiftsPerEmployee || 10).toString());
          if (decoded.selectedWeek) {
            setSelectedWeek(decoded.selectedWeek);
          }
          // Remove blob param from URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
          // Smooth scroll to shifts table after loading shared data
          setTimeout(() => {
            shiftsTableRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }, 500); // Delay to ensure the table is rendered
        })
        .catch(error => {
          console.error('Failed to load shared shifts:', error);
          setNetworkError('נדרש חיבור לאינטרנט כדי לטעון לוח משמרות משותף.');
          alert('נדרש חיבור לאינטרנט כדי לטעון לוח משמרות משותף.');
        });
      return;
    }
    // ... existing code for shifts param (if you want to keep backward compatibility) ...
  }, []);

  // Save worker names whenever team members change
  useEffect(() => {
    const names = teamMembers.map(member => member.name);
    saveWorkerNamesToStorage(names);
  }, [teamMembers]);

  // Save team members whenever they change
  useEffect(() => {
    saveTeamMembersToStorage(teamMembers);
  }, [teamMembers]);

  // Save shift settings whenever they change
  useEffect(() => {
    saveShiftSettingsToStorage({
      dayShiftWorkers,
      nightShiftWorkers,
      maxShiftsPerEmployee
    });
  }, [dayShiftWorkers, nightShiftWorkers, maxShiftsPerEmployee]);

  // Initialize all shifts as available for new member
  const initializeAvailableShifts = () => {
    const allAvailable: Record<number, string[]> = {};
    for (let day = 0; day < 7; day++) {
      allAvailable[day] = [...TIME_SLOTS];
    }
    return allAvailable;
  };

  // Development preset workers data (legacy 4-hour slots; normalized to current 6-hour slots at runtime)
  const legacyPresetWorkers: Array<{ name: string; availability: Record<number, string[]> }> = [
    {
      name: 'אריאל',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        3: ['22:00-02:00', '02:00-06:00', '14:00-18:00', '18:00-22:00', '06:00-10:00', '10:00-14:00'], // רביעי
        4: ['22:00-02:00', '02:00-06:00', '14:00-18:00', '18:00-22:00', '06:00-10:00', '10:00-14:00'], // חמישי
        5: ['22:00-02:00', '02:00-06:00', '14:00-18:00', '18:00-22:00', '06:00-10:00', '10:00-14:00'], // שישי
        6: ['22:00-02:00', '02:00-06:00', '14:00-18:00', '18:00-22:00', '06:00-10:00', '10:00-14:00']  // שבת
      }
    },
    {
      name: 'בניטה',
      availability: {
        0: ['22:00-02:00', '02:00-06:00', '14:00-18:00', '18:00-22:00', '06:00-10:00', '10:00-14:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // חמישי
      }
    },
    {
      name: 'איתמר',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'טל',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'אורי',
      availability: {
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'אורן',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00']  // שבת
      }
    },
    {
      name: 'אלירן',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'אפי',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'איציק דניאל',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'ליעוז',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'שמוליק',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'אושרי',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        5: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שישי
        6: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'עידו',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00', '06:00-10:00', '10:00-14:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // חמישי
        6: ['22:00-02:00', '02:00-06:00']  // שבת
      }
    },
    {
      name: 'גיל',
      availability: {
        0: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // ראשון
        1: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שני
        2: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'], // שלישי
        3: ['06:00-10:00', '10:00-14:00', '22:00-02:00', '02:00-06:00'], // רביעי
        4: ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00']  // חמישי
      }
    }
  ];

  const presetWorkers = legacyPresetWorkers.map(worker => ({
    name: worker.name,
    availability: normalizeAvailabilityMap(worker.availability)
  }));

  const addPresetWorkers = () => {
    const newMembers: TeamMember[] = presetWorkers.map((worker, index) => ({
      id: `preset-${Date.now()}-${index}`,
      name: worker.name,
      availableShifts: worker.availability
    }));
    const normalizedMembers = newMembers.map(normalizeTeamMember);
    setTeamMembers([...teamMembers, ...normalizedMembers]);
  };

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newMemberName.trim(),
        availableShifts: { ...newMemberAvailableShifts }
      };
      setTeamMembers([...teamMembers, normalizeTeamMember(newMember)]);
      setNewMemberName('');
      setNewMemberAvailableShifts(initializeAvailableShifts());
      setShowAddForm(false);
    }
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  // Team member editing functions
  const startEditMember = (member: TeamMember) => {
    setEditingMember(member.id);
    setEditMemberName(member.name);
    setEditMemberAvailableShifts({ ...member.availableShifts });
  };

  const saveEditMember = () => {
    if (!editingMember || !editMemberName.trim()) return;

    setTeamMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === editingMember 
          ? normalizeTeamMember({
              ...member,
              name: editMemberName.trim(),
              availableShifts: { ...editMemberAvailableShifts }
            })
          : member
      )
    );

    setEditingMember(null);
    setEditMemberName('');
    setEditMemberAvailableShifts({});
  };

  const cancelEditMember = () => {
    setEditingMember(null);
    setEditMemberName('');
    setEditMemberAvailableShifts({});
  };

  const toggleEditAvailableShift = (dayIndex: number, timeSlot: string) => {
    setEditMemberAvailableShifts(prev => {
      const dayAvailable = prev[dayIndex] || [];
      const isCurrentlyAvailable = dayAvailable.includes(timeSlot);
      
      if (isCurrentlyAvailable) {
        // Remove from available
        const newDayAvailable = dayAvailable.filter(s => s !== timeSlot);
        if (newDayAvailable.length === 0) {
          const { [dayIndex]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [dayIndex]: newDayAvailable };
        }
      } else {
        // Add to available
        return { ...prev, [dayIndex]: [...dayAvailable, timeSlot] };
      }
    });
  };

  const toggleAvailableShift = (dayIndex: number, timeSlot: string) => {
    setNewMemberAvailableShifts(prev => {
      const dayAvailable = prev[dayIndex] || [];
      const isCurrentlyAvailable = dayAvailable.includes(timeSlot);
      
      if (isCurrentlyAvailable) {
        // Remove from available
        const newDayAvailable = dayAvailable.filter(s => s !== timeSlot);
        if (newDayAvailable.length === 0) {
          const { [dayIndex]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [dayIndex]: newDayAvailable };
        }
      } else {
        // Add to available
        return { ...prev, [dayIndex]: [...dayAvailable, timeSlot] };
      }
    });
  };

  // Initialize form when opened
  const openAddForm = () => {
    setNewMemberAvailableShifts(initializeAvailableShifts());
    setShowAddForm(true);
  };

  const generateShifts = () => {
    const newShifts: Shift[] = [];
    
    // Step 1: Calculate total available shifts for each worker
    const workerAvailability: Record<string, number> = {};
    const workerShiftCount: Record<string, number> = {};
    
    teamMembers.forEach(member => {
      workerAvailability[member.name] = 0;
      workerShiftCount[member.name] = 0;
      
      // Count total available shifts for this worker
      for (let day = 0; day < 7; day++) {
        for (const timeSlot of TIME_SLOTS) {
          const dayAvailable = member.availableShifts[day] || [];
          if (dayAvailable.includes(timeSlot)) {
            workerAvailability[member.name]++;
          }
        }
      }
    });

    // Step 2: Create all possible shifts first
    const allShifts: Array<{day: number, timeSlot: string, availableWorkers: string[]}> = [];
    
    for (let day = 0; day < 7; day++) {
      for (const timeSlot of TIME_SLOTS) {
        const availableWorkers = teamMembers.filter(member => {
          const dayAvailable = member.availableShifts[day] || [];
          return dayAvailable.includes(timeSlot);
        }).map(m => m.name);
        
        if (availableWorkers.length > 0) {
          allShifts.push({
            day,
            timeSlot,
            availableWorkers
          });
        }
      }
    }

    // Step 3: Sort shifts by priority (fewer available workers first, then by day/time)
    allShifts.sort((a, b) => {
      // Primary: Sort by number of available workers (fewer = higher priority)
      if (a.availableWorkers.length !== b.availableWorkers.length) {
        return a.availableWorkers.length - b.availableWorkers.length;
      }
      // Secondary: Sort by day
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      // Tertiary: Sort by time slot
      return TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot);
    });

    // Step 4: Multi-pass assignment for better distribution
    const maxIterations = 5; // Increased from 3 to 5
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Reset shift counts for each iteration
      if (iteration > 0) {
        Object.keys(workerShiftCount).forEach(worker => {
          workerShiftCount[worker] = 0;
        });
        newShifts.length = 0; // Clear previous assignments
      }
      
      allShifts.forEach(shift => {
        const exactWorkers = isDayShift(shift.timeSlot) ? dayShiftWorkers : nightShiftWorkers;
        const assignedCount = Math.min(exactWorkers, shift.availableWorkers.length);
        
        if (assignedCount > 0) {
          // Filter workers who haven't reached their limit
          const eligibleWorkers = shift.availableWorkers.filter(worker => 
            workerShiftCount[worker] < maxShiftsPerEmployee
          );
          
          if (eligibleWorkers.length > 0) {
            // Sort eligible workers by fairness score with more aggressive balancing
            const sortedWorkers = eligibleWorkers.sort((a, b) => {
              // Primary: Fewer total shifts = higher priority (more aggressive)
              if (workerShiftCount[a] !== workerShiftCount[b]) {
                return workerShiftCount[a] - workerShiftCount[b];
              }
              
              // Secondary: Lower ratio = more fair
              const aRatio = workerShiftCount[a] / Math.max(workerAvailability[a], 1);
              const bRatio = workerShiftCount[b] / Math.max(workerAvailability[b], 1);
              if (Math.abs(aRatio - bRatio) > 0.00001) {
                return aRatio - bRatio;
              }
              
              // Tertiary: More availability = more fair
              return workerAvailability[b] - workerAvailability[a];
            });

            const assignedWorkers = sortedWorkers.slice(0, Math.min(assignedCount, eligibleWorkers.length));
            
            // Update shift counts
            assignedWorkers.forEach(worker => {
              workerShiftCount[worker]++;
            });

            newShifts.push({
              day: shift.day,
              timeSlot: shift.timeSlot,
              members: assignedWorkers
            });
          }
        }
      });
      
      // Check if distribution is good enough (all workers within 1 shift of each other)
      const shiftCounts = Object.values(workerShiftCount).filter(count => count > 0);
      if (shiftCounts.length > 0) {
        const minShifts = Math.min(...shiftCounts);
        const maxShifts = Math.max(...shiftCounts);
        const range = maxShifts - minShifts;
        
        // More strict termination condition
        if (range <= 1 || (range <= 2 && iteration >= 2)) {
          break; // Good enough distribution achieved
        }
      }
    }

    setShifts(newShifts);
  };

  // Calculate total shifts per employee
  const getShiftSummary = () => {
    const summary: Record<string, number> = {};
    teamMembers.forEach(member => {
      summary[member.name] = 0;
    });
    
    shifts.forEach(shift => {
      shift.members.forEach(member => {
        summary[member] = (summary[member] || 0) + 1;
      });
    });
    
    return summary;
  };

  // Editing functions
  const startEdit = (day: number, timeSlot: string) => {
    const shift = shifts.find(s => s.day === day && s.timeSlot === timeSlot);
    setEditingShift({ day, timeSlot });
    setEditValue(shift ? shift.members.join(', ') : '');
  };

  const saveEdit = () => {
    if (!editingShift) return;

    const { day, timeSlot } = editingShift;
    const memberNames = editValue.split(',').map(name => name.trim()).filter(name => name.length > 0);
    
    // Validate that all names exist in team members
    const validNames = memberNames.filter(name => 
      teamMembers.some(member => member.name === name)
    );

    // Check if any assigned workers are not available for this shift
    const unavailableWorkers = validNames.filter(workerName => {
      const worker = teamMembers.find(member => member.name === workerName);
      if (!worker) return true;
      
      const dayAvailable = worker.availableShifts[day] || [];
      return !dayAvailable.includes(timeSlot);
    });

    // Show confirmation if there are unavailable workers
    if (unavailableWorkers.length > 0) {
      const confirmMessage = `העובדים הבאים אינם זמינים למשמרת זו (${DAYS_OF_WEEK[day]} ${timeSlot}):\n${unavailableWorkers.join(', ')}\n\nהאם אתה בטוח שברצונך להקצות אותם למשמרת זו?`;
      
      if (!confirm(confirmMessage)) {
        return; // User cancelled
      }
    }

    // Update shifts
    setShifts(prevShifts => {
      const existingShiftIndex = prevShifts.findIndex(s => s.day === day && s.timeSlot === timeSlot);
      
      if (existingShiftIndex >= 0) {
        // Update existing shift
        const updatedShifts = [...prevShifts];
        updatedShifts[existingShiftIndex] = {
          ...updatedShifts[existingShiftIndex],
          members: validNames
        };
        return updatedShifts;
      } else {
        // Add new shift
        return [...prevShifts, { day, timeSlot, members: validNames }];
      }
    });

    setEditingShift(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingShift(null);
    setEditValue('');
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Get all worker names for datalist
  const workerNames = teamMembers.map(member => member.name);

  // Generate color map for team members
  const memberColors = generateMemberColors(workerNames);

  // Custom autocomplete for worker names
  const getAutocompleteSuggestions = (inputValue: string) => {
    if (!inputValue.trim()) return [];
    
    // Get the last word being typed (after the last comma)
    const parts = inputValue.split(',').map(part => part.trim());
    const currentWord = parts[parts.length - 1];
    
    if (!currentWord) return [];
    
    // Filter worker names that start with the current word
    return workerNames.filter(name => 
      name.toLowerCase().startsWith(currentWord.toLowerCase()) && 
      !parts.slice(0, -1).includes(name) // Don't suggest already added names
    );
  };

  const handleAutocompleteSelect = (selectedName: string) => {
    const parts = editValue.split(',').map(part => part.trim());
    parts[parts.length - 1] = selectedName; // Replace the current word with selected name
    setEditValue(parts.join(', '));
  };

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditValue(value);
    
    const newSuggestions = getAutocompleteSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleEditInputFocus = () => {
    const newSuggestions = getAutocompleteSuggestions(editValue);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleEditInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Worker availability viewer functions
  const openAvailabilityViewer = () => {
    setShowAvailabilityViewer(true);
  };

  const closeAvailabilityViewer = () => {
    setShowAvailabilityViewer(false);
    setSelectedWorkerForView('');
  };

  const viewWorkerAvailability = (workerName: string) => {
    setSelectedWorkerForView(workerName);
    setShowAvailabilityViewer(true);
    
    // Smooth scroll to the availability viewer after a short delay to ensure it's rendered
    setTimeout(() => {
      availabilityViewerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const getWorkerAvailability = (workerName: string) => {
    const worker = teamMembers.find(member => member.name === workerName);
    return worker ? worker.availableShifts : {};
  };

  const encodeShifts = (shifts: Shift[]): string => {
    return encodeURIComponent(JSON.stringify(shifts));
  };

  const decodeShifts = (encodedShifts: string): Shift[] => {
    const parsed = JSON.parse(decodeURIComponent(encodedShifts)) as Shift[];
    return normalizeShifts(parsed || []);
  };

  const shareShifts = async () => {
    if (shifts.length === 0) {
      alert('אין משמרות לשתף');
      return;
    }

    try {
      const shareData = {
        shifts,
        settings: {
          dayShiftWorkers,
          nightShiftWorkers,
          maxShiftsPerEmployee
        },
        teamMembers,
        selectedWeek
      };

      // POST to jsonblob.com
      const response = await fetch('https://jsonblob.com/api/jsonBlob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      });

      if (!response.ok) throw new Error('Failed to create blob');
      const location = response.headers.get('Location');
      const blobId = location?.split('/').pop();
      if (!blobId) throw new Error('No blob ID returned');

      const shareUrl = `${window.location.origin}${window.location.pathname}?blob=${blobId}`;
      setLastShareUrl(shareUrl);

      // Try to copy, but always show the link for manual copy
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          alert('הקישור ללוח נשמר!');
        }
      } catch (err) {
        // Ignore, just show the link below
      }
    } catch (error) {
      setNetworkError('נדרש חיבור לאינטרנט כדי לשתף לוח משמרות.');
      alert('נדרש חיבור לאינטרנט כדי לשתף לוח משמרות.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative text-center space-y-2">
          <span className="absolute right-0 top-0 text-xs md:text-sm bg-gray-200 text-gray-700 rounded-bl px-2 py-1 font-mono z-10">v2.9.4</span>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2 pr-12 md:pr-0">מערכת חלוקת משמרות</h1>
          <p className="text-lg text-gray-600 flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            כיתת כוננות
          </p>
        </div>

        {/* Week Selection */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              בחירת שבוע
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="week-select">שבוע שמתחיל ב:</Label>
              <Input
                id="week-select"
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-auto"
              />
              <span className="text-sm text-gray-600">
                {format(weekStart, 'dd/MM/yyyy', { locale: he })} - {format(addDays(weekStart, 6), 'dd/MM/yyyy', { locale: he })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Shift Settings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              הגדרות משמרות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="day-shift-workers">סד"כ במשמרת יום (06:00-18:00)</Label>
                <Input
                  id="day-shift-workers"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={dayShiftWorkersInput}
                  onChange={(e) => setDayShiftWorkersInput(e.target.value)}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value === '' || parseInt(value) < 1) {
                      setDayShiftWorkersInput('1');
                      setDayShiftWorkers(1);
                    } else {
                      const numValue = parseInt(value);
                      setDayShiftWorkersInput(numValue.toString());
                      setDayShiftWorkers(numValue);
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="night-shift-workers">סד"כ במשמרת לילה (18:00-06:00)</Label>
                <Input
                  id="night-shift-workers"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={nightShiftWorkersInput}
                  onChange={(e) => setNightShiftWorkersInput(e.target.value)}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value === '' || parseInt(value) < 1) {
                      setNightShiftWorkersInput('1');
                      setNightShiftWorkers(1);
                    } else {
                      const numValue = parseInt(value);
                      setNightShiftWorkersInput(numValue.toString());
                      setNightShiftWorkers(numValue);
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="max-shifts-per-employee">מקסימום משמרות בשבוע</Label>
                <Input
                  id="max-shifts-per-employee"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxShiftsPerEmployeeInput}
                  onChange={(e) => setMaxShiftsPerEmployeeInput(e.target.value)}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value === '' || parseInt(value) < 1) {
                      setMaxShiftsPerEmployeeInput('1');
                      setMaxShiftsPerEmployee(1);
                    } else {
                      const numValue = parseInt(value);
                      setMaxShiftsPerEmployeeInput(numValue.toString());
                      setMaxShiftsPerEmployee(numValue);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Management */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                חברי הצוות ({teamMembers.length})
              </span>
              <div className="flex gap-2">
                <Button onClick={openAddForm} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  הוסף חבר צוות
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 border-red-300 hover:text-white hover:bg-red-600"
                  onClick={() => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק את כל חברי הצוות?')) {
                      setTeamMembers([]);
                    }
                  }}
                  disabled={teamMembers.length === 0}
                >
                  נקה את כל הצוות
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Member Form */}
            {showAddForm && (
              <Card className="border-2 border-blue-200">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="member-name">שם חבר הצוות</Label>
                    <Input
                      id="member-name"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="הכנס שם..."
                    />
                  </div>
                  <div>
                    <Label>בחר משמרות בהן זמין (לפי יום ושעות):</Label>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-sm font-medium">יום</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">06:00-12:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">12:00-18:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">18:00-00:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">00:00-06:00</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS_OF_WEEK.map((dayName, dayIndex) => (
                            <tr key={dayIndex}>
                              <td className="border border-gray-300 p-2 text-sm font-medium bg-gray-50">
                                {dayName}
                              </td>
                              {TIME_SLOTS.map((timeSlot) => (
                                <td key={timeSlot} className="border border-gray-300 p-2 text-center">
                                  <Checkbox
                                    checked={(newMemberAvailableShifts[dayIndex] || []).includes(timeSlot)}
                                    onCheckedChange={() => toggleAvailableShift(dayIndex, timeSlot)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500 mt-2">סמן משמרות בהן זמין</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addTeamMember} disabled={!newMemberName.trim()}>
                      הוסף
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      ביטול
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Members List */}
            <div className="grid gap-3">
              {teamMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">אין חברי צוות. הוסף חברי צוות כדי להתחיל.</p>
              ) : (
                teamMembers.map((member) => {
                  const isEditing = editingMember === member.id;
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {isEditing ? (
                        // Edit form
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label htmlFor={`edit-member-name-${member.id}`}>שם חבר הצוות</Label>
                            <Input
                              id={`edit-member-name-${member.id}`}
                              value={editMemberName}
                              onChange={(e) => setEditMemberName(e.target.value)}
                              placeholder="הכנס שם..."
                            />
                          </div>
                          <div>
                            <Label>בחר משמרות בהן זמין (לפי יום ושעות):</Label>
                            <div className="mt-3 overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-sm font-medium">יום</th>
                                    <th className="border border-gray-300 p-2 text-sm font-medium">06:00-12:00</th>
                                    <th className="border border-gray-300 p-2 text-sm font-medium">12:00-18:00</th>
                                    <th className="border border-gray-300 p-2 text-sm font-medium">18:00-00:00</th>
                                    <th className="border border-gray-300 p-2 text-sm font-medium">00:00-06:00</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {DAYS_OF_WEEK.map((dayName, dayIndex) => (
                                    <tr key={dayIndex}>
                                      <td className="border border-gray-300 p-2 text-sm font-medium bg-gray-50">
                                        {dayName}
                                      </td>
                                      {TIME_SLOTS.map((timeSlot) => (
                                        <td key={timeSlot} className="border border-gray-300 p-2 text-center">
                                          <Checkbox
                                            checked={(editMemberAvailableShifts[dayIndex] || []).includes(timeSlot)}
                                            onCheckedChange={() => toggleEditAvailableShift(dayIndex, timeSlot)}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={saveEditMember} disabled={!editMemberName.trim()}>
                              שמור
                            </Button>
                            <Button variant="outline" onClick={cancelEditMember}>
                              ביטול
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div className="flex-1">
                            <h3 className="font-medium">{member.name}</h3>
                            {Object.keys(member.availableShifts).length > 0 && (
                              <div className="text-sm text-gray-600 mt-1">
                                <span>זמין: </span>
                                {Object.entries(member.availableShifts).map(([day, shifts]) => (
                                  <span key={day} className="mr-2">
                                    {DAYS_OF_WEEK[parseInt(day)]}: {shifts.join(', ')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditMember(member)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewWorkerAvailability(member.name)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              צפה בזמינות
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTeamMember(member.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Worker Availability Viewer */}
        {showAvailabilityViewer && (
          <Card className="shadow-lg border-2 border-blue-200" ref={availabilityViewerRef}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  צפייה בזמינות עובד
                </span>
                <Button variant="outline" onClick={closeAvailabilityViewer}>
                  סגור
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedWorkerForView ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800">{selectedWorkerForView}</h3>
                    <p className="text-gray-600">לוח זמינות</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-sm font-medium">יום</th>
                          <th className="border border-gray-300 p-2 text-sm font-medium">06:00-12:00</th>
                          <th className="border border-gray-300 p-2 text-sm font-medium">12:00-18:00</th>
                          <th className="border border-gray-300 p-2 text-sm font-medium">18:00-00:00</th>
                          <th className="border border-gray-300 p-2 text-sm font-medium">00:00-06:00</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                          const workerAvailability = getWorkerAvailability(selectedWorkerForView);
                          const dayAvailable = workerAvailability[dayIndex] || [];
                          
                          return (
                            <tr key={dayIndex}>
                              <td className="border border-gray-300 p-2 text-sm font-medium bg-gray-50">
                                {dayName}
                              </td>
                              {TIME_SLOTS.map((timeSlot) => {
                                const isAvailable = dayAvailable.includes(timeSlot);
                                return (
                                  <td key={timeSlot} className="border border-gray-300 p-2 text-center">
                                    <div className={`w-4 h-4 mx-auto rounded ${
                                      isAvailable 
                                        ? 'bg-green-500' 
                                        : 'bg-red-500'
                                    }`} title={isAvailable ? 'זמין' : 'לא זמין'} />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex gap-4 justify-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>זמין</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>לא זמין</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">בחר עובד לצפייה בזמינות</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generate Shifts Button */}
        {teamMembers.length > 0 && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <Button 
                onClick={generateShifts}
                className="w-full py-3 text-lg flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                צור משמרות לשבוע
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Shifts Table */}
        {shifts.length > 0 && (
          <Card className="shadow-lg" ref={shiftsTableRef}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                לוח משמרות השבוע
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Color Legend */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">מפת צבעים - חברי צוות:</h4>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`px-2 py-1 rounded text-xs font-medium border ${memberColors[member.name]}`}
                    >
                      {member.name}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-right p-3 font-semibold">שעות</th>
                      {DAYS_OF_WEEK.map((day, index) => (
                        <th key={index} className="text-center p-3 font-semibold min-w-32">
                          <div>{day}</div>
                          <div className="text-xs text-gray-500 font-normal">
                            {format(addDays(weekStart, index), 'dd/MM', { locale: he })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((timeSlot) => (
                      <tr key={timeSlot} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-700 border-l border-gray-200">
                          {timeSlot}
                        </td>
                        {DAYS_OF_WEEK.map((_, dayIndex) => {
                          const shift = shifts.find(s => s.day === dayIndex && s.timeSlot === timeSlot);
                          const isEditing = editingShift?.day === dayIndex && editingShift?.timeSlot === timeSlot;
                          
                          return (
                            <td key={dayIndex} className="p-2 text-center">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Input
                                      value={editValue}
                                      onChange={handleEditInputChange}
                                      onKeyDown={handleEditKeyPress}
                                      onFocus={handleEditInputFocus}
                                      onBlur={handleEditInputBlur}
                                      placeholder="הכנס שמוים..."
                                      className="text-xs"
                                      autoFocus
                                    />
                                    {showSuggestions && (
                                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                        {suggestions.map((name) => (
                                          <div
                                            key={name}
                                            className="p-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            onClick={() => handleAutocompleteSelect(name)}
                                          >
                                            {name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1 justify-center">
                                    <Button
                                      size="sm"
                                      onClick={saveEdit}
                                      className="h-6 px-2 bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEdit}
                                      className="h-6 px-2"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {shift ? (
                                    <>
                                      {shift.members.map((member, idx) => (
                                        <div
                                          key={idx}
                                          className={`px-2 py-1 rounded text-xs font-medium border ${memberColors[member] || 'bg-blue-100 text-blue-800 border-blue-200'}`}
                                        >
                                          {member}
                                        </div>
                                      ))}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEdit(dayIndex, timeSlot)}
                                        className="h-6 px-1 text-gray-500 hover:text-gray-700"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="space-y-1">
                                      <span className="text-gray-400 text-xs">-</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEdit(dayIndex, timeSlot)}
                                        className="h-6 px-1 text-gray-500 hover:text-gray-700"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>לחץ על כפתור העריכה כדי לערוך</p>
                <p>הכנס שמות מופרדים בפסיקים ולחץ Enter לשמירה</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Shifts Button */}
        {shifts.length > 0 && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <Button 
                onClick={shareShifts}
                className="w-full py-3 text-lg flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Link className="w-5 h-5" />
                שתף לוח משמרות בקישור
              </Button>
              <p className="text-sm text-gray-600 text-center mt-2">
                צור קישור שניתן לשלוח לאחרים לצפייה בלוח המשמרות
              </p>
              {networkError && (
                <div className="mt-4 text-center text-red-600 font-bold">{networkError}</div>
              )}
              {lastShareUrl && (
                <div className="mt-4">
                  <label className="block mb-1 font-medium">העתק את הקישור:</label>
                  <input
                    type="text"
                    value={lastShareUrl}
                    readOnly
                    onFocus={e => e.target.select()}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">אם לא הועתק אוטומטית, העתק ידנית</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shift Summary */}
        {shifts.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                סיכום משמרות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(getShiftSummary()).map(([memberName, shiftCount]) => (
                  <div key={memberName} className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-gray-800">{memberName}</div>
                    <div className="text-2xl font-bold text-blue-600">{shiftCount}</div>
                    <div className="text-xs text-gray-500">משמרות</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Development Preset - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="shadow-lg border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Users className="w-5 h-5" />
                Development Preset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={addPresetWorkers}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={teamMembers.length > 0}
              >
                Add All Preset Workers ({presetWorkers.length} workers)
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Adds all predefined workers with their specific availability patterns
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ShiftScheduler;
