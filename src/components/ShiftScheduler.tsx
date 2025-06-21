import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, Trash2, Users, Clock, Settings } from 'lucide-react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  availableShifts: Record<number, string[]>; // day of week -> array of available shift types
}

interface Shift {
  day: number;
  timeSlot: string;
  members: string[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const TIME_SLOTS = ['06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00', '02:00-06:00'];

// Define shift categories
const SHIFT_CATEGORIES = {
  morning: ['06:00-10:00', '10:00-14:00'],
  day: ['14:00-18:00', '18:00-22:00'],
  night: ['22:00-02:00', '02:00-06:00']
};

const SHIFT_CATEGORY_NAMES = {
  morning: 'בוקר',
  day: 'יום',
  night: 'לילה'
};

// Helper function to get shift category for a time slot
const getShiftCategory = (timeSlot: string): string => {
  for (const [category, slots] of Object.entries(SHIFT_CATEGORIES)) {
    if (slots.includes(timeSlot)) {
      return category;
    }
  }
  return 'day'; // default
};

// Helper function to determine if a time slot is day ornpm run night
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

  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 });

  // Initialize all shifts as available for new member
  const initializeAvailableShifts = () => {
    const allAvailable: Record<number, string[]> = {};
    for (let day = 0; day < 7; day++) {
      allAvailable[day] = ['morning', 'day', 'night'];
    }
    return allAvailable;
  };

  // Development preset workers data
  const presetWorkers = [
    {
      name: 'אריאל',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        3: ['night', 'day', 'morning'], // רביעי
        4: ['night', 'day', 'morning'], // חמישי
        5: ['night', 'day', 'morning'], // שישי
        6: ['night', 'day', 'morning']  // שבת
      }
    },
    {
      name: 'בניטה',
      availability: {
        0: ['night', 'day', 'morning'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        4: ['morning', 'day', 'night']  // חמישי
      }
    },
    {
      name: 'איתמר',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'טל',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'אורי',
      availability: {
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'אורן',
      availability: {
        0: ['morning', 'day'], // ראשון
        1: ['morning', 'day'], // שני
        2: ['morning', 'day'], // שלישי
        3: ['morning', 'day'], // רביעי
        4: ['morning', 'day'], // חמישי
        5: ['morning', 'day'], // שישי
        6: ['morning', 'day']  // שבת
      }
    },
    {
      name: 'אלירן',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'אפי',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'איציק דניאל',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'ליעוז',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'שמוליק',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'אושרי',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        5: ['morning', 'day', 'night'], // שישי
        6: ['morning', 'day', 'night']  // שבת
      }
    },
    {
      name: 'עידו',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['day', 'night', 'morning'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'day', 'night'], // רביעי
        4: ['morning', 'day', 'night'], // חמישי
        6: ['night']  // שבת
      }
    },
    {
      name: 'גיל',
      availability: {
        0: ['morning', 'day', 'night'], // ראשון
        1: ['morning', 'day', 'night'], // שני
        2: ['morning', 'day', 'night'], // שלישי
        3: ['morning', 'night'], // רביעי
        4: ['morning', 'day', 'night']  // חמישי
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

  const toggleAvailableShift = (dayIndex: number, shiftCategory: string) => {
    setNewMemberAvailableShifts(prev => {
      const dayAvailable = prev[dayIndex] || [];
      const isCurrentlyAvailable = dayAvailable.includes(shiftCategory);
      
      if (isCurrentlyAvailable) {
        // Remove from available
        const newDayAvailable = dayAvailable.filter(s => s !== shiftCategory);
        if (newDayAvailable.length === 0) {
          const { [dayIndex]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [dayIndex]: newDayAvailable };
        }
      } else {
        // Add to available
        return { ...prev, [dayIndex]: [...dayAvailable, shiftCategory] };
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
          const shiftCategory = getShiftCategory(timeSlot);
          const dayAvailable = member.availableShifts[day] || [];
          if (dayAvailable.includes(shiftCategory)) {
            workerAvailability[member.name]++;
          }
        }
      }
    });

    // Step 2: Create all possible shifts first
    const allShifts: Array<{day: number, timeSlot: string, shiftCategory: string, availableWorkers: string[]}> = [];
    
    for (let day = 0; day < 7; day++) {
      for (const timeSlot of TIME_SLOTS) {
        const shiftCategory = getShiftCategory(timeSlot);
        const availableWorkers = teamMembers.filter(member => {
          const dayAvailable = member.availableShifts[day] || [];
          return dayAvailable.includes(shiftCategory);
        }).map(m => m.name);
        
        if (availableWorkers.length > 0) {
          allShifts.push({
            day,
            timeSlot,
            shiftCategory,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative text-center space-y-2">
          <span className="absolute right-0 top-0 text-xs md:text-sm bg-gray-200 text-gray-700 rounded-bl px-2 py-1 font-mono z-10">v2.1.1</span>
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
                  value={dayShiftWorkers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value.replace(/\D/g, ''));
                    setDayShiftWorkers(Math.max(1, value || 1));
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
                  value={nightShiftWorkers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value.replace(/\D/g, ''));
                    setNightShiftWorkers(Math.max(1, value || 1));
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="max-shifts-per-employee">מקסימום משמרות לעובד בשבוע</Label>
                <Input
                  id="max-shifts-per-employee"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxShiftsPerEmployee}
                  onChange={(e) => {
                    const value = parseInt(e.target.value.replace(/\D/g, ''));
                    setMaxShiftsPerEmployee(Math.max(1, value || 1));
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
                    <Label>בחר משמרות בהן זמין (לפי יום ומשמרת):</Label>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-sm font-medium">יום</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">בוקר<br/>(06:00-14:00)</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">יום<br/>(14:00-22:00)</th>
                            <th className="border border-gray-300 p-2 text-sm font-medium">לילה<br/>(22:00-06:00)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS_OF_WEEK.map((dayName, dayIndex) => (
                            <tr key={dayIndex}>
                              <td className="border border-gray-300 p-2 text-sm font-medium bg-gray-50">
                                {dayName}
                              </td>
                              {(['morning', 'day', 'night'] as const).map((shiftType) => (
                                <td key={shiftType} className="border border-gray-300 p-2 text-center">
                                  <Checkbox
                                    checked={(newMemberAvailableShifts[dayIndex] || []).includes(shiftType)}
                                    onCheckedChange={() => toggleAvailableShift(dayIndex, shiftType)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500 mt-2">סמן משמרות בהן העובד זמין</p>
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
                              {DAYS_OF_WEEK[parseInt(day)]}: {shifts.map(shift => SHIFT_CATEGORY_NAMES[shift as keyof typeof SHIFT_CATEGORY_NAMES]).join(', ')}
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
                          return (
                            <td key={dayIndex} className="p-2 text-center">
                              {shift ? (
                                <div className="space-y-1">
                                  {shift.members.map((member, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                                    >
                                      {member}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                סיכום משמרות לעובד
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
