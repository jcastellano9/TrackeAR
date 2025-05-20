// Sección para editar datos del perfil de usuario

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, Key, LogOut, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const changePasswordButtonRef = useRef<HTMLButtonElement>(null);

  const validatePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) return 'Por favor complete todos los campos';
    if (newPassword !== confirmPassword) return 'Las contraseñas nuevas no coinciden';
    if (newPassword.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return null;
  };

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingChange, setLoadingChange] = useState(false);
  // Password visibility and validation states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  // Password validation and strength logic
  const validatePassword = (value: string) => {
    setPasswordValidation({
      length: value.length >= 6,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value)
    });
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;

  const getPasswordStrengthClass = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  useEffect(() => {
    if (isChangingPassword) {
      currentPasswordRef.current?.focus();
    } else {
      changePasswordButtonRef.current?.focus();
    }
  }, [isChangingPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorMessage = validatePasswordChange();
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    setLoadingChange(true);

    try {
      // Here you would implement the actual password change logic
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Contraseña actualizada exitosamente');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError('Error al cambiar la contraseña. Por favor intente nuevamente.');
    } finally {
      setLoadingChange(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Perfil</h1>
        <p className="text-gray-600 dark:text-gray-300">Gestiona tu información personal y seguridad</p>
      </motion.div>

      <div className="space-y-6 lg:space-y-0 lg:flex lg:space-x-6">
        {/* Información de la Cuenta */}
        <div className="lg:w-1/3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-6">
              <User size={24} className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Información de la Cuenta</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <Mail size={20} className="text-gray-400 mt-1 mr-3" />
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Correo electrónico
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar size={20} className="text-gray-400 mt-1 mr-3" />
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Fecha de registro
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        {/* Foto de perfil */}
        <div className="lg:w-1/3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 text-center"
          >
            <div className="flex flex-col items-center">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email || 'User'}`}
                alt="Foto de perfil"
                className="w-24 h-24 rounded-full border-2 border-blue-500 shadow-md mb-3"
              />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{user?.email}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuario registrado</p>
            </div>
          </motion.div>
        </div>
        {/* Acciones Rápidas */}
        <div className="lg:w-1/3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-6">
              <Shield size={24} className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Acciones Rápidas</h2>
            </div>
            <div className="space-y-3">
              <button
                ref={changePasswordButtonRef}
                onClick={() => setIsChangingPassword(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Key size={18} className="text-gray-400 mr-2" />
                  <span className="text-gray-700 dark:text-gray-100">Cambiar contraseña</span>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <LogOut size={18} className="text-red-500 mr-2" />
                  <span className="text-red-600 dark:text-red-400">Cerrar sesión</span>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isChangingPassword && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full transition-colors duration-300"
          >
            <h3 id="change-password-title" className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Cambiar Contraseña</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200">
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-200">
                <Check size={18} className="mr-2 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    ref={currentPasswordRef}
                    type={showCurrentPassword ? "text" : "password"}
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); if (error) setError(null); }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out ${error ? 'border-red-500' : 'border-gray-300'} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      validatePassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out ${error ? 'border-red-500' : 'border-gray-300'} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${passwordStrength > i ? getPasswordStrengthClass() : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                      ))}
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.length ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordValidation.length ? <Check size={12} /> : '•'}
                        </span>
                        <span className={passwordValidation.length ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>Mínimo 6 caracteres</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.uppercase ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordValidation.uppercase ? <Check size={12} /> : '•'}
                        </span>
                        <span className={passwordValidation.uppercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>Al menos una mayúscula</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.number ? 'text-green-500' : 'text-gray-400'}`}>
                          {passwordValidation.number ? <Check size={12} /> : '•'}
                        </span>
                        <span className={passwordValidation.number ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>Al menos un número</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(null); }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out ${error ? 'border-red-500' : 'border-gray-300'} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingChange || !passwordStrength || newPassword !== confirmPassword}
                  className={`px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ease-in-out ${
                    loadingChange || !passwordStrength || newPassword !== confirmPassword
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all duration-200 ease-in-out'
                  } text-white`}
                >
                  {loadingChange ? (
                    <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full" />
                  ) : (
                    'Actualizar contraseña'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Profile;