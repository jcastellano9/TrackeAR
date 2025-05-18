import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UserPlus, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

const Register: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength indicators
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const validatePassword = (value: string) => {
    setPasswordValidation({
      length: value.length >= 6,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value)
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;

  const getPasswordStrengthClass = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordStrength < 3) {
      setError('La contraseña es demasiado débil');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: signUpError } = await signUp(email, password);

      if (signUpError) {
        throw new Error(signUpError.message || 'Error al registrarse');
      }

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white backdrop-blur-sm bg-opacity-80 rounded-2xl shadow-xl p-8 ring-1 ring-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              TrackeAr
            </h1>
            <p className="text-gray-600 mt-2">Crear cuenta nueva</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 1 ? getPasswordStrengthClass() : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 2 ? getPasswordStrengthClass() : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 3 ? getPasswordStrengthClass() : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 4 ? getPasswordStrengthClass() : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 5 ? getPasswordStrengthClass() : 'bg-gray-200'}`}></div>
                    </div>

                    <div className="text-xs space-y-1 mt-2">
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.length ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordValidation.length ? <Check size={12} /> : '•'}
                        </span>
                        <span className={passwordValidation.length ? 'text-gray-700' : 'text-gray-400'}>
                          Mínimo 6 caracteres
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.uppercase ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordValidation.uppercase ? <Check size={12} /> : '•'}
                        </span>
                        <span className={passwordValidation.uppercase ? 'text-gray-700' : 'text-gray-400'}>
                          Al menos una mayúscula
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.number ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordValidation.number ? <Check size={12} /> : '•'}
                        </span>
                        <span className={passwordValidation.number ? 'text-gray-700' : 'text-gray-400'}>
                          Al menos un número
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12 ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-2.5 px-4 rounded-lg ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium transition-colors duration-200`}
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></span>
                ) : (
                  <>
                    <UserPlus size={18} className="mr-2" />
                    Crear cuenta
                  </>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link 
                to="/login"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;