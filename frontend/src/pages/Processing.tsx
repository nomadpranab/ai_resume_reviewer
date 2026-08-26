import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { reviewApi } from '../services/api'

const STEPS = [
  { id: 1, label: 'Retrieving your resume',    duration: 1000 },
  { id: 2, label: 'Extracting content',         duration: 2000 },
  { id: 3, label: 'Analysing with AI',          duration: 3000 },
  { id: 4, label: 'Generating ATS score',       duration: 1500 },
  { id: 5, label: 'Preparing your report',      duration: 1000 },
]

export default function Processing() {
  const { resumeId } = useParams()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const [analysisStarted, setAnalysisStarted] = useState(false)

  // ── Animate steps ──────────────────────────────────────────────────────────
  useEffect(() => {
    let stepIndex = 0

    const advanceStep = () => {
      if (stepIndex < STEPS.length) {
        setCurrentStep(stepIndex)
        stepIndex++
        setTimeout(advanceStep, STEPS[stepIndex - 1]?.duration || 1000)
      }
    }

    advanceStep()
  }, [])

  // ── Call Gemini API ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resumeId || analysisStarted) return
    setAnalysisStarted(true)

    const runAnalysis = async () => {
  try {
    const res = await reviewApi.analyze(parseInt(resumeId))
    const reviewData = res.data

    // Store review in sessionStorage so Dashboard can read it
    sessionStorage.setItem(
      `review_${reviewData.review_id}`,
      JSON.stringify(reviewData)
    )

    // Wait for animation
    setTimeout(() => {
      navigate(`/dashboard/${reviewData.review_id}`)
    }, 8000)

  } catch (err: any) {
    setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
  }
}

    runAnalysis()
  }, [resumeId])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">

      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-slate-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">

        {error ? (

          /* Error state */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 
                            flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-sora font-semibold text-slate-900 mb-2">
              Analysis failed
            </h3>
            <p className="font-inter text-sm text-slate-500 mb-6">{error}</p>
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary w-full py-3 text-sm"
            >
              Try again
            </button>
          </motion.div>

        ) : (

          /* Processing state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >

            {/* Animated logo */}
            <div className="mb-10 flex justify-center">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-2 border-slate-200
                             border-t-slate-900"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg
                                  flex items-center justify-center">
                    <span className="text-white text-xs font-sora font-bold">R</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="font-sora font-bold text-slate-900 text-2xl mb-2">
              Analysing your resume
            </h2>
            <p className="font-inter text-slate-400 text-sm mb-10">
              This takes about 15-30 seconds
            </p>

            {/* Steps */}
            <div className="glass-card p-6 text-left space-y-4">
              {STEPS.map((step, index) => {
                const isDone    = index < currentStep
                const isCurrent = index === currentStep
                const isPending = index > currentStep

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    {/* Step indicator */}
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-slate-900
                                     flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none"
                               viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2
                                        border-slate-900 border-t-transparent
                                        animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300 mx-auto" />
                      )}
                    </div>

                    {/* Step label */}
                    <span className={`font-inter text-sm ${
                      isDone    ? 'text-slate-900 font-medium' :
                      isCurrent ? 'text-slate-900 font-medium' :
                                  'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </motion.div>
                )
              })}
            </div>

          </motion.div>
        )}

      </div>
    </div>
  )
}
