import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineCalendar,
} from 'react-icons/hi';

const SubscriptionsPage = () => {
  const { get, post, loading } = useApi();
  const [schools, setSchools] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    school_id: '',
    plan_type: 'standard',
    amount: '',
    currency: 'UGX',
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    payment_reference: '',
  });

  const startsRef = useRef(null);
  const expiresRef = useRef(null);

  const fetchSchools = useCallback(async () => {
    try {
      const res = await get('/schools', { limit: 200 });
      const list = res.data?.schools || [];
      setSchools(list);
    } catch {
      // handled
    }
  }, [get]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await post('/subscriptions', {
        ...form,
        amount: parseFloat(form.amount) || 0,
      });
      toast.success('Subscription created & activated!');
      setShowForm(false);
      setForm({
        school_id: '',
        plan_type: 'standard',
        amount: '',
        currency: 'UGX',
        starts_at: new Date().toISOString().split('T')[0],
        expires_at: '',
        payment_reference: '',
      });
      fetchSchools(); // refresh
    } catch {
      // handled
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: 'bg-emerald-100 text-emerald-700',
      trial: 'bg-amber-100 text-amber-700',
      expired: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const planBadge = (plan) => {
    const map = {
      starter: 'bg-gray-100 text-gray-700',
      standard: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[plan] || 'bg-gray-100 text-gray-600'}`}>
        {plan}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineCurrencyDollar className="w-7 h-7 text-primary-500" />
            Subscriptions Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Activate or manage school subscriptions</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <HiOutlineX className="w-4 h-4" /> : <HiOutlinePlus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Subscription'}
        </button>
      </div>

      {/* Create subscription form */}
      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Activate Subscription</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">School *</label>
              <select
                name="school_id"
                value={form.school_id}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select school…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subscription_status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Plan *</label>
              <select
                name="plan_type"
                value={form.plan_type}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="starter">Starter</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div>
              <label className="label">Amount *</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="e.g. 500000"
                required
                min="0"
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Currency</label>
              <input
                type="text"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Start Date *</label>
              <div className="relative">
                <input
                  ref={startsRef}
                  type="date"
                  name="starts_at"
                  value={form.starts_at}
                  onChange={handleChange}
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => startsRef.current?.showPicker?.()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors"
                  tabIndex={-1}
                >
                  <HiOutlineCalendar className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="label">Expiry Date *</label>
              <div className="relative">
                <input
                  ref={expiresRef}
                  type="date"
                  name="expires_at"
                  value={form.expires_at}
                  onChange={handleChange}
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => expiresRef.current?.showPicker?.()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors"
                  tabIndex={-1}
                >
                  <HiOutlineCalendar className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="label">Payment Reference</label>
              <input
                type="text"
                name="payment_reference"
                value={form.payment_reference}
                onChange={handleChange}
                placeholder="e.g. TXN-12345"
                className="input-field"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating…' : 'Create Subscription'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools subscription overview */}
      <div className="card overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">All Schools — Subscription Status</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left p-3">School</th>
              <th className="text-center p-3">Plan</th>
              <th className="text-center p-3">Status</th>
              <th className="text-left p-3">Trial Ends</th>
              <th className="text-left p-3">Subscription Expires</th>
            </tr>
          </thead>
          <tbody>
            {schools.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">
                  No schools found.
                </td>
              </tr>
            ) : (
              schools.map((school) => (
                <tr key={school.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{school.name}</td>
                  <td className="p-3 text-center">{planBadge(school.plan_type)}</td>
                  <td className="p-3 text-center">{statusBadge(school.subscription_status)}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {school.trial_ends_at ? new Date(school.trial_ends_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {school.subscription_expires_at ? new Date(school.subscription_expires_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionsPage;

