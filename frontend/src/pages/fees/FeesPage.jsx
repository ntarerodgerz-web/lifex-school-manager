import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineCurrencyDollar, HiOutlinePencil,
  HiOutlineTrash, HiOutlineX, HiOutlineCalendar,
} from 'react-icons/hi';

const emptyFeeForm = { name: '', amount: '', class_id: '', term: '', academic_year: '', due_date: '', description: '' };
const emptyPayForm = { pupil_id: '', fee_id: '', amount: '', payment_method: 'cash', reference_number: '' };

const FeesPage = () => {
  const { isAdmin } = useAuth();
  const { get, post, put, del, loading } = useApi();
  const dueDateRef = useRef(null);

  // Data
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [classes, setClasses] = useState([]);

  // Fee type form
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editFeeId, setEditFeeId] = useState(null);
  const [feeForm, setFeeForm] = useState({ ...emptyFeeForm });

  // Payment form
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ ...emptyPayForm });

  /* ─── Fetch data ─── */
  const fetchFees = useCallback(async () => {
    try {
      const res = await get('/fees', null, { silent: true });
      setFees(res.data || []);
    } catch { /* handled */ }
  }, [get]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await get('/payments', { limit: 50 }, { silent: true });
      setPayments(res.data || []);
    } catch { /* handled */ }
  }, [get]);

  const fetchPupils = useCallback(async () => {
    try {
      const res = await get('/pupils', { limit: 500 }, { silent: true });
      setPupils(res.data?.pupils || res.data || []);
    } catch { /* handled */ }
  }, [get]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await get('/classes', null, { silent: true });
      setClasses(res.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => {
    fetchFees();
    fetchPayments();
    fetchPupils();
    fetchClasses();
  }, [fetchFees, fetchPayments, fetchPupils, fetchClasses]);

  /* ─── Fee type handlers ─── */
  const resetFeeForm = () => { setFeeForm({ ...emptyFeeForm }); setEditFeeId(null); };

  const handleEditFee = (f) => {
    setEditFeeId(f.id);
    setFeeForm({
      name: f.name || '',
      amount: f.amount || '',
      class_id: f.class_id || '',
      term: f.term || '',
      academic_year: f.academic_year || '',
      due_date: f.due_date ? f.due_date.slice(0, 10) : '',
      description: f.description || '',
    });
    setShowFeeForm(true);
    setShowPayForm(false);
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: feeForm.name,
        amount: parseFloat(feeForm.amount),
        class_id: feeForm.class_id || null,
        term: feeForm.term || null,
        academic_year: feeForm.academic_year || null,
        due_date: feeForm.due_date || null,
        description: feeForm.description || null,
      };

      if (editFeeId) {
        await put(`/fees/${editFeeId}`, payload);
        toast.success('Fee type updated');
      } else {
        await post('/fees', payload);
        toast.success('Fee type created');
      }
      setShowFeeForm(false);
      resetFeeForm();
      fetchFees();
    } catch { /* handled */ }
  };

  const handleDeleteFee = async (id, name) => {
    if (!window.confirm(`Delete fee type "${name}"?`)) return;
    try {
      await put(`/fees/${id}`, { is_active: false });
      toast.success('Fee type removed');
      fetchFees();
    } catch { /* handled */ }
  };

  /* ─── Payment handlers ─── */
  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        pupil_id: payForm.pupil_id,
        fee_id: payForm.fee_id || null,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference_number: payForm.reference_number || null,
      };
      await post('/payments', payload);
      toast.success('Payment recorded');
      setShowPayForm(false);
      setPayForm({ ...emptyPayForm });
      fetchPayments();
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fees & Payments</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowFeeForm(!showFeeForm); setShowPayForm(false); resetFeeForm(); }}
              className="btn-secondary flex items-center gap-2"
            >
              <HiOutlinePlus className="w-5 h-5" /> Add Fee Type
            </button>
            <button
              onClick={() => { setShowPayForm(!showPayForm); setShowFeeForm(false); }}
              className="btn-primary flex items-center gap-2"
            >
              <HiOutlineCurrencyDollar className="w-5 h-5" /> Record Payment
            </button>
          </div>
        )}
      </div>

      {/* ─── Fee Type Form ─── */}
      {showFeeForm && (
        <form onSubmit={handleFeeSubmit} className="card space-y-4 border-accent-200 bg-accent-50/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{editFeeId ? 'Edit Fee Type' : 'Create Fee Type'}</h3>
            <button type="button" onClick={() => { setShowFeeForm(false); resetFeeForm(); }} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Fee Name *</label>
              <input
                value={feeForm.name}
                onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                className="input-field"
                required
                placeholder="e.g., Tuition Term 1"
              />
            </div>
            <div>
              <label className="label">Amount (UGX) *</label>
              <input
                type="number"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                className="input-field"
                required
                min="1"
                placeholder="e.g., 350000"
              />
            </div>
            <div>
              <label className="label">Class (optional)</label>
              <select
                value={feeForm.class_id}
                onChange={(e) => setFeeForm({ ...feeForm, class_id: e.target.value })}
                className="input-field"
              >
                <option value="">— All classes —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Term</label>
              <select
                value={feeForm.term}
                onChange={(e) => setFeeForm({ ...feeForm, term: e.target.value })}
                className="input-field"
              >
                <option value="">Select term</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input
                value={feeForm.academic_year}
                onChange={(e) => setFeeForm({ ...feeForm, academic_year: e.target.value })}
                className="input-field"
                placeholder="e.g., 2026"
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <div className="relative">
                <input
                  ref={dueDateRef}
                  type="date"
                  value={feeForm.due_date}
                  onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                  className="input-field pr-10 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => dueDateRef.current?.showPicker?.() || dueDateRef.current?.focus()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors cursor-pointer z-10"
                >
                  <HiOutlineCalendar className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Description</label>
              <input
                value={feeForm.description}
                onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                className="input-field"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowFeeForm(false); resetFeeForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : editFeeId ? 'Update Fee Type' : 'Create Fee Type'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Payment Form ─── */}
      {showPayForm && (
        <form onSubmit={handlePayment} className="card space-y-4 border-primary-200 bg-primary-50/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Record Payment</h3>
            <button type="button" onClick={() => setShowPayForm(false)} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Pupil *</label>
              <select
                value={payForm.pupil_id}
                onChange={(e) => setPayForm({ ...payForm, pupil_id: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select pupil</option>
                {pupils.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}{p.class_name ? ` (${p.class_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fee Type *</label>
              <select
                value={payForm.fee_id}
                onChange={(e) => setPayForm({ ...payForm, fee_id: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select fee type</option>
                {fees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — UGX {Number(f.amount).toLocaleString()}
                    {f.term ? ` (${f.term})` : ''}
                  </option>
                ))}
              </select>
              {fees.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No fee types found. Please create a fee type first using the "Add Fee Type" button above.
                </p>
              )}
            </div>
            <div>
              <label className="label">Amount Paid (UGX) *</label>
              <input
                type="number"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="input-field"
                required
                min="1"
                placeholder="e.g., 350000"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                className="input-field"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Reference #</label>
              <input
                value={payForm.reference_number}
                onChange={(e) => setPayForm({ ...payForm, reference_number: e.target.value })}
                className="input-field"
                placeholder="e.g., MM-1234567"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowPayForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Payment'}</button>
          </div>
        </form>
      )}

      {/* ─── Fee Types List ─── */}
      {isAdmin && fees.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Fee Types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fees.map((f) => (
              <div key={f.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-gray-800">{f.name}</h4>
                    <span className="text-sm font-bold text-emerald-600">UGX {Number(f.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {f.class_name && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded text-[11px] font-medium">{f.class_name}</span>
                    )}
                    {f.term && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{f.term}</span>
                    )}
                    {f.academic_year && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[11px]">{f.academic_year}</span>
                    )}
                  </div>
                  {f.description && <p className="text-xs text-gray-400 mt-1">{f.description}</p>}
                </div>
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                  <button onClick={() => handleEditFee(f)} className="text-xs text-gray-500 hover:text-primary-500 flex items-center gap-1">
                    <HiOutlinePencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDeleteFee(f.id, f.name)} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
                    <HiOutlineTrash className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Payment History ─── */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3">Pupil</th>
                <th className="text-left p-3 hidden sm:table-cell">Fee Type</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-center p-3 hidden md:table-cell">Method</th>
                <th className="text-center p-3 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay) => (
                <tr key={pay.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{pay.pupil_name}</td>
                  <td className="p-3 text-gray-600 hidden sm:table-cell">{pay.fee_name || '—'}</td>
                  <td className="p-3 text-right font-semibold text-emerald-600">UGX {Number(pay.amount).toLocaleString()}</td>
                  <td className="p-3 text-center hidden md:table-cell">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">{pay.payment_method?.replace('_', ' ')}</span>
                  </td>
                  <td className="p-3 text-center text-gray-500 hidden lg:table-cell">{new Date(pay.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-400">
                    No payments recorded yet.
                    {isAdmin && fees.length === 0 && (
                      <span className="block text-sm mt-1">Start by creating fee types, then record payments.</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeesPage;
