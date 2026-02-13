import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineAcademicCap, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ email: form.email, password: form.password });
      toast.success(`Welcome back, ${user.first_name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – illustration / branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="w-20 h-20 bg-accent-400 rounded-full mx-auto mb-6 flex items-center justify-center">
            <HiOutlineAcademicCap className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4">LIFEX SCHOOL MANAGER</h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            The all-in-one platform for managing schools across the board.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-primary-200">
            <div className="bg-primary-400/30 rounded-lg p-3">Pupils/Students</div>
            <div className="bg-primary-400/30 rounded-lg p-3">Attendance</div>
            <div className="bg-primary-400/30 rounded-lg p-3">Fees</div>
            <div className="bg-primary-400/30 rounded-lg p-3">Teachers</div>
            <div className="bg-primary-400/30 rounded-lg p-3">Reports</div>
            <div className="bg-primary-400/30 rounded-lg p-3">Parents</div>
          </div>
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-full mx-auto mb-3 flex items-center justify-center">
              <HiOutlineAcademicCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary-500">LIFEX SCHOOL MANAGER</h1>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Login</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials to access your dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email or Phone</label>
                <div className="relative">
                  <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="admin@school.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="input-field pl-10 pr-10"
                    placeholder="••••••••"
                    required
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

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-500 font-medium hover:underline">
                Register your school
              </Link>
            </p>

            {/* Login help for different roles */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to log in</p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">A</span>
                  <p><span className="font-medium text-gray-700">School Admin</span> — Register your school above to get your admin account.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">T</span>
                  <p><span className="font-medium text-gray-700">Teacher</span> — Your school admin creates your account. Log in with your email and the password provided.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">P</span>
                  <p><span className="font-medium text-gray-700">Parent</span> — Your school admin creates your account. Log in with your email and the password provided.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
