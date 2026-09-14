import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ResumeHistory } from '../types'
import { resumeApi, reviewApi } from '../services/api'

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-inter font-medium
                       bg-slate-100 text-slate-500">
        Not analysed
      </span>
    )
  }

  const color =
    score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
    score >= 60 ? 'bg-blue-50 text-blue-700 border-blue-100' :
    score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-red-50 text-red-600 border-red-100'

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-inter 
                      font-semibold border ${color}`}>
      {score} / 100
    </span>
  )
}

// ── File icon ─────────────────────────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-slate-100
                    flex items-center justify-center text-lg flex-shrink-0">
      {type === 'pdf' ? '📄' : '📝'}
    </div>
  )
}

// ── Main History Page ─────────────────────────────────────────────────────────
export default function History() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [history, setHistory]     = useState<ResumeHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')
  const [analysing, setAnalysing] = useState<number | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await resumeApi.history()
      setHistory(res.data.history)
    } catch (err: any) {
      setError('Failed to load history. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Re-analyse an existing resume
  const handleAnalyse = async (resumeId: number) => {
    setAnalysing(resumeId)
    try {
      const res = await reviewApi.analyze(resumeId)
      const reviewData = res.data

      // Store in sessionStorage for Dashboard
      sessionStorage.setItem(
        `review_${reviewData.review_id}`,
        JSON.stringify(reviewData)
      )

      navigate(`/dashboard/${reviewData.review_id}`)
    } catch (err: any) {
      setError('Analysis failed. Please try again.')
      setAnalysing(null)
    }
  }

  // View existing analysis

  const handleViewAnalysis = async (resumeId: number, reviewId: number) => {
  try {
    const res = await reviewApi.history(resumeId)
    const reviews = res.data  // this is already an array

    // Find the specific review
    const review = reviews.find((r: any) => r.review_id === reviewId)

    if (review) {
      // Add missing fields with defaults if not present
      const fullReview = {
        ...review,
        resume_id:        resumeId,
        keywords_missing: review.keywords_missing || [],
        strengths:        review.strengths        || [],
      }

      sessionStorage.setItem(
        `review_${reviewId}`,
        JSON.stringify(fullReview)
      )
      navigate(`/dashboard/${reviewId}`)
    } else {
      setError('Review not found.')
    }
  } catch (err) {
    setError('Could not load analysis. Please try again.')
  }
}


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day:   'numeric',
      month: 'short',
      year:  'numeric'
    })
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
            New upload
          </button>
          <span className="font-inter text-sm text-slate-500">
            {user?.full_name}
          </span>
          <button
            onClick={logout}
            className="font-inter text-sm text-slate-500
                       hover:text-slate-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-sora font-bold text-slate-900 text-3xl mb-1">
            Your resume history
          </h1>
          <p className="font-inter text-slate-500 text-sm">
            All your uploaded resumes and past analyses
          </p>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl
                          bg-red-50 border border-red-100">
            <p className="font-inter text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900
                            border-t-transparent rounded-full animate-spin" />
          </div>

        ) : history.length === 0 ? (

          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100
                            flex items-center justify-center text-2xl mb-4">
              📄
            </div>
            <h3 className="font-sora font-semibold text-slate-900 mb-2">
              No resumes yet
            </h3>
            <p className="font-inter text-sm text-slate-500 mb-6">
              Upload your first resume to get started
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              Upload resume →
            </button>
          </motion.div>

        ) : (

          /* Resume list */
          <div className="space-y-4">
            {history.map((item, index) => (
              <motion.div
                key={item.resume_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-4">

                  {/* File icon */}
                  <FileIcon type={item.file_type} />

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sora font-semibold text-slate-900
                                  text-sm truncate mb-1">
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="font-inter text-xs text-slate-400">
                        {formatDate(item.uploaded_at)}
                      </span>
                      <span className="text-slate-200">·</span>
                      <span className="font-inter text-xs text-slate-400">
                        {item.review_count === 0
                          ? 'Never analysed'
                          : `${item.review_count} ${item.review_count === 1
                              ? 'analysis' : 'analyses'}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Score badge */}
                  <ScoreBadge score={item.latest_score} />

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">

                    {/* View latest analysis */}
                    {item.latest_review_id && (
                      <button
                        onClick={() => handleViewAnalysis(
                          item.resume_id,
                          item.latest_review_id!
                        )}
                        className="btn-secondary text-xs py-2 px-3"
                      >
                        View analysis
                      </button>
                    )}

                    {/* Re-analyse */}
                    <button
                      onClick={() => handleAnalyse(item.resume_id)}
                      disabled={analysing === item.resume_id}
                      className="btn-primary text-xs py-2 px-3
                                 flex items-center gap-1.5"
                    >
                      {analysing === item.resume_id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30
                                          border-t-white rounded-full animate-spin" />
                          Analysing...
                        </>
                      ) : (
                        item.review_count === 0
                          ? 'Analyse →'
                          : 'Re-analyse →'
                      )}
                    </button>

                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
