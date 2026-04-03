import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  GraduationCap, 
  Plus, 
  ChevronRight,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { dashboardsAPI, logbooksAPI, notificationsAPI, placementsAPI } from '../services/endpoints';

const StudentDashboard = () => {
  const { user } = useAuth();

  const [placements, setPlacements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [placementsRes, logsRes, notificationsRes] = await Promise.all([
          placementsAPI.getPlacements(),
          logbooksAPI.getLogs(),
          notificationsAPI.getNotifications(),
        ]);

        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let notificationsData = notificationsRes?.results || notificationsRes || [];

        let context = null;
        try {
          context = await dashboardsAPI.getMyDataContext();
        } catch (ctxError) {
          console.warn('Failed to load backend data context:', ctxError);
        }

        const shouldBootstrap =
          !bootstrapAttempted &&
          context &&
          String(context.role_name || '').toLowerCase().includes('student') &&
          context.has_student_profile &&
          (context.student_owned?.placements || 0) === 0 &&
          (context.student_owned?.logs || 0) === 0 &&
          (context.student_owned?.notifications || 0) === 0;

        if (shouldBootstrap) {
          try {
            await dashboardsAPI.bootstrapMyStudentData();
            setBootstrapAttempted(true);

            const [placementsRefetch, logsRefetch, notificationsRefetch] = await Promise.all([
              placementsAPI.getPlacements(),
              logbooksAPI.getLogs(),
              notificationsAPI.getNotifications(),
            ]);

            placementsData = placementsRefetch?.results || placementsRefetch || [];
            logsData = logsRefetch?.results || logsRefetch || [];
            notificationsData = notificationsRefetch?.results || notificationsRefetch || [];
          } catch (bootstrapError) {
            console.warn('Starter data bootstrap failed:', bootstrapError);
          }
        }

        setPlacements(placementsData);
        setLogs(logsData);
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats
  const approvedLogs = logs.filter(log => log.status === 'approved').length;
  const pendingLogs = logs.filter(log => log.status === 'submitted' || log.status === 'reviewed').length;
  const totalHours = logs.reduce((sum, log) => sum + (Number(log.hours_worked) || 0), 0).toFixed(1);
  const activePlacements = placements.filter(p => p.status === 'approved' || p.status === 'completed').length;

  const progressMap = logs.reduce((acc, log) => {
    const week = `Week ${log.week_number}`;
    if (!acc[week]) {
      acc[week] = { week, hours: 0, approved: 0 };
    }
    const hours = Number(log.hours_worked) || 0;
    acc[week].hours += hours;
    if (log.status === 'approved') {
      acc[week].approved += hours;
    }
    return acc;
  }, {});

  const progressData = Object.values(progressMap).sort((a, b) => {
    const weekA = Number(a.week.replace('Week ', ''));
    const weekB = Number(b.week.replace('Week ', ''));
    return weekA - weekB;
  });

  const statusData = [
    { status: 'Approved', count: approvedLogs, color: '#10B981' },
    { status: 'Pending', count: pendingLogs, color: '#F59E0B' },
    { status: 'Rejected', count: logs.filter(log => log.status === 'rejected').length, color: '#EF4444' },
  ];

  const selectedPlacement = placements.find(
    (placement) => placement.status === 'approved' || placement.status === 'completed'
  ) || placements[0];

  const nextWeekNumber = selectedPlacement
    ? (logs
        .filter((log) => log.placement === selectedPlacement.placement_id || log.placement?.placement_id === selectedPlacement.placement_id)
        .reduce((maxWeek, log) => Math.max(maxWeek, Number(log.week_number) || 0), 0) + 1)
    : 1;

  const newLogPath = selectedPlacement
    ? `/app/logs/create/${selectedPlacement.placement_id}/${nextWeekNumber}`
    : '/app/logs/create';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium animate-pulse">Synchronizing your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 m-6 bg-red-50 border border-red-200 rounded-3xl text-red-700">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6" />
          <h2 className="text-xl font-bold italic">Something went wrong</h2>
        </div>
        <p className="text-sm opacity-90 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-white min-h-screen">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight leading-none italic">
            HELLO, <span className="text-zinc-400 font-medium not-italic">{user?.first_name?.toUpperCase() || 'STUDENT'}!</span>
          </h1>
          <p className="text-zinc-500 font-medium max-w-sm">
            You've completed <span className="text-zinc-900 font-bold">{approvedLogs} logbooks</span> so far. Keep up the great work!
          </p>
        </div>
        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
          <Calendar className="w-5 h-5 text-zinc-400" />
          <span className="text-sm font-bold text-zinc-600">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Placements', value: activePlacements, icon: Briefcase, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Total Logs', value: logs.length, icon: FileText, color: 'bg-sky-50 text-sky-600' },
          { label: 'Approved Logs', value: approvedLogs, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Hours', value: totalHours, icon: Clock, color: 'bg-rose-50 text-rose-600' },
        ].map((stat, i) => (
          <div key={i} className="group bg-white border border-zinc-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-zinc-200 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div className="space-y-0.5">
              <span className="text-3xl font-black text-zinc-900 leading-none">{stat.value}</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main View (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Card */}
          <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingUp className="w-32 h-32 text-zinc-900" />
            </div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 leading-none">Weekly Progress</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                  Live
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#e4e4e7', strokeWidth: 2 }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '16px', 
                      border: '1px solid #f4f4f5', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      padding: '12px'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#18181b" 
                    name="Hours" 
                    strokeWidth={4}
                    dot={{ fill: '#18181b', strokeWidth: 2, r: 6, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="approved" 
                    stroke="#10b981" 
                    name="Approved" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid for Placements & Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
             {/* Placements Bento */}
             <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 leading-none">Placements</h3>
                  </div>
                  <Link to="/app/placements" className="p-2 rounded-xl bg-zinc-50 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
                     <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
                
                <div className="flex-1 space-y-4">
                  {placements.length > 0 ? (
                    placements.slice(0, 2).map((placement) => (
                      <div key={placement.placement_id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 group hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <p className="font-bold text-zinc-900 truncate pr-2">{placement.position_title}</p>
                           <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                             placement.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                           }`}>
                             {placement.status}
                           </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-tight truncate">{placement.organization?.name}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                      <Briefcase className="w-8 h-8 text-zinc-200 mb-2" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No Placements</p>
                    </div>
                  )}
                </div>
             </div>

             {/* Recent Logs Bento */}
             <div className="bg-zinc-950 rounded-[2.5rem] p-8 shadow-2xl flex flex-col text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white leading-none">Quick Log</h3>
                  </div>
                  <Link to={newLogPath} className="p-2 rounded-xl bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-colors">
                     <Plus className="w-5 h-5" />
                  </Link>
                </div>
                
                <div className="flex-1 space-y-3">
                  {logs.slice(0, 3).map((log) => (
                    <div key={log.log_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                       <span className="text-sm font-bold opacity-80">Week {log.week_number}</span>
                       <div className={`w-2 h-2 rounded-full ${
                         log.status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400'
                       }`} />
                    </div>
                  ))}
                </div>
                
                <Link to={newLogPath} className="mt-6 w-full flex items-center justify-center py-4 bg-white text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-95 transition-all">
                  Create Log
                </Link>
             </div>
          </div>
        </div>

        {/* Right Column - Side Panel (1/3 width) */}
        <div className="space-y-6">
          
          {/* Notifications Card */}
          <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col max-h-[460px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 leading-none">Activity</h3>
              </div>
              {notifications.length > 0 && (
                <span className="bg-zinc-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-4 ring-zinc-50">
                   {notifications.length}
                </span>
              )}
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-none">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => (
                  <div key={notification.notification_id} className="relative pl-6 pb-2 border-l-2 border-zinc-100 group">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-zinc-200 group-hover:bg-rose-500 transition-colors" />
                    <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                   <Bell className="w-10 h-10 text-zinc-100 mx-auto mb-2" />
                   <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">No recent activity</p>
                </div>
              )}
            </div>
            
            <Link to="/app/notifications" className="mt-6 block text-center text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">
              View Feed
            </Link>
          </div>

          {/* Results Summary Bento */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 leading-none">Evaluations</h3>
              </div>
              <div className="space-y-4 mb-6">
                 {statusData.map((s, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                         <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{s.status}</span>
                      </div>
                      <span className="text-sm font-black text-zinc-900">{s.count}</span>
                   </div>
                 ))}
              </div>
              <Link to="/app/evaluations" className="block text-center py-4 rounded-2xl border-2 border-zinc-200 text-zinc-900 text-xs font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all">
                View Reports
              </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;