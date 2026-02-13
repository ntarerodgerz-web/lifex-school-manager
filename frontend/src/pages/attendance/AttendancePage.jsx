import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { HiOutlineCheck, HiOutlineX, HiOutlineCalendar } from 'react-icons/hi';

const AttendancePage = () => {
  const { get, post, loading } = useApi();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const dateRef = useRef(null);
  const [pupils, setPupils] = useState([]);
  const [records, setRecords] = useState({});
  const [existingRecords, setExistingRecords] = useState([]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await get('/classes', null, { silent: true });
      setClasses(res.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const loadClassPupils = useCallback(async () => {
    if (!selectedClass) { setPupils([]); return; }
    try {
      const [pupilRes, attRes] = await Promise.all([
        get('/pupils', { class_id: selectedClass, limit: 100 }, { silent: true }),
        get(`/attendance/class/${selectedClass}`, { date }, { silent: true }),
      ]);
      const pupilList = pupilRes.data.pupils || [];
      const attList = attRes.data || [];
      setPupils(pupilList);
      setExistingRecords(attList);

      // Pre-fill records from existing
      const rec = {};
      pupilList.forEach((p) => {
        const existing = attList.find((a) => a.pupil_id === p.id);
        rec[p.id] = existing ? existing.status : 'present';
      });
      setRecords(rec);
    } catch { /* handled */ }
  }, [get, selectedClass, date]);

  useEffect(() => { loadClassPupils(); }, [loadClassPupils]);

  const toggleStatus = (pupilId) => {
    setRecords((prev) => {
      const current = prev[pupilId] || 'present';
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [pupilId]: next };
    });
  };

  const handleSave = async () => {
    if (!selectedClass) return toast.error('Please select a class');
    if (pupils.length === 0) return toast.error('No pupils in this class');

    const payload = {
      class_id: selectedClass,
      date,
      records: pupils.map((p) => ({
        pupil_id: p.id,
        status: records[p.id] || 'present',
      })),
    };

    try {
      await post('/attendance/bulk', payload);
      toast.success('Attendance saved successfully!');
    } catch { /* handled */ }
  };

  const statusStyles = {
    present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    late: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const presentCount = Object.values(records).filter((s) => s === 'present').length;
  const absentCount = Object.values(records).filter((s) => s === 'absent').length;
  const lateCount = Object.values(records).filter((s) => s === 'late').length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input-field sm:w-56"
          >
            <option value="">Select Class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="relative sm:w-48">
            <button
              type="button"
              onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.focus()}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors cursor-pointer z-10"
            >
              <HiOutlineCalendar className="w-5 h-5" />
            </button>
            <input
              ref={dateRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field pl-10 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {pupils.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
            <p className="text-sm text-emerald-600">Present</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className="text-sm text-red-600">Absent</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
            <p className="text-sm text-amber-600">Late</p>
          </div>
        </div>
      )}

      {/* Pupil list */}
      {pupils.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {pupils.map((pupil) => (
              <div key={pupil.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm">
                    {pupil.first_name[0]}{pupil.last_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{pupil.first_name} {pupil.last_name}</p>
                    <p className="text-xs text-gray-500">{pupil.admission_number || ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(pupil.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${statusStyles[records[pupil.id] || 'present']}`}
                >
                  {records[pupil.id] === 'present' && <span className="flex items-center gap-1"><HiOutlineCheck className="w-4 h-4" /> Present</span>}
                  {records[pupil.id] === 'absent' && <span className="flex items-center gap-1"><HiOutlineX className="w-4 h-4" /> Absent</span>}
                  {records[pupil.id] === 'late' && <span>Late</span>}
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-end">
            <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Save Attendance →
            </button>
          </div>
        </div>
      )}

      {!selectedClass && (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-lg">Select a class to take attendance</p>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;

