import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resumeApi} from '../services/api'

export default function Upload() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  // ── Drag & Drop handlers ──────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError('')

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) validateAndSetFile(droppedFile)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const validateAndSetFile = (f: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (!allowedTypes.includes(f.type)) {
      setError('Only PDF and DOCX files are supported')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB')
      return
    }
    setFile(f)
  }

  // ── Upload + Analyse ──────────────────────────────────────────────────────

  const handleAnalyse = async () => {
    if (!file) return
    setIsUploading(true)
    setError('')

    try {
      // Step 1: Upload file to S3 via backend
      const uploadRes = await resumeApi.upload(file)
      const resumeId = uploadRes.data.id

      // Step 2: Navigate to processing page
      // Processing page will call the analyse endpoint
      navigate(`/processing/${resumeId}`)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setIsUploading(false)
    }
  }

  // ── File size formatter ───────────────────────────────────────────────────

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fileIcon = file?.type === 'application/pdf' ? '📄' : '📝'

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
      <main className="flex flex-col items-center justify-center 
                       min-h-[calc(100vh-73px)] px-6 py-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h1 className="font-sora font-bold text-slate-900 text-4xl mb-3">
            Upload your resume
          </h1>
          <p className="font-inter text-slate-500 text-base">
            Get an instant ATS score and AI-powered feedback
          </p>
        </motion.div>

        {/* Upload card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-xl"
        >
          <AnimatePresence mode="wait">

            {/* Drop zone — shown when no file selected */}
            {!file ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative glass-card p-16 text-center cursor-pointer
                  transition-all duration-300
                  ${isDragging
                    ? 'border-slate-900 bg-slate-900/5 scale-[1.01]'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
                style={{
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  borderColor: isDragging ? '#0F172A' : '#E2E8F0'
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {/* Upload icon */}
                <motion.div
                  animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="mb-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 
                                  flex items-center justify-center mb-4">
                    <svg
                      className="w-7 h-7 text-slate-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>

                  <p className="font-sora font-semibold text-slate-900 text-lg mb-1">
                    {isDragging ? 'Drop it here' : 'Drop your resume here'}
                  </p>
                  <p className="font-inter text-slate-400 text-sm">
                    or{' '}
                    <span className="text-slate-900 font-medium underline
                                     underline-offset-2">
                      browse files
                    </span>
                  </p>
                </motion.div>

                {/* File type badges */}
                <div className="flex items-center justify-center gap-2 mt-6">
                  {['PDF', 'DOCX'].map(type => (
                    <span
                      key={type}
                      className="px-2.5 py-1 rounded-md bg-slate-100
                                 font-inter text-xs font-medium text-slate-500"
                    >
                      {type}
                    </span>
                  ))}
                  <span className="font-inter text-xs text-slate-400">
                    · Max 5MB
                  </span>
                </div>

                {/* Hidden file input */}
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </motion.div>

            ) : (

              /* File selected state */
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8"
              >
                {/* File info */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 
                                  flex items-center justify-center text-2xl flex-shrink-0">
                    {fileIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sora font-semibold text-slate-900 
                                  text-sm truncate mb-0.5">
                      {file.name}
                    </p>
                    <p className="font-inter text-xs text-slate-400">
                      {formatSize(file.size)} ·{' '}
                      {file.type === 'application/pdf' ? 'PDF' : 'DOCX'}
                    </p>
                  </div>

                  {/* Ready badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 
                                  rounded-full bg-emerald-50 border border-emerald-100
                                  flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-inter text-xs font-medium text-emerald-700">
                      Ready
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 mb-8" />

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    Change file
                  </button>
                  <button
                    onClick={handleAnalyse}
                    disabled={isUploading}
                    className="btn-primary flex-1 py-3 text-sm 
                               flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30
                                        border-t-white rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Analyse resume →'
                    )}
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 px-4 py-3 rounded-xl 
                           bg-red-50 border border-red-100"
              >
                <p className="font-inter text-xs text-red-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 font-inter text-xs text-slate-400 text-center"
        >
          Your resume is stored securely · Never shared · Deleted on request
        </motion.p>

      </main>
    </div>
  )
}
