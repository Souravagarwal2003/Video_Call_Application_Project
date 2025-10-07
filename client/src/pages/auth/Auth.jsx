import { useState } from 'react';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import apiClient from '../../apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContextApi';
import Lottie from 'lottie-react';
import auth from '../../assets/auth.json';

const AuthForm = ({ type }) => {
    const formClasses = "bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-xl w-full max-w-md";
    const {updateUser } = useUser();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullname: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        gender: 'male',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (type === 'signup' && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }
        setLoading(true);
        try {
            const endpoint = type === 'signup' ? '/auth/signup' : '/auth/login';
            const response = await apiClient.post(endpoint, formData);
            toast.success(response.data.message || 'Success!');
            if (type === 'signup') {
                navigate('/login')
            }
            if (type === 'login') {
                updateUser(response.data)
                //localStorage.setItem('userData', JSON.stringify(response.data));
                // Save token in cookies
                const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                const expires = "expires=" + date.toUTCString();
                document.cookie = `jwt=${response.data.token}; path=/; ${expires}`;
                navigate('/')
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,119,198,0.15),rgba(255,255,255,0.05))]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,0.9),rgba(0,0,0,0.95))]"></div>
            
            <div className="bg-gray-900/40 backdrop-blur-xl text-gray-100 p-8 rounded-2xl shadow-2xl border border-gray-700/30 w-full max-w-md m-2 relative z-10">
                <div className="flex justify-center items-center p-4">
                    <div className="w-40 h-40 relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-md opacity-75 animate-pulse"></div>
                        <Lottie animationData={auth} loop={0} />
                    </div>
                </div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent text-center mb-2">Welcome To Secure Call</h2>
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-300">{type === 'signup' ? 'Create Account' : 'Sign In'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {type === 'signup' && (
                        <>
                            <div className="flex items-center border border-gray-700/50 rounded-xl p-3 bg-gray-800/50 backdrop-blur-sm group focus-within:border-indigo-500/50 focus-within:bg-gray-800/80 transition-all duration-300">
                                <FaUser className="text-indigo-400 mr-3 group-focus-within:text-indigo-300 transition-colors" />
                                <input
                                    type="text"
                                    name="fullname"
                                    placeholder="Full Name"
                                    className="w-full bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="flex items-center border border-gray-700/50 rounded-xl p-3 bg-gray-800/50 backdrop-blur-sm group focus-within:border-indigo-500/50 focus-within:bg-gray-800/80 transition-all duration-300">
                                <FaUser className="text-indigo-400 mr-3 group-focus-within:text-indigo-300 transition-colors" />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username (e.g., John099)"
                                    className="w-full bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </>
                    )}
                    <div className="flex items-center border border-gray-700/50 rounded-xl p-3 bg-gray-800/50 backdrop-blur-sm group focus-within:border-indigo-500/50 focus-within:bg-gray-800/80 transition-all duration-300">
                        <FaEnvelope className="text-indigo-400 mr-3 group-focus-within:text-indigo-300 transition-colors" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            className="w-full bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="flex items-center border border-gray-700/50 rounded-xl p-3 bg-gray-800/50 backdrop-blur-sm group focus-within:border-indigo-500/50 focus-within:bg-gray-800/80 transition-all duration-300">
                        <FaLock className="text-indigo-400 mr-3 group-focus-within:text-indigo-300 transition-colors" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="w-full bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {type === 'signup' && (
                        <div className="flex items-center border border-gray-700/50 rounded-xl p-3 bg-gray-800/50 backdrop-blur-sm group focus-within:border-indigo-500/50 focus-within:bg-gray-800/80 transition-all duration-300">
                            <FaLock className="text-indigo-400 mr-3 group-focus-within:text-indigo-300 transition-colors" />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                className="w-full bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}
                    {type === 'signup' && (
                        <div className="flex items-center justify-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={formData.gender === 'male'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 ${formData.gender === 'male' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-600 group-hover:border-gray-500'} transition-colors`}></div>
                                    {formData.gender === 'male' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white"></div></div>}
                                </div>
                                <span className="text-gray-300 group-hover:text-gray-200 transition-colors">Male</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={formData.gender === 'female'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 ${formData.gender === 'female' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-600 group-hover:border-gray-500'} transition-colors`}></div>
                                    {formData.gender === 'female' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white"></div></div>}
                                </div>
                                <span className="text-gray-300 group-hover:text-gray-200 transition-colors">Female</span>
                            </label>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-medium shadow-lg shadow-indigo-500/25 transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        disabled={loading}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-indigo-600/40 to-purple-600/40 animate-shimmer"></span>
                        <div className="flex items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    {type === 'signup' ? 'Create Account' : 'Sign In'}
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                                </>
                            )}
                        </div>
                    </button>
                </form>
                <p className="text-center text-sm mt-6 text-gray-400">
                    {type === 'signup' ? (
                        <>
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200 group inline-flex items-center gap-1">
                                Sign In
                                <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200 group inline-flex items-center gap-1">
                                Create Account
                                <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
                            </Link>
                        </>
                    )}
                </p>

            </div>
            <Toaster position="top-center" />
        </div>
    )
}

export default AuthForm;