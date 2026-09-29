import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService, assessmentService } from '../services/apiService';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Link as LinkIcon, 
  X, 
  Award, 
  BarChart3, 
  UserCheck, 
  AlertCircle, 
  Camera, 
  Eye, 
  ShieldCheck, 
  Download 
} from 'lucide-react';
import { format } from 'date-fns';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

export const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [assignedLinks, setAssignedLinks] = useState<{link: string, accessCode: string}[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertData, setConvertData] = useState({ managerId: '', defaultShiftId: '', rotationGroupId: '' });
  const [convertedInfo, setConvertedInfo] = useState<{employeeId: string, tempPassword: string} | null>(null);

  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const handlePreviewDocument = (doc: any) => {
    setPreviewDoc(doc);
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const blob = await candidateService.downloadDocument(candidate.id, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Mengunduh ${doc.fileName}`);
    } catch (err: any) {
      toast.error('Gagal mengunduh dokumen.');
    }
  };

  const { data: candidate, isLoading: isCandidateLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidateService.getById(id!)
  });

  const { data: tests } = useQuery({
    queryKey: ['tests'],
    queryFn: () => assessmentService.getTests()
  });

  const { data: testResults, isLoading: isResultsLoading } = useQuery({
    queryKey: ['candidate-test-results', id],
    queryFn: () => candidateService.getTestResults(id!),
    enabled: !!id
  });
  
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => import('../services/apiService').then(m => m.employeeService.getAll({ pageSize: 1000 }).then(r => r.data)) });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => candidateService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      toast.success('Candidate status updated');
    }
  });

  const assignTestMutation = useMutation({
    mutationFn: () => candidateService.assignTest(id!, { testIds: selectedTests }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setAssignedLinks(res.testLinks);
      toast.success('Tests assigned successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign tests');
    }
  });

  const convertMutation = useMutation({
    mutationFn: () => candidateService.convertToEmployee(id!, {
      managerId: convertData.managerId || null,
      defaultShiftId: convertData.defaultShiftId || null,
      rotationGroupId: convertData.rotationGroupId || null
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setConvertedInfo({ employeeId: res.employeeId, tempPassword: res.tempPassword });
      toast.success('Candidate converted to employee successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to convert candidate');
    }
  });

  if (isCandidateLoading) return <div className="p-8 text-center text-slate-500">Loading candidate details...</div>;
  if (!candidate) return <div className="p-8 text-center text-red-500">Candidate not found</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Applied': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'TestAssigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TestCompleted': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Interview': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Passed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Hired': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <header className="bg-white px-8 py-6 border-b border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/candidates')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{candidate.fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 text-[11px] uppercase tracking-wider font-bold rounded-full border ${getStatusColor(candidate.status)}`}>
                  {candidate.status}
                </span>
                <span className="text-sm text-slate-500 font-medium ml-2">Application Details</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={candidate.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={candidate.status === 'Hired'}
            >
              <option value="Applied">Set: Applied</option>
              <option value="TestAssigned">Set: Test Assigned</option>
              <option value="TestCompleted">Set: Test Completed</option>
              <option value="Interview">Set: Interview</option>
              <option value="Passed">Set: Passed</option>
              <option value="Rejected">Set: Rejected</option>
            </select>
            
            {candidate.status !== 'Hired' && candidate.status !== 'Passed' && (
              <button
                onClick={() => {
                  setSelectedTests([]);
                  setAssignedLinks([]);
                  setShowAssignModal(true);
                }}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium border border-blue-200 transition-colors flex items-center gap-2"
              >
                <FileText size={16} /> Assign Test
              </button>
            )}

            {candidate.status === 'Passed' && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-green-200"
              >
                <UserCheck size={18} /> Convert to Employee
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {convertedInfo && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 relative">
              <button onClick={() => setConvertedInfo(null)} className="absolute top-4 right-4 text-green-600 hover:text-green-800"><X size={20}/></button>
              <h3 className="text-green-800 font-bold text-lg mb-2 flex items-center gap-2"><CheckCircle size={20}/> Successfully Converted to Employee!</h3>
              <p className="text-green-700 mb-4">An employee record and user account have been generated. Please provide these temporary login credentials to the new hire securely.</p>
              <div className="bg-white rounded-lg p-4 font-mono text-sm border border-green-100 inline-block shadow-sm">
                <div><span className="text-slate-500 mr-2">Email:</span> <strong>{candidate.email}</strong></div>
                <div className="mt-2"><span className="text-slate-500 mr-2">Temp Password:</span> <strong>{convertedInfo.tempPassword}</strong></div>
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-lg font-semibold text-slate-800">Candidate Information</h3>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  candidate.source === 'PublicForm' 
                    ? 'bg-sky-50 text-sky-700 border-sky-200' 
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {candidate.source === 'PublicForm' ? '🌐 Public Career Portal' : '👤 Manual Input HR'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div className="flex items-start gap-3">
                  <Mail className="text-slate-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Email Address</p>
                    <p className="text-slate-800 font-medium">{candidate.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="text-slate-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Phone Number</p>
                    <p className="text-slate-800 font-medium">{candidate.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="text-slate-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Applied For</p>
                    <p className="text-slate-800 font-medium">{candidate.appliedPositionName}</p>
                    <p className="text-xs text-slate-500">{candidate.appliedDepartmentName}</p>
                    {candidate.jobOpeningTitle && (
                      <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                        Lowongan: {candidate.jobOpeningTitle}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="text-slate-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Applied On</p>
                    <p className="text-slate-800 font-medium">{format(new Date(candidate.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              {/* Education & Experience Details if present */}
              {(candidate.education || candidate.workExperience) && (
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {candidate.education && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Pendidikan Terakhir</p>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap">{candidate.education}</p>
                    </div>
                  )}
                  {candidate.workExperience && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Pengalaman Kerja</p>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap">{candidate.workExperience}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/3 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HR Notes</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{candidate.notes || 'No notes added.'}</p>
            </div>
          </div>

          {/* Uploaded Documents Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-blue-500"/>
                Dokumen Berkas Lamaran ({candidate.documents?.length || 0})
              </h3>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline-flex items-center gap-1.5">
                <Eye size={13} className="text-blue-500" /> Klik untuk membaca / pratinjau PDF langsung
              </span>
            </div>
            <div className="p-6">
              {(!candidate.documents || candidate.documents.length === 0) ? (
                <p className="text-xs text-slate-500 italic">Tidak ada berkas dokumen yang diunggah.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {candidate.documents.map((doc: any) => {
                    const isPdf = doc.fileName.toLowerCase().endsWith('.pdf');
                    return (
                      <div 
                        key={doc.id} 
                        className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                      >
                        <div 
                          onClick={() => handlePreviewDocument(doc)}
                          className="flex items-start gap-3 mb-3 cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isPdf ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                {doc.documentType}
                              </span>
                              {isPdf && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-50 text-red-600 border border-red-100">
                                  PDF
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {(doc.fileSize / 1024).toFixed(1)} KB · {format(new Date(doc.uploadedAt), 'd MMM yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-200/80">
                          <button
                            onClick={() => handlePreviewDocument(doc)}
                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={14} /> Baca PDF
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            title="Unduh Berkas ke Perangkat"
                            className="p-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Award size={20} className="text-blue-500"/>
                Assessment Results
              </h3>
            </div>
            <div className="p-6">
              {isResultsLoading ? (
                <p className="text-slate-500">Loading results...</p>
              ) : testResults && testResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {testResults.map((tr: any) => {
                    const isLogic = tr.testType === 0;
                    return (
                      <div key={tr.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              {isLogic ? <BarChart3 size={18} className="text-blue-500"/> : <UserCheck size={18} className="text-indigo-500"/>}
                              {isLogic ? 'Logic / IQ Test' : 'Personality Test'}
                            </h4>
                            <div className="mt-1 flex items-center gap-2">
                              {tr.tabSwitchCount === 0 || tr.tabSwitchCount === undefined ? (
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <ShieldCheck size={12} /> Integritas 100% (0x Switch)
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                  ⚠️ {tr.tabSwitchCount}x Pindah Tab
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {Math.floor(tr.durationSeconds / 60)}m {tr.durationSeconds % 60}s
                          </span>
                        </div>
                        
                        {isLogic ? (
                          <div className="mt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total Score</p>
                                <div className="text-3xl font-black text-blue-600">{tr.scorePercentage.toFixed(0)}%</div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Correct Answers</p>
                                <div className="text-xl font-bold text-slate-700">{tr.correctAnswers} / {tr.totalQuestions}</div>
                              </div>
                            </div>

                            {/* Category Breakdown for HR evaluation */}
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Breakdown Kategori Soal:</p>
                              <div className="space-y-1.5 text-xs">
                                <div>
                                  <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                                    <span>Verbal (Sinonim/Analogi)</span>
                                    <span className="font-bold text-slate-800">{tr.verbalScorePercentage?.toFixed(0) || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${tr.verbalScorePercentage || 0}%` }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                                    <span>Numerik (Deret/Aritmatika)</span>
                                    <span className="font-bold text-slate-800">{tr.numericScorePercentage?.toFixed(0) || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${tr.numericScorePercentage || 0}%` }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                                    <span>Logika / Penalaran</span>
                                    <span className="font-bold text-slate-800">{tr.logicScorePercentage?.toFixed(0) || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${tr.logicScorePercentage || 0}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <p className="text-sm text-slate-500 mb-1">Dominant Trait</p>
                            <div className="text-3xl font-black text-indigo-700 mb-3">{tr.dominantTrait}</div>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs font-medium">
                              <div className="bg-red-50 text-red-700 py-1 rounded">D: {tr.scoreD}</div>
                              <div className="bg-yellow-50 text-yellow-700 py-1 rounded">I: {tr.scoreI}</div>
                              <div className="bg-green-50 text-green-700 py-1 rounded">S: {tr.scoreS}</div>
                              <div className="bg-blue-50 text-blue-700 py-1 rounded">C: {tr.scoreC}</div>
                            </div>
                          </div>
                        )}
                        {/* Proctoring Snapshot Preview for HR */}
                        {tr.proctoringSnapshots && tr.proctoringSnapshots.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <Camera size={14} className="text-blue-500" />
                                Snapshot Wajah Kandidat ({tr.proctoringSnapshots.length})
                              </span>
                              <span className="text-[10px] text-slate-400">Klik foto untuk perbesar</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {tr.proctoringSnapshots.slice(0, 4).map((snap: string, idx: number) => (
                                <div 
                                  key={idx}
                                  onClick={() => setSelectedSnapshot(snap)}
                                  className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                >
                                  <img 
                                    src={`http://localhost:5000${snap}`} 
                                    alt={`Snapshot ${idx + 1}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <Eye size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => navigate(`/test-results/${tr.testSessionId}`)}
                          className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200"
                        >
                          View Full Details & Snapshots
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No completed assessments found.</p>
                  <p className="text-sm text-slate-400 mt-1">Assign a test and ask the candidate to complete it.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Test Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Assign Tests & Generate Links</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {assignedLinks.length > 0 ? (
              <div className="p-6">
                <div className="bg-emerald-50 text-emerald-900 p-4 rounded-xl mb-6 flex items-start gap-3 border border-emerald-200">
                  <CheckCircle className="shrink-0 mt-0.5 text-emerald-600" size={20} />
                  <div>
                    <p className="font-bold">Tests assigned successfully!</p>
                    <p className="text-xs mt-1 text-emerald-800 leading-relaxed">
                      <strong>Rekomendasi Keamanan:</strong> Kirimkan link DAN kode akses ini secara terpisah ke kandidat (misal link via email, kode via WhatsApp) demi keamanan.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {assignedLinks.map((item, idx) => {
                    const fullUrl = `${window.location.origin}${item.link}`;
                    return (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tautan Test (Kirim via Email)</p>
                          <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                            <div className="truncate flex-1 font-mono text-xs text-slate-700">{fullUrl}</div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(fullUrl);
                                toast.success('Link pengerjaan disalin ke clipboard');
                              }}
                              className="shrink-0 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1"
                              title="Copy Link"
                            >
                              <LinkIcon size={12} /> Salin Link
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kode Akses (Kirim via WhatsApp)</p>
                          <div className="flex items-center justify-between gap-3 bg-white p-2.5 border border-slate-200 rounded-lg">
                            <div className="font-mono text-base tracking-widest text-slate-900 font-black">{item.accessCode}</div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(item.accessCode);
                                toast.success('Kode akses disalin ke clipboard');
                              }}
                              className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors"
                            >
                              Salin Kode
                            </button>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            const template = `Halo ${candidate.fullName},\n\nBerikut informasi asesmen psikotes Anda:\n- Link: ${fullUrl}\n- Kode Akses (6-Digit): ${item.accessCode}\n\nPastikan kamera aktif dan ruangan cukup terang saat mengerjakan.`;
                            navigator.clipboard.writeText(template);
                            toast.success('Template pesan WhatsApp berhasil disalin');
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-blue-600 text-left underline underline-offset-2 pt-1"
                        >
                          Salin Format Pesan Lengkap (WhatsApp / Email)
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 text-right">
                  <button onClick={() => setShowAssignModal(false)} className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors">
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">Select the assessments you want {candidate.fullName} to complete.</p>
                
                <div className="space-y-3 mb-6 max-h-60 overflow-auto">
                  {tests?.map((t: any) => (
                    <label key={t.id} className="flex items-start p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        checked={selectedTests.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTests(prev => [...prev, t.id]);
                          else setSelectedTests(prev => prev.filter(id => id !== t.id));
                        }}
                      />
                      <div className="ml-3">
                        <p className="font-semibold text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.type === 0 ? 'Logic Test' : 'Personality Test'} • {t.durationMinutes} min</p>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button 
                    onClick={() => assignTestMutation.mutate()}
                    disabled={selectedTests.length === 0 || assignTestMutation.isPending}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                  >
                    {assignTestMutation.isPending ? 'Generating Links...' : 'Generate Test Links'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Convert to Employee Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Convert to Employee</h2>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 border border-blue-100">
                <AlertCircle className="shrink-0 mt-0.5 text-blue-600" size={18} />
                <p className="text-sm">This will automatically create a new Employee record and a User account with a temporary password. You can edit the employee's additional details later.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign Manager (Optional)</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={convertData.managerId}
                    onChange={e => setConvertData({ ...convertData, managerId: e.target.value })}
                  >
                    <option value="">No Manager</option>
                    {employees?.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.positionName})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowConvertModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    convertMutation.mutate();
                    setShowConvertModal(false);
                  }}
                  disabled={convertMutation.isPending}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm shadow-green-200"
                >
                  {convertMutation.isPending ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proctoring Snapshot Lightbox Modal */}
      {selectedSnapshot && (
        <div 
          onClick={() => setSelectedSnapshot(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full border border-slate-700 shadow-2xl relative"
          >
            <div className="p-4 bg-slate-800 flex items-center justify-between border-b border-slate-700 text-white">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Camera size={16} className="text-blue-400" />
                <span>Rekaman Foto Snapshot Wajah Kandidat</span>
              </div>
              <button 
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img 
                src={`http://localhost:5000${selectedSnapshot}`} 
                alt="Full Proctoring Snapshot" 
                className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-800 shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-800 text-xs text-slate-400 text-center border-t border-slate-700">
              Foto diambil otomatis oleh sistem proctoring selama sesi asesmen berlangsung.
            </div>
          </div>
        </div>
      )}

      {/* In-App PDF & Document Reader / Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        fetchDocumentBlob={async () => previewDoc ? candidateService.viewDocument(candidate.id, previewDoc.id) : new Blob()}
      />

    </div>
  );
};
