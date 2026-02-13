import { Link } from 'react-router-dom';
import { HiOutlineShieldExclamation } from 'react-icons/hi';

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <HiOutlineShieldExclamation className="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6">You do not have permission to access this page.</p>
      <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
    </div>
  </div>
);

export default Unauthorized;

