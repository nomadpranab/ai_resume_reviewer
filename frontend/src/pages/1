
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../services/api'

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      await authApi.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      })
      // Registration successful → go to login
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
                      bg-slate-900/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-sora font-bold">R</span>
          </div>
          <span className="font-sora font-semibold text-slate-900 text-sm">
            ResumeAI
          </span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-sora font-bold text-slate-900 text-3xl mb-2">
            Create account
          </h1>
          <p className="font-inter text-slate-500 text-sm">
            Start analysing your resume in seconds
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block font-inter text-sm font-medium
                                text-slate-700 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block font-inter text-sm font-medium
                                text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block font-inter text-sm font-medium
                                text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block font-inter text-sm font-medium
                                text-slate-700 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirm_password}
                onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                className="input-field"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl bg-red-50 border border-red-100"
              >
                <p className="font-inter text-xs text-red-600">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30
                                  border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create account'
              )}
            </button>

          </form>
        </div>

        <p className="text-center font-inter text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-slate-900 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>

      </motion.div>
    </div>
  )
}
