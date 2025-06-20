
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
  unavailableShifts: string[]; // Array of shift types: 'morning', 'day', 'night'
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
  morning: 'בוקר (06:00-14:00)',
  day: 'יום (14:00-22:00)',
  night: 'לילה (22:00-06:00)'
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
  const [newMemberUnavailableShifts, setNewMemberUnavailableShifts] = useState<string[]>([]);
  const [minDayWorkers, setMinDayWorkers] = useState(1);
  const [minNightWorkers, setMinNightWorkers] = useState(1);

  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 });

  const addTeamMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newMemberName.trim(),
        unavailableShifts: [...newMemberUnavailableShifts]
      };
      setTeamMembers([...teamMembers, newMember]);
      setNewMemberName('');
      setNewMemberUnavailableShifts([]);
      setShowAddForm(false);
    }
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const toggleUnavailableShift = (shiftCategory: string) => {
    setNewMemberUnavailableShifts(prev => 
      prev.includes(shiftCategory) 
        ? prev.filter(s => s !== shiftCategory)
        : [...prev, shiftCategory]
    );
  };

  const generateShifts = () => {
    const newShifts: Shift[] = [];
    // Track shifts per member per day (member name -> day -> shift count)
    const memberDayShifts: Record<string, Record<number, number>> = {};
    
    // Initialize tracking
    teamMembers.forEach(member => {
      memberDayShifts[member.name] = {};
      for (let day = 0; day < 7; day++) {
        memberDayShifts[member.name][day] = 0;
      }
    });
    
    for (let day = 0; day < 7; day++) {
      for (const timeSlot of TIME_SLOTS) {
        const shiftCategory = getShiftCategory(timeSlot);
        const availableMembers = teamMembers.filter(member => 
          !member.unavailableShifts.includes(shiftCategory) && 
          memberDayShifts[member.name][day] < 2 // Maximum 2 shifts per day
        );
        
        // Determine minimum workers based on day/night shift
        const minWorkers = isDayShift(timeSlot) ? minDayWorkers : minNightWorkers;
        
        // Assign workers ensuring minimum requirement is met
        const shuffled = [...availableMembers].sort(() => 0.5 - Math.random());
        const maxWorkers = Math.min(Math.max(minWorkers, Math.floor(Math.random() * 3) + 1), shuffled.length);
        const assignedCount = Math.max(minWorkers, Math.min(maxWorkers, shuffled.length));
        const assignedMembers = shuffled.slice(0, assignedCount);
        
        if (assignedMembers.length > 0) {
          // Update shift count for assigned members
          assignedMembers.forEach(member => {
            memberDayShifts[member.name][day]++;
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
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">מערכת חלוקת משמרות</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-day-workers">מינימום עובדים במשמרת יום (06:00-22:00)</Label>
                <Input
                  id="min-day-workers"
                  type="number"
                  min="1"
                  value={minDayWorkers}
                  onChange={(e) => setMinDayWorkers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="min-night-workers">מינימום עובדים במשמרת לילה (22:00-06:00)</Label>
                <Input
                  id="min-night-workers"
                  type="number"
                  min="1"
                  value={minNightWorkers}
                  onChange={(e) => setMinNightWorkers(Math.max(1, parseInt(e.target.value) || 1))}
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
                    <Label>משמרות בהן לא זמין:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(SHIFT_CATEGORY_NAMES).map(([category, name]) => (
                        <label key={category} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={newMemberUnavailableShifts.includes(category)}
                            onCheckedChange={() => toggleUnavailableShift(category)}
                          />
                          <span className="text-sm">{name}</span>
                        </label>
                      ))}
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
                      {member.unavailableShifts.length > 0 && (
                        <p className="text-sm text-gray-600">
                          לא זמין: {member.unavailableShifts.map(shift => SHIFT_CATEGORY_NAMES[shift as keyof typeof SHIFT_CATEGORY_NAMES]).join(', ')}
                        </p>
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
