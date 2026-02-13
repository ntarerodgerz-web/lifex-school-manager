import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineAcademicCap, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

const Register = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    school_name: '', school_email: '', school_phone: '', country: '', district: '', region: '', motto: '', school_address: '',
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      const { confirm_password, ...raw } = form;
      // Strip empty strings so backend doesn't receive "" for optional fields
      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== '')
      );
      await register(payload);
      toast.success('School registered! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-full mx-auto mb-3 flex items-center justify-center">
            <HiOutlineAcademicCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your School</h1>
          <p className="text-sm text-gray-500 mt-1">Start your 30-day free trial</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              <span className="text-sm font-medium text-gray-600">{s === 1 ? 'School Info' : 'Admin Account'}</span>
              {s === 1 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">School Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">School Name *</label>
                  <input name="school_name" value={form.school_name} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="label">School Email</label>
                  <input name="school_email" type="email" value={form.school_email} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">School Phone</label>
                  <input name="school_phone" value={form.school_phone} onChange={handleChange} className="input-field" placeholder="+256 700 123456" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <select name="country" value={form.country} onChange={handleChange} className="input-field">
                    <option value="">Select Country</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Kenya">Kenya</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Rwanda">Rwanda</option>
                    <option value="Burundi">Burundi</option>
                    <option value="South Sudan">South Sudan</option>
                    <option value="DR Congo">DR Congo</option>
                    <option value="Ethiopia">Ethiopia</option>
                    <option value="Somalia">Somalia</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana">Ghana</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Zambia">Zambia</option>
                    <option value="Zimbabwe">Zimbabwe</option>
                    <option value="Malawi">Malawi</option>
                    <option value="Mozambique">Mozambique</option>
                    <option value="Cameroon">Cameroon</option>
                    <option value="Senegal">Senegal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">District</label>
                  <input name="district" value={form.district} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Region</label>
                  <input name="region" value={form.region} onChange={handleChange} className="input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Address</label>
                  <input name="school_address" value={form.school_address} onChange={handleChange} className="input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Motto</label>
                  <input name="motto" value={form.motto} onChange={handleChange} className="input-field" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" onClick={() => setStep(2)} className="btn-primary" disabled={!form.school_name}>
                  Next: Admin Account →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+256 700 123456" />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      className="input-field pr-10"
                      required
                      minLength={8}
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <HiOutlineEyeOff className="w-5 h-5" />
                      ) : (
                        <HiOutlineEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <div className="relative">
                    <input
                      name="confirm_password"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirm_password}
                      onChange={handleChange}
                      className="input-field pr-10"
                      required
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <HiOutlineEyeOff className="w-5 h-5" />
                      ) : (
                        <HiOutlineEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Register School'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-primary-500 font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
