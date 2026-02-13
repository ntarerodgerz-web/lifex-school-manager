import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import {
  exportToPDF, exportToExcel, exportToText,
  generatePDFFile, generateExcelFile, generateTextFile,
  exportAllToPDF, exportAllToExcel, exportAllToText,
  generateAllPDFFile, generateAllExcelFile, generateAllTextFile,
} from '../../utils/exportUtils';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentReport, HiOutlineUserGroup, HiOutlineCurrencyDollar,
  HiOutlineClipboardList, HiOutlineDownload, HiOutlineCalendar,
  HiOutlineShare, HiOutlineDocumentDuplicate, HiOutlineDocumentText,
  HiOutlineChevronDown, HiOutlineTable, HiOutlineOfficeBuilding,
  HiOutlineMail, HiOutlinePhone, HiOutlineLocationMarker,
  HiOutlineBadgeCheck, HiOutlineAcademicCap, HiOutlineUsers,
  HiOutlinePrinter,
} from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/* ─── Reusable Dropdown Button ─── */
const DropdownButton = ({ label, icon: Icon, items, disabled, color = 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-400' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`flex items-center gap-2 text-sm py-2 px-4 rounded-lg font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${color}`}
      >
        <Icon className="w-4 h-4" />
        {label}
        <HiOutlineChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => { setOpen(false); item.onClick(); }}
              disabled={item.disabled}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <item.icon className="w-4 h-4 text-gray-400" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── PDF icon for menu items ─── */
const PdfIcon = (props) => (
  <svg {...props} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
  </svg>
);

/* ─── Small stat pill ─── */
const StatPill = ({ icon: Icon, label, value, color = 'text-primary-600 bg-primary-50' }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
    <Icon className="w-3.5 h-3.5" />
    <span>{label}:</span>
    <span>{value}</span>
  </div>
);

/* ─── Info row for school profile ─── */
const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const { get } = useApi();
  const { user, isPremium, planType } = useAuth();
  const [activeTab, setActiveTab] = useState('school_profile');
  const canExportExcel = ['standard', 'pro'].includes(planType);

  const attFromRef = useRef(null);
  const attToRef = useRef(null);
  const finFromRef = useRef(null);
  const finToRef = useRef(null);

  const [enrollmentData, setEnrollmentData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [teacherData, setTeacherData] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [attFrom, setAttFrom] = useState('');
  const [attTo, setAttTo] = useState('');
  const [finFrom, setFinFrom] = useState('');
  const [finTo, setFinTo] = useState('');

  const schoolName = user?.school_name || 'School Manager';
  const logoUrl = user?.school_badge_url ? `${API_BASE}${user.school_badge_url}` : null;

  /* ─── Data fetching ─── */

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'school_profile': {
          const res = await get('/reports/school-profile', null, { silent: true });
          setProfileData(res.data || null);
          break;
        }
        case 'enrollment': {
          const res = await get('/reports/enrollment', null, { silent: true });
          setEnrollmentData(res.data || []);
          break;
        }
        case 'attendance': {
          const params = {};
          if (attFrom) params.from = attFrom;
          if (attTo) params.to = attTo;
          const res = await get('/reports/attendance', Object.keys(params).length ? params : null, { silent: true });
          setAttendanceData(res.data || []);
          break;
        }
        case 'financial': {
          const params = {};
          if (finFrom) params.from = finFrom;
          if (finTo) params.to = finTo;
          const res = await get('/reports/financial', Object.keys(params).length ? params : null, { silent: true });
          setFinancialData(res.data || []);
          break;
        }
        case 'teachers': {
          const res = await get('/reports/teachers', null, { silent: true });
          setTeacherData(res.data || []);
          break;
        }
      }
    } catch { /* handled */ }
    setLoading(false);
  }, [get, activeTab, attFrom, attTo, finFrom, finTo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  /* ─── Common export options ─── */
  const baseOpts = { schoolName, logoUrl, isPremium };

  /* ─── Section builders (with totals) ─── */

  const buildProfileSection = (data) => {
    const school = data?.school || {};
    const admins = data?.admins || [];
    const stats = data?.stats || {};
    const rows = [];
    rows.push(['School Name', school.name || '—']);
    rows.push(['Motto', school.motto || '—']);
    rows.push(['Email', school.email || '—']);
    rows.push(['Phone', school.phone || '—']);
    rows.push(['Address', school.address || '—']);
    rows.push(['District', school.district || '—']);
    rows.push(['Region', school.region || '—']);
    rows.push(['Country', school.country || '—']);
    rows.push(['Plan', (school.plan_type || 'starter').toUpperCase()]);
    rows.push(['Status', (school.subscription_status || 'trial').toUpperCase()]);
    rows.push(['Registered', school.created_at ? new Date(school.created_at).toLocaleDateString() : '—']);
    rows.push(['', '']);
    rows.push(['── School Administrators ──', '']);
    admins.forEach((a, i) => {
      rows.push([`Admin ${i + 1}`, `${a.first_name} ${a.last_name}`]);
      rows.push(['  Email', a.email || '—']);
      rows.push(['  Phone', a.phone || '—']);
      rows.push(['  Last Login', a.last_login ? new Date(a.last_login).toLocaleString() : 'Never']);
    });
    rows.push(['', '']);
    rows.push(['── Quick Stats ──', '']);
    rows.push(['Total Pupils', stats.total_pupils || 0]);
    rows.push(['Total Teachers', stats.total_teachers || 0]);
    rows.push(['Total Classes', stats.total_classes || 0]);
    rows.push(['Total Parents', stats.total_parents || 0]);
    return { title: 'School Admin Profile', subtitle: `As at ${new Date().toLocaleDateString()}`, columns: ['Field', 'Details'], rows };
  };

  const buildEnrollmentSection = (data) => {
    const rows = data.map((r) => [r.class_name, r.enrolled, r.male, r.female, r.capacity]);
    rows.push(['TOTAL', data.reduce((s, r) => s + Number(r.enrolled), 0), data.reduce((s, r) => s + Number(r.male), 0), data.reduce((s, r) => s + Number(r.female), 0), data.reduce((s, r) => s + Number(r.capacity), 0)]);
    return { title: 'Enrollment Report', subtitle: `As at ${new Date().toLocaleDateString()}`, columns: ['Class', 'Enrolled', 'Male', 'Female', 'Capacity'], rows };
  };

  const buildAttendanceSection = (data) => {
    const rows = data.map((r) => [new Date(r.date).toLocaleDateString(), r.class_name, r.present, r.absent, r.late, r.total]);
    rows.push(['', 'TOTAL', data.reduce((s, r) => s + Number(r.present), 0), data.reduce((s, r) => s + Number(r.absent), 0), data.reduce((s, r) => s + Number(r.late), 0), data.reduce((s, r) => s + Number(r.total), 0)]);
    const sub = attFrom || attTo ? `${attFrom ? `From: ${attFrom}` : ''} ${attTo ? `To: ${attTo}` : ''}`.trim() : 'All dates';
    return { title: 'Attendance Report', subtitle: sub, columns: ['Date', 'Class', 'Present', 'Absent', 'Late', 'Total'], rows };
  };

  const buildFinancialSection = (data) => {
    const rows = data.map((r) => [
      r.month ? new Date(r.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—',
      (r.payment_method || '').replace('_', ' '), Number(r.total_collected).toLocaleString(), r.payment_count,
    ]);
    rows.push(['', 'GRAND TOTAL', `UGX ${data.reduce((s, r) => s + Number(r.total_collected), 0).toLocaleString()}`, data.reduce((s, r) => s + Number(r.payment_count), 0)]);
    const sub = finFrom || finTo ? `${finFrom ? `From: ${finFrom}` : ''} ${finTo ? `To: ${finTo}` : ''}`.trim() : 'All time';
    return { title: 'Financial Report', subtitle: sub, columns: ['Month', 'Payment Method', 'Amount Collected (UGX)', 'Payments Count'], rows };
  };

  const buildTeachersSection = (data) => {
    const rows = data.map((r) => [`${r.first_name} ${r.last_name}`, r.employee_number || '—', r.qualification || '—', r.classes_assigned, r.subjects_assigned]);
    rows.push([`TOTAL: ${data.length} teachers`, '', '', data.reduce((s, r) => s + Number(r.classes_assigned), 0), data.reduce((s, r) => s + Number(r.subjects_assigned), 0)]);
    return { title: 'Teachers Report', subtitle: `As at ${new Date().toLocaleDateString()}`, columns: ['Name', 'Employee #', 'Qualification', 'Classes Assigned', 'Subjects Assigned'], rows };
  };

  const getExportData = () => {
    switch (activeTab) {
      case 'school_profile': return profileData ? buildProfileSection(profileData) : null;
      case 'enrollment': return enrollmentData.length > 0 ? buildEnrollmentSection(enrollmentData) : null;
      case 'attendance': return attendanceData.length > 0 ? buildAttendanceSection(attendanceData) : null;
      case 'financial': return financialData.length > 0 ? buildFinancialSection(financialData) : null;
      case 'teachers': return teacherData.length > 0 ? buildTeachersSection(teacherData) : null;
      default: return null;
    }
  };

  /* ─── Fetch all reports (for Export All / Share All) ─── */

  const fetchAllAndBuildSections = async () => {
    const attParams = {};
    if (attFrom) attParams.from = attFrom;
    if (attTo) attParams.to = attTo;
    const finParams = {};
    if (finFrom) finParams.from = finFrom;
    if (finTo) finParams.to = finTo;

    const [profRes, enrRes, attRes, finRes, tchRes] = await Promise.all([
      get('/reports/school-profile', null, { silent: true }),
      get('/reports/enrollment', null, { silent: true }),
      get('/reports/attendance', Object.keys(attParams).length ? attParams : null, { silent: true }),
      get('/reports/financial', Object.keys(finParams).length ? finParams : null, { silent: true }),
      get('/reports/teachers', null, { silent: true }),
    ]);

    const prof = profRes.data || null;
    const enr = enrRes.data || [];
    const att = attRes.data || [];
    const fin = finRes.data || [];
    const tch = tchRes.data || [];

    setProfileData(prof);
    setEnrollmentData(enr);
    setAttendanceData(att);
    setFinancialData(fin);
    setTeacherData(tch);

    const sections = [];
    if (prof) sections.push(buildProfileSection(prof));
    if (enr.length > 0) sections.push(buildEnrollmentSection(enr));
    if (att.length > 0) sections.push(buildAttendanceSection(att));
    if (fin.length > 0) sections.push(buildFinancialSection(fin));
    if (tch.length > 0) sections.push(buildTeachersSection(tch));
    return sections;
  };

  /* ═══════════════════════════════════════════
   *  Export All handlers (Text / PDF / Excel)
   * ═══════════════════════════════════════════ */

  const handleExportAllText = async () => {
    setExporting(true);
    try {
      const sections = await fetchAllAndBuildSections();
      if (!sections.length) { toast.error('No report data to export'); setExporting(false); return; }
      exportAllToText({ ...baseOpts, sections });
      toast.success('Text report downloaded');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  const handleExportAllPDF = async () => {
    setExporting(true);
    try {
      const sections = await fetchAllAndBuildSections();
      if (!sections.length) { toast.error('No report data to export'); setExporting(false); return; }
      await exportAllToPDF({ ...baseOpts, sections });
      toast.success('PDF report downloaded');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  const handleExportAllExcel = async () => {
    setExporting(true);
    try {
      const sections = await fetchAllAndBuildSections();
      if (!sections.length) { toast.error('No report data to export'); setExporting(false); return; }
      exportAllToExcel({ ...baseOpts, sections });
      toast.success('Excel report downloaded');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  /* ═══════════════════════════════════════════
   *  Share handlers (Text / PDF / Excel)
   * ═══════════════════════════════════════════ */

  const doShare = async (files, title, subtitle) => {
    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ title: `${schoolName} — ${title}`, text: `${title}${subtitle ? ` (${subtitle})` : ''}`, files });
        toast.success('Shared successfully');
      } catch (err) {
        if (err.name !== 'AbortError') toast.error('Sharing failed. Try exporting instead.');
      }
    } else {
      files.forEach((file) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      });
      toast.success('File downloaded (sharing not supported on this browser)');
    }
  };

  const handleShareText = async () => {
    const data = getExportData();
    if (!data || !data.rows.length) return toast.error('No data to share');
    setExporting(true);
    try {
      const file = generateTextFile({ ...data, ...baseOpts });
      await doShare([file], data.title, data.subtitle);
    } catch { toast.error('Share failed'); }
    setExporting(false);
  };

  const handleSharePDF = async () => {
    const data = getExportData();
    if (!data || !data.rows.length) return toast.error('No data to share');
    setExporting(true);
    try {
      const file = await generatePDFFile({ ...data, ...baseOpts });
      await doShare([file], data.title, data.subtitle);
    } catch { toast.error('Share failed'); }
    setExporting(false);
  };

  const handleShareExcel = async () => {
    const data = getExportData();
    if (!data || !data.rows.length) return toast.error('No data to share');
    setExporting(true);
    try {
      const file = generateExcelFile({ ...data, ...baseOpts });
      await doShare([file], data.title, data.subtitle);
    } catch { toast.error('Share failed'); }
    setExporting(false);
  };

  /* ─── Print current tab ─── */
  const handlePrint = () => {
    window.print();
  };

  /* ─── Tabs ─── */

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const allTabs = [
    { key: 'school_profile', label: 'School Profile', icon: HiOutlineOfficeBuilding },
    { key: 'enrollment', label: 'Enrollment', icon: HiOutlineUserGroup },
    { key: 'attendance', label: 'Attendance', icon: HiOutlineClipboardList },
    { key: 'financial', label: 'Financial', icon: HiOutlineCurrencyDollar, adminOnly: true },
    { key: 'teachers', label: 'Teachers', icon: HiOutlineDocumentReport, adminOnly: true },
  ];
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  const currentData = {
    school_profile: profileData,
    enrollment: enrollmentData, attendance: attendanceData,
    financial: financialData, teachers: teacherData,
  }[activeTab];

  const hasData = activeTab === 'school_profile' ? !!profileData?.school : currentData?.length > 0;

  /* ─── Dropdown menu items ─── */

  const exportAllItems = [
    { key: 'text', label: 'As Text (.txt)', icon: HiOutlineDocumentText, onClick: handleExportAllText },
    { key: 'pdf', label: 'As PDF (.pdf)', icon: PdfIcon, onClick: handleExportAllPDF },
    { key: 'excel', label: 'As Excel (.xlsx)', icon: HiOutlineTable, onClick: canExportExcel ? handleExportAllExcel : () => toast.error('Excel export requires the Standard plan or higher. Please upgrade.'), disabled: !canExportExcel, badge: !canExportExcel ? 'PRO' : undefined },
  ];

  const shareItems = [
    { key: 'text', label: 'Share as Text', icon: HiOutlineDocumentText, onClick: handleShareText, disabled: !hasData },
    { key: 'pdf', label: 'Share as PDF', icon: PdfIcon, onClick: handleSharePDF, disabled: !hasData },
    { key: 'excel', label: 'Share as Excel', icon: HiOutlineTable, onClick: canExportExcel ? handleShareExcel : () => toast.error('Excel export requires the Standard plan or higher.'), disabled: !hasData || !canExportExcel, badge: !canExportExcel ? 'PRO' : undefined },
  ];

  /* ─── Helpers ─── */
  const school = profileData?.school || {};
  const admins = profileData?.admins || [];
  const stats = profileData?.stats || {};

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 rounded-2xl p-6 shadow-lg text-white print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-primary-100 text-sm mt-1">Generate, export & share school reports</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              disabled={loading || !hasData}
              className="flex items-center gap-2 text-sm py-2 px-4 rounded-lg font-medium bg-white/20 hover:bg-white/30 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              <HiOutlinePrinter className="w-4 h-4" /> Print
            </button>
            <DropdownButton
              label={exporting ? 'Working...' : 'Export All'}
              icon={HiOutlineDocumentDuplicate}
              items={exportAllItems}
              disabled={loading || exporting}
              color="bg-white/20 hover:bg-white/30 backdrop-blur-sm focus:ring-white/50"
            />
            <DropdownButton
              label="Share"
              icon={HiOutlineShare}
              items={shareItems}
              disabled={loading || exporting || !hasData}
              color="bg-white/20 hover:bg-white/30 backdrop-blur-sm focus:ring-white/50"
            />
            <DropdownButton
              label="Export"
              icon={HiOutlineDownload}
              items={[
                { key: 'text', label: 'As Text (.txt)', icon: HiOutlineDocumentText, onClick: () => {
                  const data = getExportData();
                  if (!data || !data.rows.length) return toast.error('No data to export');
                  exportToText({ ...data, ...baseOpts });
                  toast.success('Text downloaded');
                }, disabled: !hasData },
                { key: 'pdf', label: 'As PDF (.pdf)', icon: PdfIcon, onClick: async () => {
                  const data = getExportData();
                  if (!data || !data.rows.length) return toast.error('No data to export');
                  setExporting(true);
                  try { await exportToPDF({ ...data, ...baseOpts }); toast.success('PDF downloaded'); } catch { toast.error('Export failed'); }
                  setExporting(false);
                }, disabled: !hasData },
                { key: 'excel', label: 'As Excel (.xlsx)', icon: HiOutlineTable, onClick: canExportExcel ? () => {
                  const data = getExportData();
                  if (!data || !data.rows.length) return toast.error('No data to export');
                  exportToExcel({ ...data, ...baseOpts });
                  toast.success('Excel downloaded');
                } : () => toast.error('Excel export requires the Standard plan or higher.'), disabled: !hasData || !canExportExcel, badge: !canExportExcel ? 'PRO' : undefined },
              ]}
              disabled={loading || exporting || !hasData}
              color="bg-white/20 hover:bg-white/30 backdrop-blur-sm focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1.5 flex-wrap bg-gray-100 rounded-xl p-1.5 print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Loading Skeleton ─── */}
      {loading && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 mb-3">
                <div className="h-4 bg-gray-100 rounded flex-1 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
       *  School Profile Report
       * ═══════════════════════════════════════ */}
      {activeTab === 'school_profile' && !loading && (
        <div className="space-y-6" id="report-card">
          {/* School Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white text-center relative">
              <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 0L40 20L20 40L0 20Z\' fill=\'%23fff\' fill-opacity=\'0.1\'/%3E%3C/svg%3E")'}} />
              {school.badge_url && (
                <img
                  src={`${API_BASE}${school.badge_url}`}
                  alt="School Badge"
                  className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-white/30 object-cover bg-white"
                />
              )}
              <h2 className="text-2xl font-bold tracking-tight">{school.name || schoolName}</h2>
              {school.motto && <p className="text-primary-200 text-sm mt-1 italic">&ldquo;{school.motto}&rdquo;</p>}
              <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  school.subscription_status === 'active' ? 'bg-emerald-500 text-white' :
                  school.subscription_status === 'trial' ? 'bg-amber-400 text-amber-900' :
                  'bg-red-500 text-white'
                }`}>
                  {(school.subscription_status || 'trial').toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                  {(school.plan_type || 'starter').toUpperCase()} Plan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 p-6">
              <InfoRow icon={HiOutlineMail} label="Email" value={school.email} />
              <InfoRow icon={HiOutlinePhone} label="Phone" value={school.phone} />
              <InfoRow icon={HiOutlineLocationMarker} label="Address" value={school.address} />
              <InfoRow icon={HiOutlineLocationMarker} label="District" value={school.district} />
              <InfoRow icon={HiOutlineLocationMarker} label="Region" value={school.region} />
              <InfoRow icon={HiOutlineOfficeBuilding} label="Country" value={school.country} />
              <InfoRow icon={HiOutlineCalendar} label="Registered" value={school.created_at ? new Date(school.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
              {school.subscription_expires_at && (
                <InfoRow icon={HiOutlineCalendar} label="Subscription Expires" value={new Date(school.subscription_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pupils', value: stats.total_pupils || 0, icon: HiOutlineUsers, color: 'from-blue-500 to-blue-600' },
              { label: 'Teachers', value: stats.total_teachers || 0, icon: HiOutlineAcademicCap, color: 'from-emerald-500 to-emerald-600' },
              { label: 'Classes', value: stats.total_classes || 0, icon: HiOutlineOfficeBuilding, color: 'from-amber-500 to-amber-600' },
              { label: 'Parents', value: stats.total_parents || 0, icon: HiOutlineUserGroup, color: 'from-purple-500 to-purple-600' },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-5 text-white shadow-md`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{s.label}</p>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                  <s.icon className="w-10 h-10 text-white/30" />
                </div>
              </div>
            ))}
          </div>

          {/* Admin Users */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <HiOutlineBadgeCheck className="w-4 h-4 text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-800">School Administrators</h3>
              <span className="ml-auto text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full font-semibold">{admins.length} admin{admins.length !== 1 ? 's' : ''}</span>
            </div>
            {admins.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    {admin.avatar_url ? (
                      <img src={`${API_BASE}${admin.avatar_url}`} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-primary-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {admin.first_name?.[0]}{admin.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{admin.first_name} {admin.last_name}</p>
                      <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500">
                        {admin.email && (
                          <span className="flex items-center gap-1"><HiOutlineMail className="w-3 h-3" />{admin.email}</span>
                        )}
                        {admin.phone && (
                          <span className="flex items-center gap-1"><HiOutlinePhone className="w-3 h-3" />{admin.phone}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Last login: {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-10 text-gray-400 text-sm">No school administrators found.</p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
       *  Enrollment Report
       * ═══════════════════════════════════════ */}
      {activeTab === 'enrollment' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="report-card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <HiOutlineUserGroup className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-800">Enrollment by Class</h3>
            </div>
            {enrollmentData.length > 0 && (
              <div className="flex items-center gap-2">
                <StatPill icon={HiOutlineUsers} label="Total" value={enrollmentData.reduce((sum, r) => sum + Number(r.enrolled), 0)} color="text-blue-600 bg-blue-50" />
              </div>
            )}
          </div>
          {enrollmentData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrolled</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Male</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Female</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enrollmentData.map((row) => {
                    const util = row.capacity > 0 ? Math.round((row.enrolled / row.capacity) * 100) : 0;
                    return (
                      <tr key={row.class_name} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4 font-medium text-gray-800">{row.class_name}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-sm">{row.enrolled}</span>
                        </td>
                        <td className="p-4 text-center text-blue-600 font-semibold">{row.male}</td>
                        <td className="p-4 text-center text-pink-600 font-semibold">{row.female}</td>
                        <td className="p-4 text-center text-gray-500">{row.capacity}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${util > 90 ? 'bg-red-500' : util > 70 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(util, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${util > 90 ? 'text-red-600' : util > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{util}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 font-semibold">
                    <td className="p-4 text-gray-800">Total</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">{enrollmentData.reduce((s, r) => s + Number(r.enrolled), 0)}</span>
                    </td>
                    <td className="p-4 text-center text-blue-600">{enrollmentData.reduce((s, r) => s + Number(r.male), 0)}</td>
                    <td className="p-4 text-center text-pink-600">{enrollmentData.reduce((s, r) => s + Number(r.female), 0)}</td>
                    <td className="p-4 text-center">{enrollmentData.reduce((s, r) => s + Number(r.capacity), 0)}</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <HiOutlineUserGroup className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No enrollment data available.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
       *  Attendance Report
       * ═══════════════════════════════════════ */}
      {activeTab === 'attendance' && !loading && (
        <div className="space-y-4" id="report-card">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 print:hidden">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="label">From Date</label>
                <div className="relative">
                  <input type="date" value={attFrom} onChange={(e) => setAttFrom(e.target.value)} className="input-field pl-10 cursor-pointer" ref={attFromRef} />
                  <button type="button" onClick={() => attFromRef.current?.showPicker()} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-primary-500 transition-colors" aria-label="Open date picker"><HiOutlineCalendar /></button>
                </div>
              </div>
              <div className="flex-1">
                <label className="label">To Date</label>
                <div className="relative">
                  <input type="date" value={attTo} onChange={(e) => setAttTo(e.target.value)} className="input-field pl-10 cursor-pointer" ref={attToRef} />
                  <button type="button" onClick={() => attToRef.current?.showPicker()} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-primary-500 transition-colors" aria-label="Open date picker"><HiOutlineCalendar /></button>
                </div>
              </div>
              {(attFrom || attTo) && (
                <button onClick={() => { setAttFrom(''); setAttTo(''); }} className="btn-secondary text-sm py-2.5">Clear</button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <HiOutlineClipboardList className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="font-semibold text-gray-800">Attendance Summary</h3>
            </div>
            {attendanceData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Absent</th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Late</th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendanceData.map((row, i) => {
                      const rate = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                      return (
                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="p-4 text-gray-600">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="p-4 font-medium text-gray-800">{row.class_name}</td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">{row.present}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">{row.absent}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">{row.late}</span>
                          </td>
                          <td className="p-4 text-center text-gray-600 font-medium">{row.total}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${rate >= 90 ? 'bg-emerald-100 text-emerald-700' : rate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{rate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <HiOutlineClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No attendance records found for the selected period.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
       *  Financial Report
       * ═══════════════════════════════════════ */}
      {activeTab === 'financial' && !loading && (
        <div className="space-y-4" id="report-card">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 print:hidden">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="label">From Date</label>
                <div className="relative">
                  <input type="date" value={finFrom} onChange={(e) => setFinFrom(e.target.value)} className="input-field pl-10 cursor-pointer" ref={finFromRef} />
                  <button type="button" onClick={() => finFromRef.current?.showPicker()} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-primary-500 transition-colors" aria-label="Open date picker"><HiOutlineCalendar /></button>
                </div>
              </div>
              <div className="flex-1">
                <label className="label">To Date</label>
                <div className="relative">
                  <input type="date" value={finTo} onChange={(e) => setFinTo(e.target.value)} className="input-field pl-10 cursor-pointer" ref={finToRef} />
                  <button type="button" onClick={() => finToRef.current?.showPicker()} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-primary-500 transition-colors" aria-label="Open date picker"><HiOutlineCalendar /></button>
                </div>
              </div>
              {(finFrom || finTo) && (
                <button onClick={() => { setFinFrom(''); setFinTo(''); }} className="btn-secondary text-sm py-2.5">Clear</button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <HiOutlineCurrencyDollar className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-gray-800">Financial Summary</h3>
              </div>
              {financialData.length > 0 && (
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Total: UGX {financialData.reduce((s, r) => s + Number(r.total_collected), 0).toLocaleString()}
                </span>
              )}
            </div>
            {financialData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Method</th>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Collected</th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {financialData.map((row, i) => (
                      <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="p-4 text-gray-600">{row.month ? new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs capitalize font-medium text-gray-700">{(row.payment_method || '').replace('_', ' ')}</span>
                        </td>
                        <td className="p-4 text-right font-semibold text-emerald-600">UGX {Number(row.total_collected).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-xs">{row.payment_count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-emerald-50 to-emerald-100 font-semibold">
                      <td className="p-4 text-gray-800" colSpan={2}>Grand Total</td>
                      <td className="p-4 text-right text-emerald-700 text-base">UGX {financialData.reduce((s, r) => s + Number(r.total_collected), 0).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 font-bold text-xs">{financialData.reduce((s, r) => s + Number(r.payment_count), 0)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <HiOutlineCurrencyDollar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No financial data for the selected period.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
       *  Teachers Report
       * ═══════════════════════════════════════ */}
      {activeTab === 'teachers' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="report-card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <HiOutlineAcademicCap className="w-4 h-4 text-violet-500" />
              </div>
              <h3 className="font-semibold text-gray-800">Teacher Summary</h3>
            </div>
            {teacherData.length > 0 && (
              <StatPill icon={HiOutlineAcademicCap} label="Total" value={`${teacherData.length} teachers`} color="text-violet-600 bg-violet-50" />
            )}
          </div>
          {teacherData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee #</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qualification</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Classes</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subjects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teacherData.map((row) => (
                    <tr key={row.id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="p-4 font-medium text-gray-800">{row.first_name} {row.last_name}</td>
                      <td className="p-4 text-gray-500 font-mono text-xs">{row.employee_number || '—'}</td>
                      <td className="p-4 text-gray-500">{row.qualification || '—'}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-bold">{row.classes_assigned}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-accent-50 text-accent-600 text-xs font-bold">{row.subjects_assigned}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 font-semibold">
                    <td className="p-4 text-gray-800" colSpan={3}>Total: {teacherData.length} teachers</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">{teacherData.reduce((s, r) => s + Number(r.classes_assigned), 0)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-bold">{teacherData.reduce((s, r) => s + Number(r.subjects_assigned), 0)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <HiOutlineAcademicCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No teacher data available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
