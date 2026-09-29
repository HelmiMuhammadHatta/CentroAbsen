import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { employeeService, leaveService, attendanceService, dailyReportService } from '../services/apiService';
import { useMemo } from 'react';
import { Users, CalendarClock, Activity, FileText, ArrowUpRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 11 && hour < 15) return 'siang';
    if (hour >= 15 && hour < 18) return 'sore';
    if (hour >= 18) return 'malam';
    return 'pagi';
  };
  
  const todayDateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeeService.getAll({ page: 1, pageSize: 1000 }),
    enabled: user?.role === 'Admin' || user?.role === 'Manager'
  });

  const displayName = user?.fullName ?? user?.email?.split('@')[0] ?? 'User';

  const { data: leavesData } = useQuery({
    queryKey: ['leaves', 'all'],
    queryFn: () => leaveService.getRequests()
  });

  const { data: attendancesData } = useQuery({
    queryKey: ['attendances', 'recent'],
    queryFn: () => attendanceService.getAttendances({ page: 1, pageSize: 1000 })
  });

  const { data: dailyReportsData } = useQuery({
    queryKey: ['daily-reports', 'recent'],
    queryFn: () => dailyReportService.getAll({ page: 1, pageSize: 1000 })
  });

  const metrics = useMemo(() => {
    const totalEmployees = employeesData?.data?.totalCount || 0;
    
    // Pending leaves
    const pendingLeaves = leavesData?.data?.data?.filter((l: any) => l.status === 'Pending').length || 0;

    // Today's attendances
    const todayStr = new Date().toLocaleDateString();
    const todayAttendances = attendancesData?.data?.data?.filter((a: any) => new Date(a.clockIn).toLocaleDateString() === todayStr) || [];
    
    const uniqueAttendees = new Set(todayAttendances.map((a: any) => a.employeeId)).size;
    
    const attendanceRate = totalEmployees > 0 ? Math.round((uniqueAttendees / totalEmployees) * 100) : 0;

    // Today's Daily Reports
    const todayReports = dailyReportsData?.data?.data?.filter((dr: any) => new Date(dr.reportDate).toLocaleDateString() === todayStr).length || 0;

    // By Department
    const employeesList = employeesData?.data?.data || [];
    const deptStats: Record<string, { total: number; attended: number }> = {};
    
    employeesList.forEach((emp: any) => {
      const deptName = emp.departmentName || 'IT Department';
      if (!deptStats[deptName]) deptStats[deptName] = { total: 0, attended: 0 };
      deptStats[deptName].total += 1;
      if (todayAttendances.some((a: any) => a.employeeId === emp.id)) {
        deptStats[deptName].attended += 1;
      }
    });

    const chartData = Object.entries(deptStats).map(([name, stats]) => ({
      name,
      rate: stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0
    }));

    // Leave Trend (Last 6 Months)
    const leavesList = leavesData?.data?.data || [];
    const leaveTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleDateString('id-ID', { month: 'short' });
      const yearStr = d.getFullYear();
      
      const count = leavesList.filter((l: any) => {
        const ld = new Date(l.createdAt);
        return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
      }).length;
      
      leaveTrend.push({ name: `${monthStr} ${yearStr}`, total: count });
    }

    // Attendance Status Distribution (This Month)
    const attendancesList = attendancesData?.data?.data || [];
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthAttendances = attendancesList.filter((a: any) => {
      const d = new Date(a.clockIn);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    let onTimeCount = 0;
    let lateCount = 0;
    
    thisMonthAttendances.forEach((a: any) => {
      if (a.status === 'OnTime') onTimeCount++;
      else if (a.status === 'Late') lateCount++;
    });

    const attendanceDistribution = [
      { name: 'Tepat Waktu', value: onTimeCount, color: 'var(--ds-accent-600)' },
      { name: 'Terlambat', value: lateCount, color: 'var(--ds-pending-600)' }
    ].filter(d => d.value > 0);

    return { totalEmployees, pendingLeaves, attendanceRate, todayReports, chartData, leaveTrend, attendanceDistribution };
  }, [employeesData, leavesData, attendancesData, dailyReportsData]);

  const Sparkline = ({ color }: { color: string }) => (
    <svg className={styles.kpiSparkline} viewBox="0 0 60 24" fill="none">
      <path d="M0 24 Q 10 10, 20 18 T 40 8 T 60 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <div style={{backgroundColor: 'var(--ds-bg-page)', minHeight: '100%'}}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Selamat {getGreeting()}, {displayName} 👋</h1>
        <div className={styles.headerDate}>{todayDateStr}</div>
      </div>

      <div className={styles.container}>
        
        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          {/* Card 1 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIconWrapper} ${styles.primary}`}>
                <Users size={18} />
              </div>
              <span>Total Karyawan</span>
            </div>
            <div className={styles.kpiValueContainer}>
              <span className={styles.kpiValue}>{metrics.totalEmployees}</span>
              <span className={styles.kpiUnit}>aktif</span>
            </div>
            <div className={styles.kpiFooter}>
              <div className={`${styles.kpiDelta} ${styles.positive}`}>
                <ArrowUpRight size={14} /> <span>+2 hari ini</span>
              </div>
              <Sparkline color="var(--ds-primary-500)" />
            </div>
          </div>

          {/* Card 2 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIconWrapper} ${styles.neutral}`}>
                <FileText size={18} />
              </div>
              <span>Laporan Harian</span>
            </div>
            <div className={styles.kpiValueContainer}>
              <span className={styles.kpiValue}>{metrics.todayReports}</span>
              <span className={styles.kpiUnit}>/ {metrics.totalEmployees} masuk</span>
            </div>
            <div className={styles.kpiFooter}>
              <div className={`${styles.kpiDelta} ${styles.neutral}`}>
                <ArrowRight size={14} /> <span>Sama seperti kemarin</span>
              </div>
              <Sparkline color="var(--ds-neutral-400)" />
            </div>
          </div>

          {/* Card 3 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIconWrapper} ${styles.accent}`}>
                <Activity size={18} />
              </div>
              <span>Tingkat Kehadiran</span>
            </div>
            <div className={styles.kpiValueContainer}>
              <span className={styles.kpiValue}>
                {metrics.chartData.every(d => d.rate === 0) && metrics.attendanceRate === 0 ? '--' : metrics.attendanceRate}%
              </span>
              <span className={styles.kpiUnit}>hadir</span>
            </div>
            <div className={styles.kpiFooter}>
              <div className={`${styles.kpiDelta} ${styles.positive}`}>
                <ArrowUpRight size={14} /> <span>+5% dari kemarin</span>
              </div>
              <Sparkline color="var(--ds-accent-500)" />
            </div>
          </div>

          {/* Card 4 */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIconWrapper} ${styles.pending}`}>
                <CalendarClock size={18} />
              </div>
              <span>Menunggu Cuti</span>
            </div>
            <div className={styles.kpiValueContainer}>
              <span className={styles.kpiValue}>{metrics.pendingLeaves}</span>
              <span className={styles.kpiUnit}>pengajuan</span>
            </div>
            <div className={styles.kpiFooter}>
              <div className={`${styles.kpiDelta} ${styles.neutral}`}>
                <ArrowRight size={14} /> <span>Perlu tindakan</span>
              </div>
              <Sparkline color="var(--ds-pending-500)" />
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className={styles.chartContainer}>
          <h2 className={styles.chartTitle}>Tingkat Kehadiran per Departemen</h2>
          <div className={styles.chartArea}>
            {metrics.chartData.some(d => d.rate > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* HORIZONTAL BAR CHART */}
                <BarChart data={metrics.chartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--ds-border-color)" />
                  <XAxis type="number" domain={[0, 100]} tick={{fill: 'var(--ds-text-secondary)', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <YAxis type="category" dataKey="name" tick={{fill: 'var(--ds-text-secondary)', fontSize: 12}} tickLine={false} axisLine={{stroke: 'var(--ds-border-color)'}} width={120} />
                  <Tooltip 
                    cursor={{fill: 'var(--ds-bg-surface-hover)'}} 
                    contentStyle={{borderRadius: 'var(--ds-radius-md)', border: '1px solid var(--ds-border-color)', boxShadow: 'var(--ds-shadow-md)', padding: '12px'}}
                    formatter={(value: number) => [`${value}%`, 'Kehadiran']}
                  />
                  <Bar dataKey="rate" fill="var(--ds-primary-500)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <circle cx="12" cy="11" r="3" />
                </svg>
                <h3 className={styles.emptyStateTitle}>Belum ada data kehadiran hari ini</h3>
                <p className={styles.emptyStateDesc}>Karyawan belum melakukan clock-in hari ini. Data grafik akan muncul setelah ada aktivitas.</p>
                <button className={styles.ctaButton} onClick={() => navigate('/attendance')}>
                  Mulai Clock-in Manual
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Charts */}
        <div className={styles.bottomGrid}>
          {/* Leave Trend Chart */}
          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Tren Cuti (6 Bulan Terakhir)</h2>
            <div className={styles.chartArea}>
              {metrics.leaveTrend.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.leaveTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ds-border-color)" />
                    <XAxis dataKey="name" tick={{fill: 'var(--ds-text-secondary)', fontSize: 12}} tickLine={false} axisLine={{stroke: 'var(--ds-border-color)'}} />
                    <YAxis tick={{fill: 'var(--ds-text-secondary)', fontSize: 12}} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      cursor={{stroke: 'var(--ds-border-color)', strokeWidth: 2}} 
                      contentStyle={{borderRadius: 'var(--ds-radius-md)', border: '1px solid var(--ds-border-color)', boxShadow: 'var(--ds-shadow-md)'}}
                    />
                    <Line type="monotone" dataKey="total" name="Pengajuan" stroke="var(--ds-primary-600)" strokeWidth={3} dot={{r: 4, fill: 'var(--ds-primary-600)', strokeWidth: 0}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>Belum ada pengajuan cuti</h3>
                  <p className={styles.emptyStateDesc}>Data tren akan muncul setelah ada pengajuan cuti dari karyawan.</p>
                  <button className={styles.ctaButton} onClick={() => navigate('/leaves')}>
                    Kelola Cuti
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Distribution Chart */}
          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Status Kehadiran (Bulan Ini)</h2>
            <div className={styles.chartArea}>
              {metrics.attendanceDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.attendanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.attendanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: 'var(--ds-radius-md)', border: '1px solid var(--ds-border-color)', boxShadow: 'var(--ds-shadow-md)'}}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>Belum ada data staf bulan ini</h3>
                  <p className={styles.emptyStateDesc}>Tambahkan karyawan terlebih dahulu agar sistem dapat mulai memantau absensi.</p>
                  <button className={styles.ctaButton} onClick={() => navigate('/employees')}>
                    Tambah Karyawan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
