import React, { useState } from 'react';
import { OldStaffRecord } from '../types';
import { Archive, Download, Eye, Search, UserPlus } from 'lucide-react';
import { exportOldStaffPDF } from '../utils/pdfExport';

interface OldStaffRecordsProps {
  oldStaffRecords: OldStaffRecord[];
  onRejoinStaff: (record: OldStaffRecord) => void;
}

const OldStaffRecords: React.FC<OldStaffRecordsProps> = ({ oldStaffRecords, onRejoinStaff }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OldStaffRecord | null>(null);

  const filteredRecords = oldStaffRecords.filter(record =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLocationColor = (location: string) => {
    switch (location) {
      case 'Big Shop':
        return 'bg-blue-100 text-blue-800';
      case 'Small Shop':
        return 'bg-green-100 text-green-800';
      case 'Godown':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'full-time' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  const handleExportPDF = () => {
    exportOldStaffPDF(oldStaffRecords);
  };

  const handleRejoin = (record: OldStaffRecord) => {
    if (window.confirm(`Are you sure you want to rejoin ${record.name}? This will restore them to active staff with their previous salary and advance data.`)) {
      onRejoinStaff(record);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Archive className="text-gray-600" size={32} />
          Old Staff Records
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, location, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Archived Staff Records ({filteredRecords.length})
          </h2>
        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center">
            <Archive className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No archived records found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Archived staff records will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Advance</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason for Leaving</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record, index) => {
                  const joinedDate = new Date(record.joinedDate);
                  const leftDate = new Date(record.leftDate);
                  const tenureMonths = Math.round((leftDate.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                  const tenureYears = Math.floor(tenureMonths / 12);
                  const remainingMonths = tenureMonths % 12;
                  
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.name}</div>
                          <div className="text-sm text-gray-500">
                            {record.joinedDate} - {record.leftDate}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLocationColor(record.location)}`}>
                          {record.location}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(record.type)}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                        {record.experience}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenureYears > 0 && `${tenureYears}y `}{remainingMonths}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₹{record.totalSalary.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          record.totalAdvanceOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{record.totalAdvanceOutstanding.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                        {record.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleRejoin(record)}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Rejoin staff"
                          >
                            <UserPlus size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Archive className="text-gray-600" size={24} />
                {selectedRecord.name} - Staff Record
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedRecord.name}</div>
                  <div><span className="font-medium">Location:</span> {selectedRecord.location}</div>
                  <div><span className="font-medium">Type:</span> {selectedRecord.type}</div>
                  <div><span className="font-medium">Experience:</span> {selectedRecord.experience}</div>
                  <div><span className="font-medium">Joined:</span> {selectedRecord.joinedDate}</div>
                  <div><span className="font-medium">Left:</span> {selectedRecord.leftDate}</div>
                  <div><span className="font-medium">Reason:</span> {selectedRecord.reason}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Salary Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Basic Salary:</span> ₹{selectedRecord.basicSalary.toLocaleString()}</div>
                  <div><span className="font-medium">Incentive:</span> ₹{selectedRecord.incentive.toLocaleString()}</div>
                  <div><span className="font-medium">HRA:</span> ₹{selectedRecord.hra.toLocaleString()}</div>
                  <div><span className="font-medium">Total Salary:</span> ₹{selectedRecord.totalSalary.toLocaleString()}</div>
                  <div>
                    <span className="font-medium">Outstanding Advance:</span> 
                    <span className={`ml-1 font-semibold ${
                      selectedRecord.totalAdvanceOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ₹{selectedRecord.totalAdvanceOutstanding.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => handleRejoin(selectedRecord)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <UserPlus size={16} />
                Rejoin Staff
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OldStaffRecords;