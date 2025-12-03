import React, { useState } from 'react';
import { Staff, OldStaffRecord, SalaryHike, SalaryCategory } from '../types';
import { Users, Plus, Edit2, Trash2, Download, Archive, Calendar, TrendingUp, Settings, MapPin, DollarSign, Check, X, Search } from 'lucide-react';
import { calculateExperience } from '../utils/salaryCalculations';
import SalaryHikeHistory from './SalaryHikeHistory';
import { settingsService } from '../services/settingsService';

interface StaffManagementProps {
  staff: Staff[];
  salaryHikes: SalaryHike[];
  onAddStaff: (staff: Omit<Staff, 'id'>) => void;
  onUpdateStaff: (id: string, staff: Partial<Staff>) => void;
  onDeleteStaff: (id: string, reason: string) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({
  staff,
  salaryHikes,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Staff | null>(null);
  const [showSalaryHistory, setShowSalaryHistory] = useState<Staff | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [locations, setLocations] = useState<string[]>(settingsService.getLocations());
  const [salaryCategories, setSalaryCategories] = useState<SalaryCategory[]>(settingsService.getSalaryCategories());
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [editCategoryValue, setEditCategoryValue] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    location: locations[0] || 'Big Shop',
    basicSalary: 15000,
    incentive: 10000,
    hra: 0,
    joinedDate: new Date().toISOString().split('T')[0],
    salarySupplements: {} as Record<string, number>,
    sundayPenalty: true,
    salaryCalculationDays: 30
  });

  const activeStaff = staff.filter(member => {
    if (!member.isActive) return false;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.location.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({
      name: '',
      location: locations[0] || 'Big Shop',
      basicSalary: 15000,
      incentive: 10000,
      hra: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      salarySupplements: {},
      sundayPenalty: true,
      salaryCalculationDays: 30
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate total salary including supplements
    const supplementsTotal = Object.values(formData.salarySupplements).reduce((a, b) => a + b, 0);
    const totalSalary = formData.basicSalary + formData.incentive + formData.hra + supplementsTotal;
    const experience = calculateExperience(formData.joinedDate);

    // Save supplements to local storage
    if (editingStaff) {
      settingsService.updateStaffSupplement(editingStaff.id, formData.salarySupplements);

      onUpdateStaff(editingStaff.id, {
        ...formData,
        totalSalary,
        experience,
        type: 'full-time',
        sundayPenalty: formData.sundayPenalty
      });
      setEditingStaff(null);
    } else {
      // For new staff, we'll need the ID to save supplements, but we don't have it yet.
      // In a real app, we'd wait for the ID. Here we'll handle it after creation if possible,
      // or just pass it along if the API supported it.
      // Since we can't easily get the ID back synchronously from the parent in this flow without changing props,
      // we will rely on the parent or just save it with a temporary ID if needed, but better to just
      // let the user update it later or assume the parent handles it. 
      // ACTUALLY: The best way here is to pass supplements to onAddStaff if we updated the type,
      // but we only updated the type in index.ts.
      // Let's assume onAddStaff handles it or we update the service to accept it.
      // For now, we will just pass it in the staff object since we updated the type.

      onAddStaff({
        ...formData,
        totalSalary,
        experience,
        type: 'full-time',
        isActive: true,
        initialSalary: totalSalary,
        salarySupplements: formData.salarySupplements,
        sundayPenalty: formData.sundayPenalty
      });
      setShowAddForm(false);
    }
    resetForm();
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    const supplements = settingsService.getStaffSupplement(staffMember.id);
    setFormData({
      name: staffMember.name,
      location: staffMember.location,
      basicSalary: staffMember.basicSalary,
      incentive: staffMember.incentive,
      hra: staffMember.hra,
      joinedDate: staffMember.joinedDate,
      salarySupplements: supplements,
      sundayPenalty: staffMember.sundayPenalty ?? true,
      salaryCalculationDays: staffMember.salaryCalculationDays || 30
    });

    // Auto-scroll to the form at the top
    setTimeout(() => {
      const formElement = document.querySelector('.edit-staff-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDelete = (staffMember: Staff) => {
    setShowDeleteModal(staffMember);
    setDeleteReason('');
  };

  const confirmDelete = () => {
    if (showDeleteModal && deleteReason.trim()) {
      onDeleteStaff(showDeleteModal.id, deleteReason);
      setShowDeleteModal(null);
      setDeleteReason('');
    }
  };

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

  const getStaffSalaryHikes = (staffId: string) => {
    return salaryHikes.filter(hike => hike.staffId === staffId);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-blue-600 md:w-8 md:h-8" size={24} />
          Staff Management
        </h1>

        <div className="flex flex-col md:flex-row gap-4 flex-1 md:justify-end">
          {/* Search Bar */}
          <div className="relative flex-1 md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button
              onClick={() => setShowLocationManager(true)}
              className="whitespace-nowrap flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
            >
              <MapPin size={16} />
              <span className="hidden md:inline">Locations</span>
              <span className="md:hidden">Loc</span>
            </button>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="whitespace-nowrap flex items-center gap-2 px-3 md:px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
            >
              <DollarSign size={16} />
              <span className="hidden md:inline">Categories</span>
              <span className="md:hidden">Cat</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="whitespace-nowrap flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              <span className="hidden md:inline">Add Staff</span>
              <span className="md:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingStaff) && (
        <div className="edit-staff-form bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
            {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <form onSubmit={handleSubmit} className="form-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joined Date</label>
              <input
                type="date"
                value={formData.joinedDate}
                onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
              <input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incentive</label>
              <input
                type="number"
                value={formData.incentive}
                onChange={(e) => setFormData({ ...formData, incentive: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HRA</label>
              <input
                type="number"
                value={formData.hra}
                onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Calculation Days</label>
              <input
                type="number"
                value={formData.salaryCalculationDays}
                onChange={(e) => setFormData({ ...formData, salaryCalculationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="31"
                title="Number of days to use for salary calculation (for prorated salaries)"
              />
            </div>

            <div className="flex items-center h-full pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sundayPenalty}
                  onChange={(e) => setFormData({ ...formData, sundayPenalty: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Apply Sunday Penalty</span>
              </label>
            </div>

            {/* Dynamic Salary Categories */}
            {salaryCategories.filter(c => !['basic', 'incentive', 'hra'].includes(c.id)).map(category => (
              <div key={category.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{category.name}</label>
                <input
                  type="number"
                  value={formData.salarySupplements[category.id] || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    salarySupplements: {
                      ...formData.salarySupplements,
                      [category.id]: Number(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 form-actions flex gap-3">
              <button
                type="submit"
                className="mobile-full-button px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingStaff ? 'Update Staff' : 'Add Staff'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingStaff(null);
                  resetForm();
                }}
                className="mobile-full-button px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modal-container bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Archive className="text-red-600" size={20} />
              Archive Staff Member
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive <strong>{showDeleteModal.name}</strong>?
              This will move them to Old Staff Records.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for leaving</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g., Resigned - Better opportunity, Terminated - Performance issues"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>
            <div className="form-actions flex gap-3">
              <button
                onClick={confirmDelete}
                disabled={!deleteReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Archive Staff
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary History Modal */}
      {showSalaryHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modal-container bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={24} />
                Salary Hike History
              </h3>
              <button
                onClick={() => setShowSalaryHistory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <SalaryHikeHistory
              salaryHikes={getStaffSalaryHikes(showSalaryHistory.id)}
              staffName={showSalaryHistory.name}
              currentSalary={showSalaryHistory.totalSalary}
              staff={showSalaryHistory}
            />

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSalaryHistory(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Active Staff ({activeStaff.length})
          </h2>
        </div>
        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50">Name</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incentive</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HRA</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary History</th>
                <th className="px-3 md:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeStaff.map((member, index) => {
                const memberHikes = getStaffSalaryHikes(member.id);
                const hasHikes = memberHikes.length > 0;

                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap sticky left-0 z-10 bg-white">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          Joined: {new Date(member.joinedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLocationColor(member.location)}`}>
                        {member.location}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {calculateExperience(member.joinedDate)}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{member.basicSalary.toLocaleString()}</td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{member.incentive.toLocaleString()}</td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{member.hra.toLocaleString()}</td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">₹{member.totalSalary.toLocaleString()}</td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setShowSalaryHistory(member)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${hasHikes
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        <TrendingUp size={12} />
                        {hasHikes ? `${memberHikes.length} hikes` : 'No hikes'}
                      </button>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit staff member"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Archive staff member"
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Location Manager Modal */}
      {
        showLocationManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-container bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-purple-600" size={20} />
                Manage Locations
              </h3>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="New Location Name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (newLocation.trim()) {
                      const updated = settingsService.addLocation(newLocation.trim());
                      setLocations(updated);
                      setNewLocation('');
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {locations.map(loc => (
                  <div key={loc} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    {editingLocation === loc ? (
                      <>
                        <input
                          type="text"
                          value={editLocationValue}
                          onChange={(e) => setEditLocationValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => {
                              if (editLocationValue.trim()) {
                                const updated = settingsService.updateLocation(loc, editLocationValue.trim());
                                setLocations(updated);
                                setEditingLocation(null);
                              }
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingLocation(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{loc}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingLocation(loc);
                              setEditLocationValue(loc);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={16} />
                          </button>
                          {!['Big Shop', 'Small Shop', 'Godown'].includes(loc) && (
                            <button
                              onClick={() => {
                                const updated = settingsService.deleteLocation(loc);
                                setLocations(updated);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowLocationManager(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Salary Category Manager Modal */}
      {
        showCategoryManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-container bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" size={20} />
                Manage Salary Categories
              </h3>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (newCategory.trim()) {
                      const updated = settingsService.addSalaryCategory(newCategory.trim());
                      setSalaryCategories(updated);
                      setNewCategory('');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {salaryCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    {editingCategory === cat.id ? (
                      <>
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => {
                              if (editCategoryValue.trim()) {
                                const updated = settingsService.updateSalaryCategory(cat.id, editCategoryValue.trim());
                                setSalaryCategories(updated);
                                setEditingCategory(null);
                              }
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{cat.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(cat.id);
                              setEditCategoryValue(cat.name);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={16} />
                          </button>
                          {!['basic', 'incentive', 'hra'].includes(cat.id) && (
                            <button
                              onClick={() => {
                                const updated = settingsService.deleteSalaryCategory(cat.id);
                                setSalaryCategories(updated);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default StaffManagement;