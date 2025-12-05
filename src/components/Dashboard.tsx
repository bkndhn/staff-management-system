import React from 'react';
import { Staff, Attendance } from '../types';
import { Users, Clock, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { calculateLocationAttendance } from '../utils/salaryCalculations';
import { settingsService } from '../services/settingsService';

interface DashboardProps {
  staff: Staff[];
  attendance: Attendance[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ staff, attendance, selectedDate, onDateChange }) => {
  const todayAttendance = attendance.filter(record => record.date === selectedDate);

  const activeStaff = staff.filter(member => member.isActive);
  const fullTimeStaff = activeStaff.filter(member => member.type === 'full-time');
  const partTimeStaff = activeStaff.filter(member => member.type === 'part-time');

  // Full-time attendance
  const fullTimeAttendance = todayAttendance.filter(record => !record.isPartTime);
  const presentToday = fullTimeAttendance.filter(record => record.status === 'Present').length;
  const halfDayToday = fullTimeAttendance.filter(record => record.status === 'Half Day').length;
  const absentToday = fullTimeAttendance.filter(record => record.status === 'Absent').length;

  // Part-time attendance
  const partTimeAttendance = todayAttendance.filter(record => record.isPartTime && record.status === 'Present');

  // Calculate part-time breakdown for top summary card
  const partTimeBoth = partTimeAttendance.filter(record => record.shift === 'Both').length;
  const partTimeMorning = partTimeAttendance.filter(record => record.shift === 'Morning').length;
  const partTimeEvening = partTimeAttendance.filter(record => record.shift === 'Evening').length;
  const partTimeTotal = partTimeBoth + partTimeMorning + partTimeEvening;

  // Calculate total present value including half days (corrected logic)
  const totalPresentValue = presentToday + halfDayToday;

  const locationList = settingsService.getLocations();
  const locationColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-orange-100 text-orange-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800'
  ];

  const locations = locationList.map((loc, index) => ({
    name: loc,
    color: locationColors[index % locationColors.length],
    stats: calculateLocationAttendance(activeStaff, todayAttendance, selectedDate, loc)
  }));

  // Helper function to format staff names with shift info
  const formatStaffName = (staffId: string, isPartTime: boolean = false, staffName?: string, shift?: string) => {
    if (isPartTime) {
      return `${staffName} (${shift})`;
    }
    const member = staff.find(s => s.id === staffId);
    return member ? member.name : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Daily Overview</h2>
            <p className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">Total Staff</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gray-800">{activeStaff.length}</span>
            <span className="text-sm text-gray-500 mb-1">
              ({fullTimeStaff.length} FT, {partTimeStaff.length} PT)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">Full-Time Present</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <Clock className="text-green-600" size={20} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gray-800">{totalPresentValue}</span>
            <span className="text-sm text-gray-500 mb-1">
              / {fullTimeStaff.length}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-2">
            <span className="text-green-600 font-medium">{presentToday} Full</span>
            <span>•</span>
            <span className="text-amber-600 font-medium">{halfDayToday} Half</span>
            <span>•</span>
            <span className="text-red-600 font-medium">{absentToday} Absent</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-500 text-sm font-medium">Part-Time Present</h3>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="text-purple-600" size={20} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-800">{partTimeTotal}</span>
              <span className="text-sm text-gray-500 mb-1">
                / {partTimeStaff.length}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex gap-2">
              <span className="text-purple-600 font-medium">{partTimeMorning} M</span>
              <span>•</span>
              <span className="text-orange-600 font-medium">{partTimeEvening} E</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">{partTimeBoth} B</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">Attendance Rate</h3>
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="text-orange-600" size={20} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gray-800">
              {activeStaff.length > 0
                ? Math.round(((totalPresentValue + partTimeTotal) / activeStaff.length) * 100)
                : 0}%
            </span>
            <span className="text-sm text-green-600 mb-1">Today</span>
          </div>
        </div>
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <div key={location.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`px-4 py-3 border-b border-gray-100 flex justify-between items-center ${location.color}`}>
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <h3 className="font-semibold">{location.name}</h3>
              </div>
              <span className="text-sm font-medium bg-white/50 px-2 py-1 rounded-lg">
                {location.stats.present}/{location.stats.total} Present
              </span>
            </div>
            <div className="p-4 space-y-4">
              {/* Present Staff */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Present ({location.stats.present})</h4>
                <div className="flex flex-wrap gap-2">
                  {location.stats.presentNames.length > 0 ? (
                    location.stats.presentNames.map((name, i) => (
                      <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md border border-green-100">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">None</span>
                  )}
                </div>
              </div>

              {/* Half Day Staff */}
              {location.stats.halfDay > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Half Day ({location.stats.halfDay})</h4>
                  <div className="flex flex-wrap gap-2">
                    {location.stats.halfDayNames.map((name, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-md border border-amber-100">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Absent Staff */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Absent ({location.stats.absent})</h4>
                <div className="flex flex-wrap gap-2">
                  {location.stats.absentNames.length > 0 ? (
                    location.stats.absentNames.map((name, i) => (
                      <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;