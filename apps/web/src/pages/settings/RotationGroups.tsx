import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftRotationService, workShiftService } from '../../services/apiService';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Calendar } from 'lucide-react';

export const RotationGroups = () => {
  const queryClient = useQueryClient();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['rotation-groups'],
    queryFn: shiftRotationService.getGroups
  });

  const { data: workshifts } = useQuery({
    queryKey: ['workshifts'],
    queryFn: workShiftService.getAll
  });

  const { data: patterns, isLoading: loadingPatterns } = useQuery({
    queryKey: ['rotation-patterns', selectedGroup?.id],
    queryFn: () => shiftRotationService.getPatterns(selectedGroup.id),
    enabled: !!selectedGroup
  });

  const createGroupMutation = useMutation({
    mutationFn: shiftRotationService.createGroup,
    onSuccess: () => {
      toast.success('Group created successfully!');
      queryClient.invalidateQueries({ queryKey: ['rotation-groups'] });
      setShowGroupModal(false);
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: shiftRotationService.deleteGroup,
    onSuccess: () => {
      toast.success('Group deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['rotation-groups'] });
      if (selectedGroup) setSelectedGroup(null);
    }
  });

  const createPatternMutation = useMutation({
    mutationFn: (data: any) => shiftRotationService.createPattern(selectedGroup.id, data),
    onSuccess: () => {
      toast.success('Pattern added successfully!');
      queryClient.invalidateQueries({ queryKey: ['rotation-patterns', selectedGroup.id] });
      setShowPatternModal(false);
    }
  });

  const deletePatternMutation = useMutation({
    mutationFn: (patternId: string) => shiftRotationService.deletePattern(selectedGroup.id, patternId),
    onSuccess: () => {
      toast.success('Pattern deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['rotation-patterns', selectedGroup.id] });
    }
  });

  const handleCreateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createGroupMutation.mutate({
      name: formData.get('name'),
      rotationStartDate: formData.get('rotationStartDate')
    });
  };

  const handleCreatePattern = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPatternMutation.mutate({
      cycleWeekNumber: Number(formData.get('cycleWeekNumber')),
      workShiftId: formData.get('workShiftId')
    });
  };

  if (selectedGroup) {
    return (
      <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200 p-8">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Rotation Patterns: <span className="text-blue-600">{selectedGroup.name}</span></h2>
            <p className="text-sm text-slate-500 mt-1">Start Date: {new Date(selectedGroup.rotationStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPatternModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2">
              <Plus size={16} /> Add Pattern
            </button>
            <button onClick={() => setSelectedGroup(null)} className="text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium shadow-sm">
              Back
            </button>
          </div>
        </div>

        {loadingPatterns ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        ) : patterns?.length === 0 ? (
           <div className="text-center py-12">
             <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
             <p className="text-slate-500 font-medium">No patterns defined for this group.</p>
           </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 uppercase">Week Number</th>
                <th className="px-6 py-4 font-semibold text-slate-600 uppercase">Work Shift</th>
                <th className="px-6 py-4 font-semibold text-slate-600 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patterns?.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">Week {p.cycleWeekNumber}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      {p.workShiftName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deletePatternMutation.mutate(p.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showPatternModal && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[400px]">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold">Add Pattern</h3>
                <button onClick={() => setShowPatternModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              <form onSubmit={handleCreatePattern} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cycle Week Number</label>
                  <input type="number" name="cycleWeekNumber" min="1" required className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Shift</label>
                  <select name="workShiftId" required className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-600">
                    <option value="">-- Select Shift --</option>
                    {workshifts?.map((ws: any) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowPatternModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                  <button type="submit" disabled={createPatternMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-bold text-slate-800">Shift Rotation Groups</h2>
        <button onClick={() => setShowGroupModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Create Group
        </button>
      </div>

      <div className="p-0">
        {loadingGroups ? (
          <div className="p-8 space-y-4">
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        ) : groups?.length === 0 ? (
           <div className="text-center py-16">
             <Users className="mx-auto text-slate-300 mb-3" size={48} />
             <p className="text-slate-500 font-medium">No rotation groups configured.</p>
           </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Start Date</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups?.map((g: any) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{g.name}</td>
                  <td className="px-6 py-4 text-slate-700">{new Date(g.rotationStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => setSelectedGroup(g)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md font-medium">
                      Patterns
                    </button>
                    <button onClick={() => {
                        if (window.confirm("Are you sure you want to delete this group?")) deleteGroupMutation.mutate(g.id);
                      }} 
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[400px]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold">Create Rotation Group</h3>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input type="text" name="name" required className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-600" placeholder="e.g. Group A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rotation Start Date</label>
                <input type="date" name="rotationStartDate" required className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-600" />
                <p className="text-xs text-slate-500 mt-1">This date acts as the Week 1 reference point.</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" disabled={createGroupMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
