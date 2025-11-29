import React from 'react';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { SalaryHike, Staff } from '../types';

interface SalaryHikeHistoryProps {
  salaryHikes: SalaryHike[];
  staffName: string;
  currentSalary: number;
  staff?: Staff;
}

const SalaryHikeHistory: React.FC<SalaryHikeHistoryProps> = ({
  salaryHikes,
  staffName,
  currentSalary,
  staff
}) => {
  const latestHike = salaryHikes[0]; // Assuming sorted by date desc
  
  const getMonthsSinceHike = (hikeDate: string): number => {
    const hike = new Date(hikeDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - hike.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  };

  if (salaryHikes.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600 text-sm">No salary hikes recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Salary Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <DollarSign className="text-green-600" size={16} />
          Current Salary Status - {staffName}
        </h4>
        
        {latestHike && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Salary Hiked Month:</span>
              <div className="font-semibold text-gray-800">
                {new Date(latestHike.hikeDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short' 
                })}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Last Salary:</span>
              <div className="font-semibold text-gray-800">₹{latestHike.oldSalary.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Current Salary:</span>
              <div className="font-semibold text-green-600">₹{currentSalary.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Months Since Hike:</span>
              <div className="font-semibold text-blue-600">{getMonthsSinceHike(latestHike.hikeDate)}</div>
            </div>
          </div>
        )}
        
        {latestHike && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <span className="text-gray-600">Difference:</span>
            <span className="ml-2 font-semibold text-green-600">
              +₹{(currentSalary - latestHike.oldSalary).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Hike History */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={16} />
            Salary Hike History
          </h4>
        </div>
        
        <div className="divide-y divide-gray-200">
          {salaryHikes.map((hike, index) => (
            <div key={hike.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="text-gray-400" size={14} />
                  <span className="text-sm font-medium text-gray-800">
                    {new Date(hike.hikeDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Latest
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    ₹{hike.oldSalary.toLocaleString()} → ₹{hike.newSalary.toLocaleString()}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    +₹{(hike.newSalary - hike.oldSalary).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Component-wise breakdown */}
              {staff && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Component-wise Changes:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-600">Basic Salary:</span>
                      <div className="font-medium">
                        {index === salaryHikes.length - 1 ? (
                          // First hike - compare with initial salary
                          staff.initialSalary ? (
                            <>
                              ₹{Math.round(staff.initialSalary * 0.6).toLocaleString()} → ₹{staff.basicSalary.toLocaleString()}
                              <span className="text-green-600 ml-1">
                                (+₹{(staff.basicSalary - Math.round(staff.initialSalary * 0.6)).toLocaleString()})
                              </span>
                            </>
                          ) : (
                            `₹${staff.basicSalary.toLocaleString()}`
                          )
                        ) : (
                          // Subsequent hikes - assume proportional increase
                          <>
                            ₹{Math.round((hike.oldSalary / hike.newSalary) * staff.basicSalary).toLocaleString()} → ₹{staff.basicSalary.toLocaleString()}
                            <span className="text-green-600 ml-1">
                              (+₹{(staff.basicSalary - Math.round((hike.oldSalary / hike.newSalary) * staff.basicSalary)).toLocaleString()})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-600">Incentive:</span>
                      <div className="font-medium">
                        {index === salaryHikes.length - 1 ? (
                          staff.initialSalary ? (
                            <>
                              ₹{Math.round(staff.initialSalary * 0.33).toLocaleString()} → ₹{staff.incentive.toLocaleString()}
                              {staff.incentive !== Math.round(staff.initialSalary * 0.33) ? (
                                <span className="text-green-600 ml-1">
                                  (+₹{(staff.incentive - Math.round(staff.initialSalary * 0.33)).toLocaleString()})
                                </span>
                              ) : (
                                <span className="text-gray-500 ml-1">(No Change)</span>
                              )}
                            </>
                          ) : (
                            `₹${staff.incentive.toLocaleString()}`
                          )
                        ) : (
                          <>
                            ₹{Math.round((hike.oldSalary / hike.newSalary) * staff.incentive).toLocaleString()} → ₹{staff.incentive.toLocaleString()}
                            {staff.incentive !== Math.round((hike.oldSalary / hike.newSalary) * staff.incentive) ? (
                              <span className="text-green-600 ml-1">
                                (+₹{(staff.incentive - Math.round((hike.oldSalary / hike.newSalary) * staff.incentive)).toLocaleString()})
                              </span>
                            ) : (
                              <span className="text-gray-500 ml-1">(No Change)</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-600">HRA:</span>
                      <div className="font-medium">
                        {index === salaryHikes.length - 1 ? (
                          staff.initialSalary ? (
                            <>
                              ₹{Math.round(staff.initialSalary * 0.07).toLocaleString()} → ₹{staff.hra.toLocaleString()}
                              {staff.hra !== Math.round(staff.initialSalary * 0.07) ? (
                                <span className="text-green-600 ml-1">
                                  (+₹{(staff.hra - Math.round(staff.initialSalary * 0.07)).toLocaleString()})
                                </span>
                              ) : (
                                <span className="text-gray-500 ml-1">(No Change)</span>
                              )}
                            </>
                          ) : (
                            `₹${staff.hra.toLocaleString()}`
                          )
                        ) : (
                          <>
                            ₹{Math.round((hike.oldSalary / hike.newSalary) * staff.hra).toLocaleString()} → ₹{staff.hra.toLocaleString()}
                            {staff.hra !== Math.round((hike.oldSalary / hike.newSalary) * staff.hra) ? (
                              <span className="text-green-600 ml-1">
                                (+₹{(staff.hra - Math.round((hike.oldSalary / hike.newSalary) * staff.hra)).toLocaleString()})
                              </span>
                            ) : (
                              <span className="text-gray-500 ml-1">(No Change)</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {hike.reason && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Reason:</strong> {hike.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalaryHikeHistory;