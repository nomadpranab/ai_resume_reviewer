import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Review, Improvement } from '../types'
import { reviewApi } from '../services/api'

// ── ATS Score Ring ────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  const scoreColor =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#3B82F6' :
    score >= 40 ? '#F59E0B' : '#EF4444'

  const scoreLabel =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Average' : 'Needs Work'

  // Count up animation
  useEffect(() => {
    let start = 0
    const increment = score / 60
    const timer = setInterval(() => {
      start += increment
      if (start >= score) {
        setDisplayScore(score)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [score])

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          {/* Background ring */}
          <circle
            cx="80" cy="80" r={radius}
            fill="none" stroke="#E2E8F0" strokeWidth="10"
          />
          {/* Progress ring */}
          <motion.circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>

        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-sora font-bold text-4xl"
            style={{ color: scoreColor }}
          >
            {displayScore}
          </span>
          <span className="font-inter text-xs text-slate-400 mt-0.5">
            out of 100
          </span>
        </div>
      </div>

      {/* Score label */}
      <div
        className="mt-3 px-4 py-1.5 rounded-full text-xs font-inter font-semibold"
        style={{
          backgroundColor: scoreColor + '15',
          color: scoreColor
        }}
      >
        {scoreLabel}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { reviewId } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [review, setReview] = useState<Review | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!reviewId) return

    // We already have the review data from Processing page
    // Fetch it from the review history
    const fetchReview = async () => {
      try {
        // Get review history for this session
        // We store the full review in state via navigate
        const state = window.history.state
        if (state?.review) {
          setReview(state.review)
        } else {
          // Fallback: fetch from API using sessionStorage
          const stored = sessionStorage.getItem(`review_${reviewId}`)
          if (stored) {
            setReview(JSON.parse(stored))
          }
        }
      } catch (err) {
        setError('Could not load review data')
      } finally {
        setIsLoading(false)
      }
    }

    // Check sessionStorage for the review
    const stored = sessionStorage.getItem(`review_${reviewId}`)
    if (stored) {
      setReview(JSON.parse(stored))
      setIsLoading(false)
    } else {
      setIsLoading(false)
      setError('Review not found. Please upload and analyse again.')
    }
  }, [reviewId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 
                        border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="glass-card p-8 max-w-sm w-full text-center">
          <p className="font-inter text-slate-500 text-sm mb-4">
            {error || 'Review not found'}
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="btn-primary w-full py-3 text-sm"
          >
            Upload new resume
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5
                      border-b border-slate-100 bg-white/80 backdrop-blur-md
                      sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-lg
                          flex items-center justify-center">
            <span className="text-white text-xs font-sora font-bold">R</span>
          </div>
          <span className="font-sora font-semibold text-slate-900 text-sm">
            ResumeAI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/upload')}
            className="btn-secondary text-sm py-2 px-4"
          >
            New analysis
          </button>
          <button
            onClick={logout}
            className="font-inter text-sm text-slate-500
                       hover:text-slate-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-sora font-bold text-slate-900 text-3xl mb-1">
            Resume Analysis
          </h1>
          <p className="font-inter text-slate-500 text-sm">
            Here is your detailed ATS report
          </p>
        </motion.div>

        {/* Top row: Score + Overall feedback */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* ATS Score card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 flex flex-col items-center"
          >
            <p className="font-sora font-semibold text-slate-900 text-sm mb-6">
              ATS Score
            </p>
            <ScoreRing score={review.ats_score} />
          </motion.div>

          {/* Overall feedback card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 md:col-span-2"
          >
            <p className="font-sora font-semibold text-slate-900 text-sm mb-4">
              Overall Feedback
            </p>
            <p className="font-inter text-slate-600 text-sm leading-relaxed mb-6">
              {review.overall_feedback}
            </p>

            {/* Strengths */}
            <div>
              <p className="font-inter text-xs font-medium text-slate-400 
                            uppercase tracking-wider mb-3">
                Strengths
              </p>
              <div className="flex flex-wrap gap-2">
                {review.strengths.map((strength, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="px-3 py-1 rounded-full text-xs font-inter font-medium
                               bg-emerald-50 text-emerald-700 border border-emerald-100"
                  >
                    {strength}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>

        </div>

        {/* Bottom row: Skill gaps + Improvements + Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Skill gaps */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8"
          >
            <p className="font-sora font-semibold text-slate-900 text-sm mb-1">
              Skill Gaps
            </p>
            <p className="font-inter text-xs text-slate-400 mb-5">
              Skills to add to strengthen your resume
            </p>
            <div className="space-y-2.5">
              {review.skill_gaps.map((skill, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl
                             bg-slate-50 border border-slate-100"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="font-inter text-sm text-slate-700">{skill}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Missing keywords */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-8"
          >
            <p className="font-sora font-semibold text-slate-900 text-sm mb-1">
              Missing Keywords
            </p>
            <p className="font-inter text-xs text-slate-400 mb-5">
              ATS keywords not found in your resume
            </p>
            <div className="flex flex-wrap gap-2">
              {review.keywords_missing.map((keyword, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  className="px-3 py-1.5 rounded-lg text-xs font-inter
                             bg-red-50 text-red-600 border border-red-100"
                >
                  {keyword}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Improvements — full width */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-8 md:col-span-2"
          >
            <p className="font-sora font-semibold text-slate-900 text-sm mb-1">
              Improvements
            </p>
            <p className="font-inter text-xs text-slate-400 mb-6">
              Specific changes to make your resume stronger
            </p>

            <div className="space-y-4">
              {review.improvements.map((item: Improvement, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="p-5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  {/* Section badge */}
                  <span className="inline-block px-2.5 py-0.5 rounded-md
                                   bg-slate-200 font-inter text-xs font-medium
                                   text-slate-600 mb-3">
                    {item.section}
                  </span>

                  {/* Issue */}
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 
                                    flex-shrink-0 mt-1.5" />
                    <p className="font-inter text-sm text-slate-600">
                      {item.issue}
                    </p>
                  </div>

                  {/* Suggestion */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 
                                    flex-shrink-0 mt-1.5" />
                    <p className="font-inter text-sm text-slate-900 font-medium">
                      {item.suggestion}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex justify-center"
        >
          <button
            onClick={() => navigate('/upload')}
            className="btn-primary px-8 py-3.5 text-sm"
          >
            Analyse another resume →
          </button>
        </motion.div>

      </main>
    </div>
  )
}
