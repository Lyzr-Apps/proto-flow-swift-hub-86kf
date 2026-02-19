'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { uploadAndTrainDocument } from '@/lib/ragKnowledgeBase'
import {
  FiMessageSquare,
  FiShield,
  FiAlertTriangle,
  FiFileText,
  FiHome,
  FiList,
  FiSend,
  FiUpload,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiUser,
  FiClock,
  FiChevronRight,
  FiChevronDown,
  FiFilter,
  FiSearch,
  FiMenu,
  FiArrowUp,
  FiArrowDown,
  FiActivity,
  FiTrendingUp,
  FiDownload,
  FiInfo,
  FiCopy,
  FiRefreshCw,
  FiPlus,
  FiFile,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const AGENT_IDS = {
  PRODUCT_CHATBOT: '6996e9c70de62bcad95a8abc',
  UNDERWRITING_RISK: '6996e9adf908c28cb54245a1',
  POLICY_DRAFT: '6996e9ad229adca5a90509a0',
  CLAIM_FRAUD: '6996e9ae12d3d03d3b00b756',
  CLAIM_DECISION: '6996e9ae744b96afe6ba6ac8',
}

const RAG_ID = '6996e9543dc9e9e52824051f'

type Section = 'dashboard' | 'chatbot' | 'underwriting' | 'claims' | 'audit'

// ─── THEME COLORS ────────────────────────────────────────────────────────────

const C = {
  bg: 'hsl(35,29%,95%)',
  fg: 'hsl(30,22%,14%)',
  card: 'hsl(35,29%,92%)',
  cardFg: 'hsl(30,22%,14%)',
  primary: 'hsl(27,61%,26%)',
  primaryFg: 'hsl(35,29%,98%)',
  secondary: 'hsl(35,20%,88%)',
  secondaryFg: 'hsl(30,22%,18%)',
  accent: 'hsl(43,75%,38%)',
  accentFg: 'hsl(35,29%,98%)',
  muted: 'hsl(35,15%,85%)',
  mutedFg: 'hsl(30,20%,45%)',
  border: 'hsl(27,61%,26%)',
  destructive: 'hsl(0,84%,60%)',
  sidebarBg: 'hsl(35,25%,90%)',
  sidebarBorder: 'hsl(35,20%,85%)',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function safeParseJSON(str: string | undefined | null): string[] {
  if (!str) return []
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : [String(str)]
  } catch {
    if (str.includes(',')) return str.split(',').map(s => s.trim())
    return [String(str)]
  }
}

function formatRupiah(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num.replace(/\D/g, '')) : num
  if (isNaN(n)) return typeof num === 'string' ? num : 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function formatTimestamp(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  content: string
  timestamp: Date
  product?: string
  confidence?: string
}

interface AuditEntry {
  id: string
  timestamp: Date
  module: 'Chatbot' | 'Underwriting' | 'Claims'
  action: string
  agent: string
  decision: string
  user: string
  status: string
  details?: Record<string, unknown>
}

interface UnderwritingForm {
  applicantName: string
  companyReg: string
  npwp: string
  industry: string
  productType: string
  coverageAmount: string
  tenor: string
}

interface ClaimForm {
  policyNumber: string
  claimType: string
  incidentDate: string
  claimedAmount: string
  description: string
}

// ─── INITIAL DATA ────────────────────────────────────────────────────────────

const INITIAL_AUDIT: AuditEntry[] = [
  { id: 'a1', timestamp: new Date('2026-02-19T08:15:00'), module: 'Underwriting', action: 'Risk Assessment Completed', agent: 'Underwriting Risk Analyzer', decision: 'REFER', user: 'Budi Santoso', status: 'Completed' },
  { id: 'a2', timestamp: new Date('2026-02-19T08:30:00'), module: 'Underwriting', action: 'Policy Draft Generated', agent: 'Policy Draft Agent', decision: 'Draft Created', user: 'Budi Santoso', status: 'Completed' },
  { id: 'a3', timestamp: new Date('2026-02-19T09:00:00'), module: 'Claims', action: 'Fraud Analysis Completed', agent: 'Claim Fraud Detector', decision: 'LOW RISK', user: 'Sari Dewi', status: 'Completed' },
  { id: 'a4', timestamp: new Date('2026-02-19T09:15:00'), module: 'Claims', action: 'Claim Decision Generated', agent: 'Claim Decision Agent', decision: 'APPROVE_FULL', user: 'Sari Dewi', status: 'Completed' },
  { id: 'a5', timestamp: new Date('2026-02-19T09:45:00'), module: 'Chatbot', action: 'Product Inquiry', agent: 'Product Chatbot', decision: 'Answered', user: 'Customer', status: 'Completed' },
  { id: 'a6', timestamp: new Date('2026-02-19T10:00:00'), module: 'Underwriting', action: 'Risk Assessment Completed', agent: 'Underwriting Risk Analyzer', decision: 'APPROVE', user: 'Budi Santoso', status: 'Completed' },
  { id: 'a7', timestamp: new Date('2026-02-19T10:30:00'), module: 'Claims', action: 'Fraud Analysis Completed', agent: 'Claim Fraud Detector', decision: 'MODERATE', user: 'Andi Pratama', status: 'Completed' },
  { id: 'a8', timestamp: new Date('2026-02-18T14:20:00'), module: 'Chatbot', action: 'Product Inquiry', agent: 'Product Chatbot', decision: 'Answered', user: 'Agent', status: 'Completed' },
  { id: 'a9', timestamp: new Date('2026-02-18T15:00:00'), module: 'Underwriting', action: 'Application Submitted', agent: 'Underwriting Risk Analyzer', decision: 'DECLINE', user: 'Budi Santoso', status: 'Completed' },
  { id: 'a10', timestamp: new Date('2026-02-18T16:00:00'), module: 'Claims', action: 'Claim Escalated', agent: 'Claim Decision Agent', decision: 'ESCALATE', user: 'Sari Dewi', status: 'Escalated' },
]

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, max = 100, size = 120, label, color }: { score: number; max?: number; size?: number; label: string; color: string }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(score / max, 1)
  const offset = circumference - pct * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.muted} strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold font-serif" style={{ color }}>{score}</span>
        <span className="text-xs" style={{ color: C.mutedFg }}>/{max}</span>
      </div>
      <span className="text-xs font-medium" style={{ color: C.mutedFg }}>{label}</span>
    </div>
  )
}

function DecisionBadge({ decision }: { decision: string }) {
  const upper = decision.toUpperCase()
  let bg = '#22c55e'
  let text = '#fff'
  if (upper.includes('REFER') || upper.includes('MODERATE') || upper.includes('PARTIAL') || upper.includes('CONDITIONS')) {
    bg = C.accent; text = '#fff'
  } else if (upper.includes('DECLINE') || upper.includes('DENY') || upper.includes('HIGH') || upper.includes('CRITICAL')) {
    bg = C.destructive; text = '#fff'
  } else if (upper.includes('ESCALATE')) {
    bg = '#a855f7'; text = '#fff'
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
      style={{ backgroundColor: bg, color: text }}>
      {decision}
    </span>
  )
}

function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
              style={{
                backgroundColor: i < current ? C.primary : i === current ? C.accent : 'transparent',
                borderColor: i <= current ? C.primary : C.muted,
                color: i <= current ? C.primaryFg : C.mutedFg,
              }}>
              {i < current ? <FiCheck size={14} /> : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:inline" style={{ color: i <= current ? C.fg : C.mutedFg }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: i < current ? C.primary : C.muted }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg p-6 animate-pulse" style={{ backgroundColor: C.card }}>
      <div className="h-4 rounded w-1/3 mb-4" style={{ backgroundColor: C.muted }} />
      <div className="h-3 rounded w-full mb-2" style={{ backgroundColor: C.muted }} />
      <div className="h-3 rounded w-2/3 mb-2" style={{ backgroundColor: C.muted }} />
      <div className="h-3 rounded w-5/6 mb-4" style={{ backgroundColor: C.muted }} />
      <div className="h-20 rounded w-full" style={{ backgroundColor: C.muted }} />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ backgroundColor: C.primary, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs ml-2" style={{ color: C.mutedFg }}>AI is thinking...</span>
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function Page() {
  const [section, setSection] = useState<Section>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // KB Upload State
  const [kbUploading, setKbUploading] = useState(false)
  const [kbMessage, setKbMessage] = useState('')

  // Underwriting State
  const [uwForm, setUwForm] = useState<UnderwritingForm>({
    applicantName: 'PT Maju Bersama',
    companyReg: 'AHU-0012345.AH.01.01',
    npwp: '01.234.567.8-012.000',
    industry: 'Construction',
    productType: 'Surety Bond',
    coverageAmount: '5000000000',
    tenor: '12',
  })
  const [uwStep, setUwStep] = useState(0)
  const [uwLoading, setUwLoading] = useState(false)
  const [uwRiskResult, setUwRiskResult] = useState<Record<string, unknown> | null>(null)
  const [uwPolicyLoading, setUwPolicyLoading] = useState(false)
  const [uwPolicyResult, setUwPolicyResult] = useState<Record<string, unknown> | null>(null)
  const [uwDocs, setUwDocs] = useState<string[]>(['KTP_Direktur.pdf', 'Laporan_Keuangan_2025.pdf', 'SIUP_NIB.pdf', 'Akta_Perusahaan.pdf'])

  // Claims State
  const [claimForm, setClaimForm] = useState<ClaimForm>({
    policyNumber: 'POL-2024-00847',
    claimType: 'Performance Bond Default',
    incidentDate: '2026-02-10',
    claimedAmount: '450000000',
    description: 'The contractor failed to complete the construction project within the agreed timeline. Project was delayed by 6 months with only 45% completion. The obligee is claiming the full bond amount due to contractor default.',
  })
  const [claimStep, setClaimStep] = useState(0)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimFraudResult, setClaimFraudResult] = useState<Record<string, unknown> | null>(null)
  const [claimDecisionLoading, setClaimDecisionLoading] = useState(false)
  const [claimDecisionResult, setClaimDecisionResult] = useState<Record<string, unknown> | null>(null)
  const [claimDocs, setClaimDocs] = useState<string[]>(['Incident_Report.pdf', 'Supporting_Evidence.pdf'])

  // Audit State
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(INITIAL_AUDIT)
  const [auditFilter, setAuditFilter] = useState<string>('All')
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  const addAuditEntry = useCallback((module: AuditEntry['module'], action: string, agent: string, decision: string, details?: Record<string, unknown>) => {
    setAuditLog(prev => [{
      id: `a${Date.now()}`,
      timestamp: new Date(),
      module,
      action,
      agent,
      decision,
      user: 'Admin',
      status: 'Completed',
      details,
    }, ...prev])
  }, [])

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  // ─── CHATBOT HANDLER ────────────────────────────────────────────────

  const handleSendChat = async (msg?: string) => {
    const text = msg || chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    const userMsg: ChatMessage = { id: `m${Date.now()}`, role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setChatLoading(true)
    try {
      const result = await callAIAgent(text, AGENT_IDS.PRODUCT_CHATBOT)
      let answer = ''
      let product = ''
      let confidence = ''
      if (result.success && result.response?.result) {
        const r = result.response.result as Record<string, unknown>
        answer = String(r.answer || r.text || r.message || result.response.message || 'I could not find an answer.')
        product = String(r.product_referenced || '')
        confidence = String(r.confidence || '')
      } else {
        answer = result.response?.message || result.error || 'Sorry, I could not process your question.'
      }
      const botMsg: ChatMessage = { id: `m${Date.now()}b`, role: 'bot', content: answer, timestamp: new Date(), product, confidence }
      setMessages(prev => [...prev, botMsg])
      addAuditEntry('Chatbot', 'Product Inquiry', 'Product Chatbot Agent', 'Answered', { question: text, product })
    } catch {
      setMessages(prev => [...prev, { id: `m${Date.now()}e`, role: 'bot', content: 'An error occurred. Please try again.', timestamp: new Date() }])
    }
    setChatLoading(false)
  }

  // ─── KB UPLOAD HANDLER ──────────────────────────────────────────────

  const handleKBUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setKbUploading(true)
    setKbMessage('')
    try {
      const result = await uploadAndTrainDocument(RAG_ID, file)
      if (result.success) {
        setKbMessage(`"${file.name}" uploaded and trained successfully.`)
        showNotification(`Knowledge base updated with ${file.name}`, 'success')
      } else {
        setKbMessage(`Upload failed: ${result.error || 'Unknown error'}`)
      }
    } catch {
      setKbMessage('Upload failed due to network error.')
    }
    setKbUploading(false)
    e.target.value = ''
  }

  // ─── UNDERWRITING HANDLERS ─────────────────────────────────────────

  const handleAnalyzeRisk = async () => {
    setUwLoading(true)
    setUwStep(1)
    setUwRiskResult(null)
    setUwPolicyResult(null)
    const msg = `Analyze risk for the following insurance applicant:
- Applicant Name: ${uwForm.applicantName}
- Company Registration: ${uwForm.companyReg}
- NPWP: ${uwForm.npwp}
- Industry Sector: ${uwForm.industry}
- Insurance Product: ${uwForm.productType}
- Coverage Amount: Rp ${parseInt(uwForm.coverageAmount).toLocaleString('id-ID')}
- Tenor: ${uwForm.tenor} months
- Documents Uploaded: ${uwDocs.join(', ')}

Please perform a comprehensive risk assessment including financial health analysis, industry risk evaluation, document verification, and provide a risk score with recommendation.`

    try {
      const result = await callAIAgent(msg, AGENT_IDS.UNDERWRITING_RISK)
      if (result.success && result.response?.result) {
        const data = result.response.result as Record<string, unknown>
        setUwRiskResult(data)
        setUwStep(2)
        addAuditEntry('Underwriting', 'Risk Assessment Completed', 'Underwriting Risk Analyzer', String(data.decision || 'N/A'), data)
        showNotification('Risk assessment completed successfully', 'success')
      } else {
        showNotification(result.error || 'Risk analysis failed', 'error')
        setUwStep(0)
      }
    } catch {
      showNotification('Risk analysis failed due to network error', 'error')
      setUwStep(0)
    }
    setUwLoading(false)
  }

  const handleGeneratePolicy = async () => {
    if (!uwRiskResult) return
    setUwPolicyLoading(true)
    setUwStep(3)
    const msg = `Generate a complete policy draft based on the following approved risk assessment:
- Applicant: ${uwForm.applicantName}
- Product Type: ${uwForm.productType}
- Coverage Amount: Rp ${parseInt(uwForm.coverageAmount).toLocaleString('id-ID')}
- Tenor: ${uwForm.tenor} months
- Risk Score: ${uwRiskResult.risk_score}/100
- Risk Level: ${uwRiskResult.risk_level}
- Decision: ${uwRiskResult.decision}
- Rationale: ${uwRiskResult.recommendation_rationale}
- Suggested Conditions: ${uwRiskResult.suggested_conditions}

Generate complete policy terms, premium calculation, conditions, and exclusions.`

    try {
      const result = await callAIAgent(msg, AGENT_IDS.POLICY_DRAFT)
      if (result.success && result.response?.result) {
        const data = result.response.result as Record<string, unknown>
        setUwPolicyResult(data)
        addAuditEntry('Underwriting', 'Policy Draft Generated', 'Policy Draft Agent', 'Draft Created', data)
        showNotification('Policy draft generated successfully', 'success')
      } else {
        showNotification(result.error || 'Policy generation failed', 'error')
        setUwStep(2)
      }
    } catch {
      showNotification('Policy generation failed', 'error')
      setUwStep(2)
    }
    setUwPolicyLoading(false)
  }

  // ─── CLAIMS HANDLERS ──────────────────────────────────────────────

  const handleProcessClaim = async () => {
    setClaimLoading(true)
    setClaimStep(1)
    setClaimFraudResult(null)
    setClaimDecisionResult(null)
    const msg = `Analyze the following insurance claim for potential fraud:
- Policy Number: ${claimForm.policyNumber}
- Claim Type: ${claimForm.claimType}
- Incident Date: ${claimForm.incidentDate}
- Claimed Amount: Rp ${parseInt(claimForm.claimedAmount).toLocaleString('id-ID')}
- Description: ${claimForm.description}
- Evidence Documents: ${claimDocs.join(', ')}

Perform comprehensive fraud analysis including timing indicators, financial indicators, pattern analysis, and document verification.`

    try {
      const result = await callAIAgent(msg, AGENT_IDS.CLAIM_FRAUD)
      if (result.success && result.response?.result) {
        const data = result.response.result as Record<string, unknown>
        setClaimFraudResult(data)
        setClaimStep(2)
        addAuditEntry('Claims', 'Fraud Analysis Completed', 'Claim Fraud Detector', String(data.risk_level || 'N/A'), data)
        showNotification('Fraud analysis completed', 'success')
      } else {
        showNotification(result.error || 'Fraud analysis failed', 'error')
        setClaimStep(0)
      }
    } catch {
      showNotification('Fraud analysis failed', 'error')
      setClaimStep(0)
    }
    setClaimLoading(false)
  }

  const handleGenerateClaimDecision = async () => {
    if (!claimFraudResult) return
    setClaimDecisionLoading(true)
    setClaimStep(3)
    const msg = `Generate a final claim adjudication decision based on the following fraud analysis:
- Policy Number: ${claimForm.policyNumber}
- Claim Type: ${claimForm.claimType}
- Claimed Amount: Rp ${parseInt(claimForm.claimedAmount).toLocaleString('id-ID')}
- Fraud Score: ${claimFraudResult.fraud_score}%
- Risk Level: ${claimFraudResult.risk_level}
- Overall Assessment: ${claimFraudResult.overall_assessment}
- Recommended Actions: ${claimFraudResult.recommended_actions}

Provide a clear decision with payout calculation, rationale, conditions, and compliance status.`

    try {
      const result = await callAIAgent(msg, AGENT_IDS.CLAIM_DECISION)
      if (result.success && result.response?.result) {
        const data = result.response.result as Record<string, unknown>
        setClaimDecisionResult(data)
        addAuditEntry('Claims', 'Claim Decision Generated', 'Claim Decision Agent', String(data.decision_label || data.decision || 'N/A'), data)
        showNotification('Claim decision generated', 'success')
      } else {
        showNotification(result.error || 'Decision generation failed', 'error')
        setClaimStep(2)
      }
    } catch {
      showNotification('Decision generation failed', 'error')
      setClaimStep(2)
    }
    setClaimDecisionLoading(false)
  }

  // ─── SIDEBAR ───────────────────────────────────────────────────────

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiHome size={20} /> },
    { key: 'chatbot', label: 'Chatbot', icon: <FiMessageSquare size={20} /> },
    { key: 'underwriting', label: 'Underwriting', icon: <FiShield size={20} /> },
    { key: 'claims', label: 'Claims', icon: <FiAlertTriangle size={20} /> },
    { key: 'audit', label: 'Audit Log', icon: <FiList size={20} /> },
  ]

  // ─── RENDER ────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: C.bg, color: C.fg, letterSpacing: '0.01em', lineHeight: '1.65' }}>
      {/* NOTIFICATION BAR */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium max-w-md animate-in slide-in-from-right"
          style={{
            backgroundColor: notification.type === 'success' ? '#16a34a' : notification.type === 'error' ? C.destructive : C.primary,
            color: '#fff',
          }}>
          {notification.type === 'success' ? <FiCheckCircle size={16} /> : notification.type === 'error' ? <FiXCircle size={16} /> : <FiInfo size={16} />}
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-2 opacity-70 hover:opacity-100"><FiX size={14} /></button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside
        className="flex-shrink-0 flex flex-col border-r transition-all duration-300 h-full"
        style={{
          width: sidebarOpen ? '240px' : '64px',
          backgroundColor: C.sidebarBg,
          borderColor: C.sidebarBorder,
        }}
      >
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: C.sidebarBorder }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:opacity-80">
            <FiMenu size={20} style={{ color: C.primary }} />
          </button>
          {sidebarOpen && (
            <span className="font-serif font-semibold text-sm tracking-wide" style={{ color: C.primary }}>
              Askrindo AI
            </span>
          )}
        </div>
        <nav className="flex-1 py-2">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: section === item.key ? C.primary : 'transparent',
                color: section === item.key ? C.primaryFg : C.fg,
                borderRadius: '0.5rem',
                margin: '0 8px',
                width: 'calc(100% - 16px)',
              }}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: C.sidebarBorder }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: C.primary, color: C.primaryFg }}>
              <FiUser size={14} />
            </div>
            {sidebarOpen && (
              <div>
                <p className="text-xs font-semibold">Admin User</p>
                <p className="text-[10px]" style={{ color: C.mutedFg }}>admin@askrindo.co.id</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <header className="flex items-center justify-between px-6 py-3 border-b" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
          <div>
            <h1 className="text-lg font-serif font-semibold" style={{ color: C.primary }}>Askrindo AI Assistant</h1>
            <p className="text-xs" style={{ color: C.mutedFg }}>Intelligent Insurance Operations Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
              <FiActivity size={10} className="inline mr-1" />Online
            </span>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ═══════ DASHBOARD ═══════ */}
          {section === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-semibold mb-1">Dashboard</h2>
                <p className="text-sm" style={{ color: C.mutedFg }}>Overview of all module activity</p>
              </div>

              {/* Module Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: <FiMessageSquare size={24} />, title: 'Chatbot', metric: '12', label: 'Conversations Today', trend: '+15%', trendUp: true, nav: 'chatbot' as Section },
                  { icon: <FiShield size={24} />, title: 'Underwriting', metric: '3', label: 'Cases Pending', trend: '-2 from yesterday', trendUp: false, nav: 'underwriting' as Section },
                  { icon: <FiAlertTriangle size={24} />, title: 'Claims', metric: '5', label: 'Claims in Queue', trend: '+1 new', trendUp: true, nav: 'claims' as Section },
                ].map((card, i) => (
                  <button key={i} onClick={() => setSection(card.nav)}
                    className="p-5 rounded-lg border text-left transition-all hover:shadow-md group"
                    style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: C.secondary, color: C.primary }}>{card.icon}</div>
                      <FiChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.primary }} />
                    </div>
                    <p className="text-3xl font-serif font-bold mb-0.5" style={{ color: C.primary }}>{card.metric}</p>
                    <p className="text-sm font-medium mb-1">{card.label}</p>
                    <div className="flex items-center gap-1 text-xs" style={{ color: card.trendUp ? '#16a34a' : C.accent }}>
                      {card.trendUp ? <FiTrendingUp size={12} /> : <FiArrowDown size={12} />}
                      {card.trend}
                    </div>
                  </button>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="rounded-lg border p-5" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                <h3 className="text-base font-serif font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {auditLog.slice(0, 6).map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: C.muted }}>
                      <div className="w-1 h-10 rounded-full" style={{
                        backgroundColor: entry.module === 'Chatbot' ? C.primary : entry.module === 'Underwriting' ? C.accent : C.destructive,
                      }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                            backgroundColor: entry.module === 'Chatbot' ? `${C.primary}20` : entry.module === 'Underwriting' ? `${C.accent}20` : `${C.destructive}20`,
                            color: entry.module === 'Chatbot' ? C.primary : entry.module === 'Underwriting' ? C.accent : C.destructive,
                          }}>{entry.module}</span>
                          <span className="text-sm font-medium truncate">{entry.action}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: C.mutedFg }}>{entry.agent} - {entry.user}</p>
                      </div>
                      <span className="text-xs whitespace-nowrap" style={{ color: C.mutedFg }}>
                        <FiClock size={10} className="inline mr-1" />{formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Start Chat', icon: <FiMessageSquare size={16} />, nav: 'chatbot' as Section },
                  { label: 'New Assessment', icon: <FiShield size={16} />, nav: 'underwriting' as Section },
                  { label: 'New Claim', icon: <FiAlertTriangle size={16} />, nav: 'claims' as Section },
                ].map((a, i) => (
                  <button key={i} onClick={() => setSection(a.nav)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ backgroundColor: C.primary, color: C.primaryFg }}>
                    {a.icon}{a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ CHATBOT ═══════ */}
          {section === 'chatbot' && (
            <div className="max-w-5xl mx-auto h-full flex gap-4">
              {/* Suggested Questions Panel */}
              <div className="w-56 flex-shrink-0 hidden lg:block space-y-3">
                <h3 className="text-sm font-serif font-semibold mb-2">Suggested Questions</h3>
                {[
                  'What is Surety Bond?',
                  'Credit Insurance coverage?',
                  'How to file a claim?',
                  'Customs Bond details?',
                  'Premium calculation?',
                  'KUR insurance requirements?',
                ].map((q, i) => (
                  <button key={i} onClick={() => handleSendChat(q)}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-lg border transition-all hover:shadow-sm"
                    style={{ backgroundColor: C.card, borderColor: C.sidebarBorder, color: C.fg }}>
                    {q}
                  </button>
                ))}

                {/* KB Upload Section */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: C.sidebarBorder }}>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: C.mutedFg }}>Knowledge Base</h4>
                  <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border cursor-pointer transition hover:shadow-sm"
                    style={{ backgroundColor: C.secondary, borderColor: C.sidebarBorder }}>
                    <FiUpload size={12} />
                    {kbUploading ? 'Uploading...' : 'Upload Document'}
                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleKBUpload} disabled={kbUploading} />
                  </label>
                  {kbMessage && <p className="text-[10px] mt-1.5" style={{ color: C.mutedFg }}>{kbMessage}</p>}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col rounded-lg border overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: C.sidebarBorder }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: C.primary, color: C.primaryFg }}>
                    <FiMessageSquare size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Product Advisor</p>
                    <p className="text-[10px]" style={{ color: C.mutedFg }}>Askrindo Insurance Products</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: C.bg }}>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                      <FiMessageSquare size={40} style={{ color: C.mutedFg }} />
                      <p className="text-sm mt-3 font-medium">Ask about Askrindo Products</p>
                      <p className="text-xs mt-1" style={{ color: C.mutedFg }}>Type a question or select from suggestions</p>
                    </div>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user' ? '' : ''}`}
                        style={{
                          backgroundColor: msg.role === 'user' ? C.primary : C.card,
                          color: msg.role === 'user' ? C.primaryFg : C.fg,
                          borderTopRightRadius: msg.role === 'user' ? '4px' : undefined,
                          borderTopLeftRadius: msg.role === 'bot' ? '4px' : undefined,
                        }}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className="flex items-center justify-between mt-2 gap-3">
                          <span className="text-[10px] opacity-60">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.role === 'bot' && msg.product && msg.product !== 'N/A' && msg.product !== 'None' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: C.secondary, color: C.accent }}>
                              {msg.product}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && <TypingIndicator />}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: C.sidebarBorder, backgroundColor: C.card }}>
                  <input
                    type="text" value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask about Askrindo products..."
                    className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none transition focus:ring-2"
                    style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }}
                    disabled={chatLoading}
                  />
                  <button onClick={() => handleSendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: C.primary, color: C.primaryFg }}>
                    <FiSend size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ UNDERWRITING ═══════ */}
          {section === 'underwriting' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-semibold">Underwriting Assessment</h2>
                  <p className="text-sm" style={{ color: C.mutedFg }}>Risk analysis and policy generation</p>
                </div>
                <button onClick={() => { setUwStep(0); setUwRiskResult(null); setUwPolicyResult(null) }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition hover:shadow-sm"
                  style={{ borderColor: C.muted }}>
                  <FiRefreshCw size={12} />New Assessment
                </button>
              </div>

              <StepProgress steps={['Submit', 'Analyze', 'Review', 'Decision']} current={uwStep} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Form */}
                <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                  <h3 className="text-base font-serif font-semibold flex items-center gap-2">
                    <FiFileText size={16} style={{ color: C.primary }} />Applicant Information
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Applicant Name</label>
                      <input type="text" value={uwForm.applicantName} onChange={e => setUwForm(f => ({ ...f, applicantName: e.target.value }))}
                        className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                        style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Company Registration</label>
                        <input type="text" value={uwForm.companyReg} onChange={e => setUwForm(f => ({ ...f, companyReg: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>NPWP</label>
                        <input type="text" value={uwForm.npwp} onChange={e => setUwForm(f => ({ ...f, npwp: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Industry Sector</label>
                        <select value={uwForm.industry} onChange={e => setUwForm(f => ({ ...f, industry: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }}>
                          {['Construction', 'Manufacturing', 'Services', 'Mining', 'Agriculture', 'Trading'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Product Type</label>
                        <select value={uwForm.productType} onChange={e => setUwForm(f => ({ ...f, productType: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }}>
                          {['Surety Bond', 'Credit Insurance', 'Customs Bond', 'Trade Credit Insurance', 'Kontra Bank Garansi'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Coverage Amount (Rp)</label>
                        <input type="text" value={formatRupiah(uwForm.coverageAmount)} onChange={e => setUwForm(f => ({ ...f, coverageAmount: e.target.value.replace(/\D/g, '') }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Tenor (months)</label>
                        <input type="text" value={uwForm.tenor} onChange={e => setUwForm(f => ({ ...f, tenor: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                      </div>
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: C.mutedFg }}>Uploaded Documents</label>
                    <div className="space-y-1.5">
                      {uwDocs.map((doc, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: C.bg, borderColor: C.muted }}>
                          <FiFile size={12} style={{ color: C.primary }} />
                          <span className="flex-1">{doc}</span>
                          <FiCheckCircle size={12} style={{ color: '#16a34a' }} />
                        </div>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center justify-center gap-2 text-xs px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition hover:shadow-sm"
                      style={{ borderColor: C.muted, color: C.mutedFg }}>
                      <FiUpload size={14} />Upload Additional Documents
                      <input type="file" className="hidden" onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) setUwDocs(prev => [...prev, f.name])
                        e.target.value = ''
                      }} />
                    </label>
                  </div>

                  <button onClick={handleAnalyzeRisk} disabled={uwLoading || uwStep > 0}
                    className="w-full py-3 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: C.primary, color: C.primaryFg }}>
                    {uwLoading ? <><FiRefreshCw size={14} className="animate-spin" />Analyzing...</> : <><FiShield size={14} />Analyze Risk</>}
                  </button>
                </div>

                {/* RIGHT: Results */}
                <div className="space-y-4">
                  {uwStep === 0 && !uwLoading && (
                    <div className="rounded-lg border p-12 flex flex-col items-center justify-center text-center"
                      style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                      <FiShield size={48} style={{ color: C.muted }} />
                      <p className="text-sm font-medium mt-4">Ready for Analysis</p>
                      <p className="text-xs mt-1" style={{ color: C.mutedFg }}>Complete the form and click "Analyze Risk" to begin</p>
                    </div>
                  )}

                  {uwLoading && <SkeletonCard />}

                  {/* Risk Assessment */}
                  {uwRiskResult && (
                    <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-serif font-semibold">Risk Assessment</h3>
                        <DecisionBadge decision={String(uwRiskResult.decision || '')} />
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <ScoreGauge
                            score={Number(uwRiskResult.risk_score) || 0}
                            label="Risk Score"
                            color={Number(uwRiskResult.risk_score) >= 75 ? '#16a34a' : Number(uwRiskResult.risk_score) >= 50 ? C.accent : C.destructive}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-xs" style={{ color: C.mutedFg }}>Risk Level</span>
                            <p className="text-sm font-semibold">{String(uwRiskResult.risk_level)}</p>
                          </div>
                          <div>
                            <span className="text-xs" style={{ color: C.mutedFg }}>Applicant</span>
                            <p className="text-sm">{String(uwRiskResult.applicant_summary || uwForm.applicantName)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Key Findings */}
                      <div>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: C.mutedFg }}>Key Findings</h4>
                        <div className="space-y-1.5">
                          {safeParseJSON(String(uwRiskResult.key_findings || '[]')).map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded" style={{ backgroundColor: C.bg }}>
                              <FiChevronRight size={10} className="mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
                              <span>{typeof f === 'object' ? JSON.stringify(f) : String(f)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial Analysis */}
                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Financial Analysis</h4>
                        <p className="text-xs leading-relaxed" style={{ color: C.fg }}>{String(uwRiskResult.financial_analysis || '')}</p>
                      </div>

                      {/* Industry Risk */}
                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Industry Risk Assessment</h4>
                        <p className="text-xs leading-relaxed">{String(uwRiskResult.industry_risk_assessment || '')}</p>
                      </div>

                      {/* Document Verification */}
                      <div>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: C.mutedFg }}>Document Verification</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                          {safeParseJSON(String(uwRiskResult.document_verification || '[]')).map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded" style={{ backgroundColor: C.bg }}>
                              <FiCheckCircle size={10} style={{ color: '#16a34a' }} />
                              <span>{typeof d === 'object' ? JSON.stringify(d) : String(d)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risk Factors */}
                      <div>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: C.mutedFg }}>Risk Factors</h4>
                        <div className="space-y-1">
                          {safeParseJSON(String(uwRiskResult.risk_factors || '[]')).map((r, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded" style={{ backgroundColor: C.bg }}>
                              <FiAlertCircle size={10} className="mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
                              <span>{typeof r === 'object' ? JSON.stringify(r) : String(r)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rationale */}
                      <div className="p-3 rounded-lg" style={{ backgroundColor: C.bg }}>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Recommendation Rationale</h4>
                        <p className="text-xs leading-relaxed">{String(uwRiskResult.recommendation_rationale || '')}</p>
                      </div>

                      {/* Conditions */}
                      {uwRiskResult.suggested_conditions && (
                        <div className="p-3 rounded-lg border" style={{ backgroundColor: C.bg, borderColor: C.accent + '40' }}>
                          <h4 className="text-xs font-semibold mb-1" style={{ color: C.accent }}>Suggested Conditions</h4>
                          <p className="text-xs leading-relaxed">{String(uwRiskResult.suggested_conditions)}</p>
                        </div>
                      )}

                      {/* Generate Policy Button */}
                      {!uwPolicyResult && (
                        <button onClick={handleGeneratePolicy} disabled={uwPolicyLoading}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ backgroundColor: C.accent, color: C.accentFg }}>
                          {uwPolicyLoading ? <><FiRefreshCw size={14} className="animate-spin" />Generating...</> : <><FiFileText size={14} />Generate Policy Draft</>}
                        </button>
                      )}
                    </div>
                  )}

                  {uwPolicyLoading && <SkeletonCard />}

                  {/* Policy Draft */}
                  {uwPolicyResult && (
                    <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-serif font-semibold">Policy Draft</h3>
                        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                          {String(uwPolicyResult.policy_number || '')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Policy Type', value: uwPolicyResult.policy_type },
                          { label: 'Policyholder', value: uwPolicyResult.policyholder },
                          { label: 'Effective Date', value: uwPolicyResult.effective_date },
                          { label: 'Expiry Date', value: uwPolicyResult.expiry_date },
                          { label: 'Coverage Amount', value: uwPolicyResult.coverage_amount },
                          { label: 'Total Premium', value: uwPolicyResult.total_premium },
                        ].map((f, i) => (
                          <div key={i} className="p-2 rounded" style={{ backgroundColor: C.bg }}>
                            <span className="text-[10px] block" style={{ color: C.mutedFg }}>{f.label}</span>
                            <span className="text-xs font-medium">{String(f.value || 'N/A')}</span>
                          </div>
                        ))}
                      </div>

                      {[
                        { label: 'Coverage Details', value: uwPolicyResult.coverage_details },
                        { label: 'Premium Calculation', value: uwPolicyResult.premium_calculation },
                        { label: 'Payment Terms', value: uwPolicyResult.payment_terms },
                        { label: 'Terms & Conditions', value: uwPolicyResult.terms_and_conditions },
                        { label: 'Exclusions', value: uwPolicyResult.exclusions },
                        { label: 'Special Provisions', value: uwPolicyResult.special_provisions },
                      ].map((s, i) => (
                        <div key={i}>
                          <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>{s.label}</h4>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{String(s.value || 'N/A')}</p>
                        </div>
                      ))}

                      <div className="flex gap-3">
                        <button onClick={() => { addAuditEntry('Underwriting', 'Policy Approved', 'Admin', 'Approved'); showNotification('Policy approved and logged', 'success') }}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                          <FiCheck size={14} />Approve
                        </button>
                        <button onClick={() => { addAuditEntry('Underwriting', 'Policy Rejected', 'Admin', 'Rejected'); showNotification('Policy rejected and logged', 'info') }}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 border flex items-center justify-center gap-2"
                          style={{ borderColor: C.destructive, color: C.destructive }}>
                          <FiX size={14} />Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ CLAIMS ═══════ */}
          {section === 'claims' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-semibold">Claims Processing</h2>
                  <p className="text-sm" style={{ color: C.mutedFg }}>Fraud detection and claim adjudication</p>
                </div>
                <button onClick={() => { setClaimStep(0); setClaimFraudResult(null); setClaimDecisionResult(null) }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition hover:shadow-sm"
                  style={{ borderColor: C.muted }}>
                  <FiRefreshCw size={12} />New Claim
                </button>
              </div>

              <StepProgress steps={['Submit', 'Fraud Check', 'Review', 'Decision']} current={claimStep} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Form */}
                <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                  <h3 className="text-base font-serif font-semibold flex items-center gap-2">
                    <FiAlertTriangle size={16} style={{ color: C.primary }} />Claim Details
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Policy Number</label>
                      <input type="text" value={claimForm.policyNumber} onChange={e => setClaimForm(f => ({ ...f, policyNumber: e.target.value }))}
                        className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                        style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Claim Type</label>
                        <select value={claimForm.claimType} onChange={e => setClaimForm(f => ({ ...f, claimType: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }}>
                          {['Performance Bond Default', 'Credit Default', 'Payment Guarantee', 'Property Damage', 'Customs Duty Claim'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Incident Date</label>
                        <input type="date" value={claimForm.incidentDate} onChange={e => setClaimForm(f => ({ ...f, incidentDate: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                          style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Claimed Amount (Rp)</label>
                      <input type="text" value={formatRupiah(claimForm.claimedAmount)} onChange={e => setClaimForm(f => ({ ...f, claimedAmount: e.target.value.replace(/\D/g, '') }))}
                        className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                        style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: C.mutedFg }}>Description</label>
                      <textarea value={claimForm.description} onChange={e => setClaimForm(f => ({ ...f, description: e.target.value }))}
                        rows={4} className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
                        style={{ backgroundColor: C.bg, borderColor: C.muted, color: C.fg }} />
                      <span className="text-[10px] block text-right mt-0.5" style={{ color: C.mutedFg }}>{claimForm.description.length} characters</span>
                    </div>
                  </div>

                  {/* Evidence Documents */}
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: C.mutedFg }}>Evidence Documents</label>
                    <div className="space-y-1.5">
                      {claimDocs.map((doc, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: C.bg, borderColor: C.muted }}>
                          <FiFile size={12} style={{ color: C.primary }} />
                          <span className="flex-1">{doc}</span>
                          <FiCheckCircle size={12} style={{ color: '#16a34a' }} />
                        </div>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center justify-center gap-2 text-xs px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition hover:shadow-sm"
                      style={{ borderColor: C.muted, color: C.mutedFg }}>
                      <FiUpload size={14} />Upload Evidence
                      <input type="file" className="hidden" onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) setClaimDocs(prev => [...prev, f.name])
                        e.target.value = ''
                      }} />
                    </label>
                  </div>

                  <button onClick={handleProcessClaim} disabled={claimLoading || claimStep > 0}
                    className="w-full py-3 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: C.primary, color: C.primaryFg }}>
                    {claimLoading ? <><FiRefreshCw size={14} className="animate-spin" />Processing...</> : <><FiSearch size={14} />Process Claim</>}
                  </button>
                </div>

                {/* RIGHT: Results */}
                <div className="space-y-4">
                  {claimStep === 0 && !claimLoading && (
                    <div className="rounded-lg border p-12 flex flex-col items-center justify-center text-center"
                      style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                      <FiAlertTriangle size={48} style={{ color: C.muted }} />
                      <p className="text-sm font-medium mt-4">Ready for Processing</p>
                      <p className="text-xs mt-1" style={{ color: C.mutedFg }}>Fill the claim form and click "Process Claim" to begin fraud analysis</p>
                    </div>
                  )}

                  {claimLoading && <SkeletonCard />}

                  {/* Fraud Assessment */}
                  {claimFraudResult && (
                    <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-serif font-semibold">Fraud Assessment</h3>
                        <DecisionBadge decision={String(claimFraudResult.risk_level || '')} />
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <ScoreGauge
                            score={Number(claimFraudResult.fraud_score) || 0}
                            label="Fraud Score"
                            color={Number(claimFraudResult.fraud_score) <= 25 ? '#16a34a' : Number(claimFraudResult.fraud_score) <= 50 ? C.accent : C.destructive}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-xs" style={{ color: C.mutedFg }}>Risk Level</span>
                            <p className="text-sm font-semibold">{String(claimFraudResult.risk_level)}</p>
                          </div>
                          <div>
                            <span className="text-xs" style={{ color: C.mutedFg }}>Claim</span>
                            <p className="text-sm">{String(claimFraudResult.claim_summary || '')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Analysis Sections */}
                      {[
                        { label: 'Timing Analysis', value: claimFraudResult.timing_analysis, icon: <FiClock size={10} /> },
                        { label: 'Financial Analysis', value: claimFraudResult.financial_analysis, icon: <FiActivity size={10} /> },
                        { label: 'Pattern Analysis', value: claimFraudResult.pattern_analysis, icon: <FiSearch size={10} /> },
                        { label: 'Document Analysis', value: claimFraudResult.document_analysis, icon: <FiFileText size={10} /> },
                      ].map((s, i) => (
                        <div key={i}>
                          <h4 className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: C.mutedFg }}>
                            {s.icon}{s.label}
                          </h4>
                          <p className="text-xs leading-relaxed">{String(s.value || '')}</p>
                        </div>
                      ))}

                      {/* Fraud Indicators */}
                      <div>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: C.mutedFg }}>Fraud Indicators</h4>
                        <div className="space-y-1">
                          {safeParseJSON(String(claimFraudResult.fraud_indicators || '[]')).map((ind, i) => {
                            const indStr = typeof ind === 'object' ? JSON.stringify(ind) : String(ind)
                            const isClear = indStr.toLowerCase().includes('clear') || indStr.toLowerCase().includes('pass') || indStr.toLowerCase().includes('low')
                            return (
                              <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded" style={{ backgroundColor: C.bg }}>
                                {isClear ? <FiCheckCircle size={10} className="mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} /> : <FiAlertCircle size={10} className="mt-0.5 flex-shrink-0" style={{ color: C.accent }} />}
                                <span>{indStr}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Red Flags */}
                      {(() => {
                        const flags = safeParseJSON(String(claimFraudResult.red_flags || '[]'))
                        const hasFlags = flags.length > 0 && !(flags.length === 1 && (flags[0] === '' || flags[0] === '[]' || String(flags[0]).toLowerCase().includes('none') || String(flags[0]).toLowerCase().includes('no red')))
                        return hasFlags ? (
                          <div className="p-3 rounded-lg border" style={{ backgroundColor: `${C.destructive}08`, borderColor: `${C.destructive}30` }}>
                            <h4 className="text-xs font-semibold mb-1.5" style={{ color: C.destructive }}>Red Flags</h4>
                            {flags.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs mb-1">
                                <FiAlertTriangle size={10} className="mt-0.5 flex-shrink-0" style={{ color: C.destructive }} />
                                <span>{typeof f === 'object' ? JSON.stringify(f) : String(f)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null
                      })()}

                      {/* Overall Assessment */}
                      <div className="p-3 rounded-lg" style={{ backgroundColor: C.bg }}>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Overall Assessment</h4>
                        <p className="text-xs leading-relaxed">{String(claimFraudResult.overall_assessment || '')}</p>
                      </div>

                      {/* Recommended Actions */}
                      <div className="p-3 rounded-lg border" style={{ backgroundColor: C.bg, borderColor: C.accent + '40' }}>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.accent }}>Recommended Actions</h4>
                        <p className="text-xs leading-relaxed">{String(claimFraudResult.recommended_actions || '')}</p>
                      </div>

                      {!claimDecisionResult && (
                        <button onClick={handleGenerateClaimDecision} disabled={claimDecisionLoading}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ backgroundColor: C.accent, color: C.accentFg }}>
                          {claimDecisionLoading ? <><FiRefreshCw size={14} className="animate-spin" />Generating...</> : <><FiFileText size={14} />Generate Decision</>}
                        </button>
                      )}
                    </div>
                  )}

                  {claimDecisionLoading && <SkeletonCard />}

                  {/* Claim Decision */}
                  {claimDecisionResult && (
                    <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-serif font-semibold">Adjudication Decision</h3>
                        <DecisionBadge decision={String(claimDecisionResult.decision_label || claimDecisionResult.decision || '')} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Claimed Amount', value: claimDecisionResult.claimed_amount },
                          { label: 'Approved Amount', value: claimDecisionResult.approved_amount },
                          { label: 'Deductible', value: claimDecisionResult.deductible_applied },
                          { label: 'Net Payout', value: claimDecisionResult.net_payout },
                        ].map((f, i) => (
                          <div key={i} className="p-2 rounded" style={{ backgroundColor: C.bg }}>
                            <span className="text-[10px] block" style={{ color: C.mutedFg }}>{f.label}</span>
                            <span className="text-xs font-semibold">{String(f.value || 'N/A')}</span>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Payout Breakdown</h4>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{String(claimDecisionResult.payout_breakdown || '')}</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Decision Rationale</h4>
                        <p className="text-xs leading-relaxed">{String(claimDecisionResult.decision_rationale || '')}</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Fraud Reference</h4>
                        <p className="text-xs leading-relaxed">{String(claimDecisionResult.fraud_reference || '')}</p>
                      </div>

                      {claimDecisionResult.conditions && (
                        <div className="p-3 rounded-lg border" style={{ backgroundColor: C.bg, borderColor: C.accent + '40' }}>
                          <h4 className="text-xs font-semibold mb-1" style={{ color: C.accent }}>Conditions</h4>
                          <p className="text-xs leading-relaxed">{String(claimDecisionResult.conditions)}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Compliance Status</h4>
                        <p className="text-xs leading-relaxed">{String(claimDecisionResult.compliance_status || '')}</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold mb-1" style={{ color: C.mutedFg }}>Next Steps</h4>
                        <p className="text-xs leading-relaxed">{String(claimDecisionResult.next_steps || '')}</p>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => { addAuditEntry('Claims', 'Claim Approved', 'Admin', String(claimDecisionResult.decision_label || '')); showNotification('Claim approved and logged', 'success') }}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                          <FiCheck size={14} />Approve
                        </button>
                        <button onClick={() => { addAuditEntry('Claims', 'Claim Escalated', 'Admin', 'Escalated'); showNotification('Claim escalated for senior review', 'info') }}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 border flex items-center justify-center gap-2"
                          style={{ borderColor: '#a855f7', color: '#a855f7' }}>
                          <FiArrowUp size={14} />Escalate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ AUDIT LOG ═══════ */}
          {section === 'audit' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-semibold">Audit Log</h2>
                  <p className="text-sm" style={{ color: C.mutedFg }}>Complete audit trail of all AI-assisted operations</p>
                </div>
                <button disabled className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border opacity-50 cursor-not-allowed"
                  style={{ borderColor: C.muted }} title="Coming Soon">
                  <FiDownload size={12} />Export
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                  <FiFilter size={12} style={{ color: C.mutedFg }} />
                  <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)}
                    className="text-xs bg-transparent outline-none" style={{ color: C.fg }}>
                    {['All', 'Chatbot', 'Underwriting', 'Claims'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <span className="text-xs" style={{ color: C.mutedFg }}>
                  {auditLog.filter(e => auditFilter === 'All' || e.module === auditFilter).length} entries
                </span>
              </div>

              {/* Table */}
              <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.sidebarBorder }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: C.secondary }}>
                        {['', 'Timestamp', 'Module', 'Action', 'Agent', 'Decision', 'User', 'Status'].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-left font-semibold" style={{ color: C.mutedFg }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog
                        .filter(e => auditFilter === 'All' || e.module === auditFilter)
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                        .map(entry => (
                          <React.Fragment key={entry.id}>
                            <tr className="border-t cursor-pointer hover:opacity-90 transition"
                              style={{ borderColor: C.muted }}
                              onClick={() => setExpandedAudit(expandedAudit === entry.id ? null : entry.id)}>
                              <td className="px-3 py-2.5">
                                {expandedAudit === entry.id ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                              <td className="px-3 py-2.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                                  backgroundColor: entry.module === 'Chatbot' ? `${C.primary}20` : entry.module === 'Underwriting' ? `${C.accent}20` : `${C.destructive}15`,
                                  color: entry.module === 'Chatbot' ? C.primary : entry.module === 'Underwriting' ? C.accent : C.destructive,
                                }}>{entry.module}</span>
                              </td>
                              <td className="px-3 py-2.5 font-medium">{entry.action}</td>
                              <td className="px-3 py-2.5" style={{ color: C.mutedFg }}>{entry.agent}</td>
                              <td className="px-3 py-2.5"><DecisionBadge decision={entry.decision} /></td>
                              <td className="px-3 py-2.5">{entry.user}</td>
                              <td className="px-3 py-2.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                                  backgroundColor: entry.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                                  color: entry.status === 'Completed' ? '#16a34a' : '#d97706',
                                }}>{entry.status}</span>
                              </td>
                            </tr>
                            {expandedAudit === entry.id && (
                              <tr style={{ backgroundColor: C.bg }}>
                                <td colSpan={8} className="px-6 py-4">
                                  <div className="text-xs space-y-2">
                                    <h4 className="font-semibold" style={{ color: C.mutedFg }}>Detailed Output</h4>
                                    {entry.details ? (
                                      <pre className="p-3 rounded text-[10px] overflow-x-auto whitespace-pre-wrap leading-relaxed" style={{ backgroundColor: C.card }}>
                                        {JSON.stringify(entry.details, null, 2)}
                                      </pre>
                                    ) : (
                                      <p style={{ color: C.mutedFg }}>No detailed output available for this entry.</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
