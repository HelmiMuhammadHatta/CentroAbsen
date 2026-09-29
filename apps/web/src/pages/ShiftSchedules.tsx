import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, workShiftService, shiftScheduleService } from '../services/apiService';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Search, Settings2, ShieldAlert } from 'lucide-react';

export const ShiftSchedules = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    return start;
  });
  
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'rotating' | 'all'>('rotating');
  
  const queryClient = useQueryClient();

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeekStart]);

  const startDateStr = weekDates[0].toISOString().split('T')[0];
  const endDateStr = weekDates[6].toISOString().split('T')[0];

  const { data: employeesData, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', 'all', search],
    queryFn: () => employeeService.getAll({ page: 1, pageSize: 1000, search: search || undefined })
  });

  const { data: workshiftsData, isLoading: loadingShifts } = useQuery({
    queryKey: ['workshifts'],
    queryFn: workShiftService.getAll
  });

  const { data: schedulesData, isLoading: loadingScheds } = useQuery({
    queryKey: ['schedules', startDateStr, endDateStr],
    queryFn: () => shiftScheduleService.getSchedules('', startDateStr, endDateStr)
  });

  const assignMutation = useMutation({
    mutationFn: shiftScheduleService.assign,
    onSuccess: () => {
      toast.success("Shift schedule updated!");
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: () => toast.error("Failed to update shift schedule")
  });

  const generateMutation = useMutation({
    mutationFn: shiftScheduleService.generate,
    onSuccess: () => {
      toast.success("Shift schedules generated successfully!");
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to generate schedules")
  });

  const handlePrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const handleShiftChange = (employeeId: string, date: Date, workShiftId: string) => {
    assignMutation.mutate({
      employeeId,
      date: date.toISOString().split('T')[0],
      workShiftId: workShiftId || null
    });
  };

  const getScheduleForEmployeeAndDate = (employeeId: string, date: Date) => {
    const schedulesArray = schedulesData?.data || schedulesData;
    if (!Array.isArray(schedulesArray)) return null;
    const dateStr = date.toISOString().split('T')[0];
    return schedulesArray.find((s: any) => s.employeeId === employeeId && s.date.startsWith(dateStr));
  };

  const allEmployees = employeesData?.data?.data || [];
  const displayEmployees = useMemo(() => {
    if (filterType === 'rotating') {
      return allEmployees.filter((emp: any) => emp.rotationGroupId);
    }
    return allEmployees;
  }, [allEmployees, filterType]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white px-8 py-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Shift Schedules</h1>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
              <span>CentroAbsen</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">Jadwal Shift</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={handlePrevWeek} className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600">
                <ChevronLeft size={20} />
              </button>
              <div className="font-semibold text-slate-800 min-w-[200px] text-center">
                {weekDates[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <button onClick={handleNextWeek} className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600">
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => {
                  if (window.confirm(`Generate rotating shifts for ${startDateStr} to ${endDateStr}? This will preserve manual overrides.`)) {
                    generateMutation.mutate({ startDate: startDateStr, endDate: endDateStr });
                  }
                }}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-70 whitespace-nowrap"
              >
                <Settings2 size={16} />
                {generateMutation.isPending ? 'Generating...' : 'Generate Auto Shifts'}
              </button>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'rotating' | 'all')}
                className="py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm"
              >
                <option value="rotating">Karyawan Shift (Rotasi)</option>
                <option value="all">Semua Karyawan</option>
              </select>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search employee..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md w-full focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all text-sm" 
                />
              </div>
            </div>
          </div>

          <div className="mb-4 text-sm text-slate-600 bg-blue-50 border border-blue-100 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-800">Info:</span>
              <span>
                {filterType === 'rotating' 
                  ? `Menampilkan ${displayEmployees.length} karyawan dengan sistem shift rotasi.` 
                  : `Menampilkan total ${displayEmployees.length} karyawan.`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 border border-slate-200 sticky left-0 bg-slate-50 z-10 w-64">Employee</th>
                  {weekDates.map(date => (
                    <th key={date.toISOString()} className="px-4 py-3 font-semibold text-slate-600 border border-slate-200 text-center min-w-[120px]">
                      <div className="text-xs uppercase text-slate-400 mb-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div>{date.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {loadingEmp || loadingShifts || loadingScheds ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">Loading schedules...</td>
                  </tr>
                ) : displayEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">No employees found.</td>
                  </tr>
                ) : (
                  displayEmployees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border border-slate-200 sticky left-0 bg-white">
                        <div className="font-semibold text-slate-900">{emp.fullName}</div>
                        <div className="text-xs text-slate-500">{emp.departmentName || 'No Dept'}</div>
                        {emp.rotationGroupName && (
                          <div className="mt-1"><span className="inline-block text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-medium">{emp.rotationGroupName}</span></div>
                        )}
                      </td>
                      {weekDates.map(date => {
                        const schedule = getScheduleForEmployeeAndDate(emp.id, date);
                        const isOverride = schedule?.isManualOverride;
                        return (
                          <td key={date.toISOString()} className={`px-2 py-2 border border-slate-200 relative ${isOverride ? 'bg-amber-50/30' : ''}`}>
                            <div className="flex flex-col">
                              <select 
                                value={schedule ? schedule.workShiftId : ''}
                                onChange={(e) => handleShiftChange(emp.id, date, e.target.value)}
                                className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors ${
                                  schedule 
                                    ? isOverride 
                                      ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold' 
                                      : 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                    : 'bg-transparent border-transparent hover:border-slate-300 text-slate-600'
                                }`}
                              >
                                <option value="">Default</option>
                                {workshiftsData?.map((ws: any) => (
                                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                                ))}
                              </select>
                              {isOverride && (
                                <div className="absolute top-1 right-1" title="Manual Override">
                                  <ShieldAlert size={10} className="text-amber-500" />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
