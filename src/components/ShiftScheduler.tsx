import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, Trash2, Users, Clock, Settings, Edit3, Check, X } from 'lucide-react';
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
const TIME_SLOTS = ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'];

// Helper function to determine if a time slot is day or night
const isDayShift = (timeSlot: string) => {
  return ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00'].includes(timeSlot);
};

const ShiftScheduler = () => {
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 });

  // Initialize all shifts as available for new member
  const initializeAvailableShifts = () => {
    const allAvailable: Record<number, string[]> = {};
    for (let day = 0; day < 7; day++) {
      allAvailable[day] = [...TIME_SLOTS];
    }
    return allAvailable;
  };

  // Development preset workers data - updated to use specific time slots
  const presetWorkers = [
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

  const addPresetWorkers = () => {
    const newMembers: TeamMember[] = presetWorkers.map((worker, index) => ({
      id: `preset-${Date.now()}-${index}`,
      name: worker.name,
      availableShifts: worker.availability
    }));
    setTeamMembers([...teamMembers, ...newMembers]);
  };

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newMemberName.trim(),
        availableShifts: { ...newMemberAvailableShifts }
      };
      setTeamMembers([...teamMembers, newMember]);
      setNewMemberName('');
      setNewMemberAvailableShifts(initializeAvailableShifts());
      setShowAddForm(false);
    }
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative text-center space-y-2">
          <span className="absolute right-0 top-0 text-xs md:text-sm bg-gray-200 text-gray-700 rounded-bl px-2 py-1 font-mono z-10">v2.5.0</span>
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
                <Label htmlFor="day-shift-workers">סד"כ במשמרת יום (06:00-22:00)</Label>
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
                <Label htmlFor="night-shift-workers">סד"כ במשמרת לילה (22:00-06:00)</Label>
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
              <Button onClick={openAddForm} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                הוסף חבר צוות
              </Button>
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
                            <th className="border border-gray-300 p-2 text-sm font-medium">06:00-10:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">10:00-14:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">14:00-18:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">18:00-22:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">22:00-02:00</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">02:00-06:00</th>
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
                teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTeamMember(member.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

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
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                לוח משמרות השבוע
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
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
                <p>לחץ על כפתור העריכה כדי לשנות את הקצאתים למשמרת</p>
                <p>הכנס שמוים מופרדים בפסיקים ולחץ Enter לשמירה</p>
              </div>
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
