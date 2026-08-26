import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">

      {/* Background subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#0F172A 1px, transparent 1px),
                            linear-gradient(90deg, #0F172A 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }}
      />

      {/* Subtle radial glow top center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] 
                      bg-slate-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          {/* Logo mark */}
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-sora font-bold">R</span>
          </div>
          <span className="font-sora font-semibold text-slate-900 text-sm tracking-tight">
            ResumeAI
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary text-sm py-2 px-4"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? '/upload' : '/register')}
            className="btn-primary text-sm py-2 px-4"
          >
            Get started
          </button>
        </motion.div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center 
                       min-h-[calc(100vh-88px)] px-6 text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full 
                           bg-white border border-slate-200 
                           text-xs font-inter font-medium text-slate-600
                           shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Powered by Google Gemini
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-sora font-bold text-slate-900 
                     text-5xl md:text-6xl lg:text-7xl
                     leading-[1.1] tracking-tight
                     max-w-3xl mb-6"
        >
          Your resume,
          <br />
          <span className="text-slate-400">optimised.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="font-inter text-slate-500 text-lg md:text-xl
                     max-w-xl mb-10 leading-relaxed"
        >
          Upload your resume and get an instant ATS score,
          skill gap analysis, and actionable improvements —
          powered by AI.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate(isAuthenticated ? '/upload' : '/register')}
            className="btn-primary px-8 py-3.5 text-sm"
          >
            Analyse my resume →
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary px-8 py-3.5 text-sm"
          >
            Sign in
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 font-inter text-xs text-slate-400"
        >
          PDF and DOCX supported · Results in under 30 seconds
        </motion.p>

        {/* Floating preview card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 glass-card p-6 max-w-sm w-full text-left
                     animate-float shadow-xl shadow-slate-900/5"
        >
          {/* Card header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-sora font-semibold text-slate-900 text-sm">
                Resume Analysis
              </p>
              <p className="font-inter text-xs text-slate-400 mt-0.5">
                Just completed
              </p>
            </div>
            {/* ATS Score badge */}
            <div className="w-12 h-12 rounded-xl bg-slate-900 
                            flex items-center justify-center">
              <span className="font-sora font-bold text-white text-sm">82</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 mb-4" />

          {/* Suggestions preview */}
          <div className="space-y-2.5">
            {[
              { color: 'bg-emerald-500', text: 'Strong technical skills section' },
              { color: 'bg-amber-400',   text: 'Add quantified achievements' },
              { color: 'bg-red-400',     text: 'Missing key ATS keywords' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-2.5"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${item.color} flex-shrink-0`} />
                <p className="font-inter text-xs text-slate-600">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </main>
    </div>
  )
}
