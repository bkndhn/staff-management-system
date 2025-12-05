import React from 'react';
import { Staff, Attendance } from '../types';
import { Users, Clock, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { calculateLocationAttendance } from '../utils/salaryCalculations';

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

  const locations = [
    {
      name: 'Big Shop',
      color: 'bg-blue-100 text-blue-800',
      stats: calculateLocationAttendance(activeStaff, todayAttendance, selectedDate, 'Big Shop')
    },
    {
      name: 'Small Shop',
      color: 'bg-green-100 text-green-800',
      stats: calculateLocationAttendance(activeStaff, todayAttendance, selectedDate, 'Small Shop')
    },
    {
      name: 'Godown',
      color: 'bg-purple-100 text-purple-800',
      stats: calculateLocationAttendance(activeStaff, todayAttendance, selectedDate, 'Godown')
    }
  ];

  // Helper function to format staff names with shift info
  const formatStaffName = (staffId: string, isPartTime: boolean = false, staffName?: string, shift?: string) => {
    if (isPartTime) {
      return shift ? `${staffName} (${shift})` : staffName;
    }

    const staffMember = activeStaff.find(s => s.id === staffId);
    const attendanceRecord = todayAttendance.find(a => a.staffId === staffId && !a.isPartTime);

    if (attendanceRecord?.status === 'Half Day' && attendanceRecord?.shift) {
      return `${staffMember?.name} (${attendanceRecord.shift})`;
    }

    return staffMember?.name;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={32} />
            Dashboard
          </h1>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-gray-500">
              {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Selected Date'}
            </p>
            <p className="text-base md:text-lg font-semibold text-gray-800">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats stats-grid grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
        <div className="stats-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Staff</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-800">{activeStaff.length}</p>
              <p className="text-xs text-gray-500">{fullTimeStaff.length} FT, {partTimeStaff.length} PT</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="stats-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Present Today</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{presentToday + halfDayToday}</p>
              <p className="text-xs text-gray-500">{presentToday} Full, {halfDayToday} Half</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="stats-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Half Day Today</p>
              <p className="text-2xl md:text-3xl font-bold text-yellow-600">{halfDayToday}</p>
              <p className="text-xs text-gray-500">Partial attendance</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-yellow-600" size={20} />
            </div>
          </div>
        </div>

        <div className="stats-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Absent Today</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">{absentToday}</p>
              <p className="text-xs text-gray-500">Not present</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-red-600" size={20} />
            </div>
          </div>
        </div>

        <div className="stats-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Part-Time Today</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-600">{partTimeTotal}</p>
              <p className="text-xs text-gray-500">
                (Both: {partTimeBoth}, Morning: {partTimeMorning}, Evening: {partTimeEvening})
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="text-purple-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Location-based Attendance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <MapPin className="text-blue-600" size={20} />
          Today's Attendance by Location (Including Part-Time & Shifts)
        </h2>

        <div className="space-y-6">
          {locations.map((location) => {
            // Calculate location-wise part-time breakdown
            const locationPartTimeData = partTimeAttendance.filter(record =>
              record.location === location.name
            );

            const locationBoth = locationPartTimeData.filter(record => record.shift === 'Both');
            const locationMorning = locationPartTimeData.filter(record => record.shift === 'Morning');
            const locationEvening = locationPartTimeData.filter(record => record.shift === 'Evening');

            // Create names list in order: Both ΓåÆ Morning ΓåÆ Evening
            const partTimeNames = [
              ...locationBoth.map(record => `${record.staffName} (Both)`),
              ...locationMorning.map(record => `${record.staffName} (Morning)`),
              ...locationEvening.map(record => `${record.staffName} (Evening)`)
            ];

            // Get full-time staff with detailed names (including shift info for half-day)
            const locationFullTimePresent = fullTimeAttendance.filter(record => {
              const staffMember = activeStaff.find(s => s.id === record.staffId);
              const attendanceLocation = record.location || staffMember?.location;
              return record.status === 'Present' && attendanceLocation === location.name;
            }).map(record => formatStaffName(record.staffId, false));

            const locationFullTimeHalfDay = fullTimeAttendance.filter(record => {
              const staffMember = activeStaff.find(s => s.id === record.staffId);
              const attendanceLocation = record.location || staffMember?.location;
              return record.status === 'Half Day' && attendanceLocation === location.name;
            }).map(record => formatStaffName(record.staffId, false));

            const locationFullTimeAbsent = fullTimeAttendance.filter(record => {
              const staffMember = activeStaff.find(s => s.id === record.staffId);
              const attendanceLocation = record.location || staffMember?.location;
              return record.status === 'Absent' && attendanceLocation === location.name;
            }).map(record => formatStaffName(record.staffId, false));

            // Calculate total present value for this location
            const locationTotalPresent = locationFullTimePresent.length + (locationFullTimeHalfDay.length * 0.5);

            return (
              <div key={location.name} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-base md:text-lg font-semibold text-blue-600 mb-4 text-center">
                  {location.name} - Total Present: {locationFullTimePresent.length + locationFullTimeHalfDay.length}
                  {locationPartTimeData.length > 0 && (
                    <span className="text-sm">
                      {' + Part-Time: '}{locationPartTimeData.length}
                      {' ('}
                      Both: {locationBoth.length}, Morning: {locationMorning.length}, Evening: {locationEvening.length}
                      {')'}
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                    <p className="text-base md:text-lg font-bold text-green-600 mb-1">Present: {locationFullTimePresent.length}</p>
                    <p className="text-sm text-gray-600">
                      {locationFullTimePresent.length > 0 ? locationFullTimePresent.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-3 md:p-4 rounded-lg">
                    <p className="text-base md:text-lg font-bold text-yellow-600 mb-1">Half-day: {locationFullTimeHalfDay.length}</p>
                    <p className="text-sm text-gray-600">
                      {locationFullTimeHalfDay.length > 0 ? locationFullTimeHalfDay.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="bg-red-50 p-3 md:p-4 rounded-lg">
                    <p className="text-base md:text-lg font-bold text-red-600 mb-1">Absent: {locationFullTimeAbsent.length}</p>
                    <p className="text-sm text-gray-600">
                      {locationFullTimeAbsent.length > 0 ? locationFullTimeAbsent.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 md:p-4 rounded-lg">
                    <p className="text-base md:text-lg font-bold text-purple-600 mb-1">
                      Part-Time: {locationPartTimeData.length} (Both: {locationBoth.length}, Morning: {locationMorning.length}, Evening: {locationEvening.length})
                    </p>
                    <p className="text-sm text-gray-600">
                      {partTimeNames.length > 0
                        ? partTimeNames.join(', ')
                        : 'None'
                      }
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Organization Attendance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={20} />
          Overall Organization Attendance
        </h2>

        {(() => {
          // Calculate overall stats
          const overallPartTimeBoth = partTimeAttendance.filter(record => record.shift === 'Both');
          const overallPartTimeMorning = partTimeAttendance.filter(record => record.shift === 'Morning');
          const overallPartTimeEvening = partTimeAttendance.filter(record => record.shift === 'Evening');

          const overallPartTimeNames = [
            ...overallPartTimeBoth.map(record => `${record.staffName} (Both)`),
            ...overallPartTimeMorning.map(record => `${record.staffName} (Morning)`),
            ...overallPartTimeEvening.map(record => `${record.staffName} (Evening)`)
          ];

          const overallFullTimePresent = fullTimeAttendance.filter(record => record.status === 'Present')
            .map(record => formatStaffName(record.staffId, false));

          const overallFullTimeHalfDay = fullTimeAttendance.filter(record => record.status === 'Half Day')
            .map(record => formatStaffName(record.staffId, false));

          const overallFullTimeAbsent = fullTimeAttendance.filter(record => record.status === 'Absent')
            .map(record => formatStaffName(record.staffId, false));

          return (
            <div className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
              <h3 className="text-base md:text-lg font-semibold text-blue-600 mb-4 text-center">
                All Locations - Total Present: {overallFullTimePresent.length + overallFullTimeHalfDay.length}
                {partTimeAttendance.length > 0 && (
                  <span className="text-sm">
                    {' + Part-Time: '}{partTimeAttendance.length}
                    {' ('}
                    Both: {overallPartTimeBoth.length}, Morning: {overallPartTimeMorning.length}, Evening: {overallPartTimeEvening.length}
                    {')'}
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                  <p className="text-base md:text-lg font-bold text-green-600 mb-1">Present: {overallFullTimePresent.length}</p>
                  <p className="text-sm text-gray-600">
                    {overallFullTimePresent.length > 0 ? overallFullTimePresent.join(', ') : 'None'}
                  </p>
                </div>

                <div className="bg-yellow-50 p-3 md:p-4 rounded-lg">
                  <p className="text-base md:text-lg font-bold text-yellow-600 mb-1">Half-day: {overallFullTimeHalfDay.length}</p>
                  <p className="text-sm text-gray-600">
                    {overallFullTimeHalfDay.length > 0 ? overallFullTimeHalfDay.join(', ') : 'None'}
                  </p>
                </div>

                <div className="bg-red-50 p-3 md:p-4 rounded-lg">
                  <p className="text-base md:text-lg font-bold text-red-600 mb-1">Absent: {overallFullTimeAbsent.length}</p>
                  <p className="text-sm text-gray-600">
                    {overallFullTimeAbsent.length > 0 ? overallFullTimeAbsent.join(', ') : 'None'}
                  </p>
                </div>

                <div className="bg-purple-50 p-3 md:p-4 rounded-lg">
                  <p className="text-base md:text-lg font-bold text-purple-600 mb-1">
                    Part-Time: {partTimeAttendance.length} (Both: {overallPartTimeBoth.length}, Morning: {overallPartTimeMorning.length}, Evening: {overallPartTimeEvening.length})
                  </p>
                  <p className="text-sm text-gray-600">
                    {overallPartTimeNames.length > 0
                      ? overallPartTimeNames.join(', ')
                      : 'None'
                    }
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Dashboard;

