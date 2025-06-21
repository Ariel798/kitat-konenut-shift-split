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
  unavailableShifts: Record<number, string[]>; // day of week -> array of unavailable shift types
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
  const [newMemberUnavailableShifts, setNewMemberUnavailableShifts] = useState<Record<number, string[]>>({});
  const [minDayWorkers, setMinDayWorkers] = useState(1);
  const [minNightWorkers, setMinNightWorkers] = useState(1);
  const [maxShiftsPerEmployee, setMaxShiftsPerEmployee] = useState(10);
  const [dayShiftWorkers, setDayShiftWorkers] = useState(1);
  const [nightShiftWorkers, setNightShiftWorkers] = useState(1);

  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 });

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newMemberName.trim(),
        unavailableShifts: { ...newMemberUnavailableShifts }
      };
      setTeamMembers([...teamMembers, newMember]);
      setNewMemberName('');
      setNewMemberUnavailableShifts({});
      setShowAddForm(false);
    }
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const toggleUnavailableShift = (dayIndex: number, shiftCategory: string) => {
    setNewMemberUnavailableShifts(prev => {
      const dayUnavailable = prev[dayIndex] || [];
      const isCurrentlyUnavailable = dayUnavailable.includes(shiftCategory);
      
      if (isCurrentlyUnavailable) {
        // Remove from unavailable
        const newDayUnavailable = dayUnavailable.filter(s => s !== shiftCategory);
        if (newDayUnavailable.length === 0) {
          const { [dayIndex]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [dayIndex]: newDayUnavailable };
        }
      } else {
        // Add to unavailable
        return { ...prev, [dayIndex]: [...dayUnavailable, shiftCategory] };
      }
    });
  };

  const generateShifts = () => {
    const newShifts: Shift[] = [];
    const memberDayShifts: Record<string, Record<number, number>> = {};
    const memberTotalShifts: Record<string, number> = {};
    teamMembers.forEach(member => {
      memberDayShifts[member.name] = {};
      memberTotalShifts[member.name] = 0;
      for (let day = 0; day < 7; day++) {
        memberDayShifts[member.name][day] = 0;
      }
    });
    for (let day = 0; day < 7; day++) {
      for (const timeSlot of TIME_SLOTS) {
        const shiftCategory = getShiftCategory(timeSlot);
        const availableMembers = teamMembers.filter(member => {
          const dayUnavailable = member.unavailableShifts[day] || [];
          return !dayUnavailable.includes(shiftCategory) &&
            memberDayShifts[member.name][day] < 2 &&
            memberTotalShifts[member.name] < maxShiftsPerEmployee;
        });
        const exactWorkers = isDayShift(timeSlot) ? dayShiftWorkers : nightShiftWorkers;
        const assignedCount = Math.min(exactWorkers, availableMembers.length);
        // Sort available members by their total assigned shifts (ascending)
        const sortedByShifts = [...availableMembers].sort((a, b) => {
          return memberTotalShifts[a.name] - memberTotalShifts[b.name];
        });
        // If there is a tie, shuffle among those with the same count
        let assignedMembers: typeof availableMembers = [];
        let i = 0;
        while (assignedMembers.length < assignedCount && i < sortedByShifts.length) {
          // Find all with the same shift count as the current index
          const currentCount = memberTotalShifts[sortedByShifts[i].name];
          const sameCountGroup = sortedByShifts.filter(m => memberTotalShifts[m.name] === currentCount && !assignedMembers.includes(m));
          // Shuffle this group
          const shuffledGroup = sameCountGroup.sort(() => 0.5 - Math.random());
          for (const m of shuffledGroup) {
            if (assignedMembers.length < assignedCount) {
              assignedMembers.push(m);
            }
          }
          i += sameCountGroup.length;
        }
        if (assignedMembers.length > 0) {
          assignedMembers.forEach(member => {
            memberDayShifts[member.name][day]++;
            memberTotalShifts[member.name]++;
          });
          newShifts.push({
            day,
            timeSlot,
            members: assignedMembers.map(m => m.name)
          });
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
          <span className="absolute right-0 top-0 text-xs md:text-sm bg-gray-200 text-gray-700 rounded-bl px-2 py-1 font-mono z-10">v1.0.3</span>
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
                  type="number"
                  min="1"
                  value={dayShiftWorkers}
                  onChange={(e) => setDayShiftWorkers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="night-shift-workers">סד"כ במשמרת לילה (22:00-06:00)</Label>
                <Input
                  id="night-shift-workers"
                  type="number"
                  min="1"
                  value={nightShiftWorkers}
                  onChange={(e) => setNightShiftWorkers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="max-shifts-per-employee">מקסימום משמרות לעובד בשבוע</Label>
                <Input
                  id="max-shifts-per-employee"
                  type="number"
                  min="1"
                  value={maxShiftsPerEmployee}
                  onChange={(e) => setMaxShiftsPerEmployee(Math.max(1, parseInt(e.target.value) || 1))}
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
              <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
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
                    <Label>בחר משמרות בהן לא זמין (לפי יום ומשמרת):</Label>
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
                                    checked={(newMemberUnavailableShifts[dayIndex] || []).includes(shiftType)}
                                    onCheckedChange={() => toggleUnavailableShift(dayIndex, shiftType)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500 mt-2">סמן משמרות בהן העובד לא זמין</p>
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
                      {Object.keys(member.unavailableShifts).length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span>לא זמין: </span>
                          {Object.entries(member.unavailableShifts).map(([day, shifts]) => (
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
      </div>
    </div>
  );
};

export default ShiftScheduler;
