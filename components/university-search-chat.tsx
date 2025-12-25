"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, Loader2, Lock, Search, Sparkles, LogIn } from "lucide-react"
import { universities } from "@/lib/universities-data"

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "")
const looseMatch = (a: string, b: string) => a.includes(b) || b.includes(a)

interface ChatMessage {
  id: string
  type: "user" | "bot"
  content: string
  universities?: UniversityResult[]
}

type UniversityResult = (typeof universities)[number] & { matchContext?: string }
type University = (typeof universities)[number]
type FeeStructure = University["feeStructure"][number]

const AUTH_USER = { username: "admin", password: "password" }

const STORAGE_KEY = "oen-universities-data"

interface UniversitySearchChatProps {
  loginOpen?: boolean
  setLoginOpen?: (open: boolean) => void
  onAuthChange?: (isAuthed: boolean) => void
  onLogout?: () => void
}

export function UniversitySearchChat({ 
  loginOpen: externalLoginOpen, 
  setLoginOpen: externalSetLoginOpen,
  onAuthChange,
  onLogout: externalLogout
}: UniversitySearchChatProps = {}) {
  const [internalLoginOpen, setInternalLoginOpen] = useState(false)
  const loginOpen = externalLoginOpen ?? internalLoginOpen
  const setLoginOpen = externalSetLoginOpen ?? setInternalLoginOpen

  const [auth, setAuth] = useState({ username: "", password: "", isAuthed: false })
  const [data, setData] = useState<University[]>(universities)
  const [loginError, setLoginError] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      type: "bot",
      content:
        "Welcome to Optimal Fees Structure (OEN)! 🔍 Search for courses and explore fee structures from multiple universities. Please login to get started.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load persisted data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as University[]
        setData(parsed)
      } catch (e) {
        console.error("Failed to parse saved data", e)
      }
    }
  }, [])

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Sync auth state with parent
  useEffect(() => {
    if (onAuthChange) {
      onAuthChange(auth.isAuthed)
    }
  }, [auth.isAuthed, onAuthChange])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    const match =
      AUTH_USER.username === auth.username.trim() && AUTH_USER.password === auth.password.trim()
    if (match) {
      setAuth((prev) => ({ ...prev, isAuthed: true }))
      setLoginOpen(false)
      if (onAuthChange) onAuthChange(true)
      setMessages([
        {
          id: "welcome",
          type: "bot",
          content: "Welcome back! 🎉 You're now logged in. Start searching for courses and fee structures!",
        },
      ])
    } else {
      setLoginError("Invalid username or password. Please try again.")
    }
  }

  const handleLogout = () => {
    setAuth({ username: "", password: "", isAuthed: false })
    if (onAuthChange) onAuthChange(false)
    if (externalLogout) externalLogout()
    setMessages([
      {
        id: "welcome",
        type: "bot",
        content: "You have been logged out. Please login again to search.",
      },
    ])
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.isAuthed) {
      setLoginOpen(true)
      return
    }
    if (!input.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate processing
    setTimeout(() => {
      const searchTermRaw = input.trim().toLowerCase()
      const searchTerm = normalize(searchTermRaw)
      const results: UniversityResult[] = data
        .map((uni) => {
          const uniName = normalize(uni.name)
          const uniLocation = normalize(uni.location)
          const matchesName = looseMatch(uniName, searchTerm) || uni.name.toLowerCase().includes(searchTermRaw)
          const matchesLocation = looseMatch(uniLocation, searchTerm) || uni.location.toLowerCase().includes(searchTermRaw)
          const matchingCourses = uni.courses.filter((course) => {
            const cNorm = normalize(course)
            const cLow = course.toLowerCase()
            return looseMatch(cNorm, searchTerm) || cLow.includes(searchTermRaw)
          })
          const matchingProgrammeEntries = uni.feeStructure.filter((fee) => {
            const lvlNorm = normalize(fee.level)
            const lvlLow = fee.level.toLowerCase()
            return looseMatch(lvlNorm, searchTerm) || lvlLow.includes(searchTermRaw)
          })

          if (matchesName || matchesLocation || matchingCourses.length > 0 || matchingProgrammeEntries.length > 0) {
            const matchBits = []
            if (matchesName) matchBits.push("university name")
            if (matchesLocation) matchBits.push("location")
            if (matchingCourses.length > 0) matchBits.push(`course: ${matchingCourses.join(", ")}`)
            if (matchingProgrammeEntries.length > 0) matchBits.push(`programme: ${matchingProgrammeEntries.map((p) => p.level).join(", ")}`)

            // If programme match exists, only show those programmes for clarity
            const feeStructure = matchingProgrammeEntries.length > 0 ? matchingProgrammeEntries : uni.feeStructure

            return { ...uni, feeStructure, matchContext: matchBits.join(" · ") }
          }
          return null
        })
        .filter((uni): uni is UniversityResult => Boolean(uni))

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content:
          results.length > 0
            ? `Found ${results.length} university/universities matching "${input}". Here are the details:`
            : `I couldn't find any universities matching "${input}". Try searching for a different university name, location, or course.`,
        universities: results.length > 0 ? results : undefined,
      }
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
    }, 500)
  }

  return (
    <>
      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Welcome to OEN
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Please login to access the course fee search system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-slate-200">
                Username
              </label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={auth.username}
                onChange={(e) => {
                  setAuth((p) => ({ ...p, username: e.target.value }))
                  setLoginError("")
                }}
                className="h-11 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-200">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={auth.password}
                onChange={(e) => {
                  setAuth((p) => ({ ...p, password: e.target.value }))
                  setLoginError("")
                }}
                className="h-11 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md p-3">
                {loginError}
              </div>
            )}
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
            <p className="text-xs text-center text-slate-400">
              Default: username: <span className="font-mono">admin</span>, password: <span className="font-mono">password</span>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto">
        <Card className="flex flex-col h-[600px] shadow-xl border border-slate-700 overflow-hidden bg-slate-800">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl ${
                  message.type === "user"
                    ? "bg-blue-600 text-white rounded-lg rounded-tr-none"
                    : "bg-slate-700 text-slate-100 rounded-lg rounded-tl-none border border-slate-600"
                } px-4 py-3`}
              >
                <p className="text-sm mb-2">{message.content}</p>

                {/* Universities Display */}
                {message.universities && message.universities.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {message.universities.map((uni) => (
                      <UniversityCard key={uni.id} university={uni} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-slate-100 rounded-lg rounded-tl-none border border-slate-600 px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm">Searching universities...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700 bg-slate-800 p-4 shadow-lg">
          {!auth.isAuthed ? (
            <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-lg border border-blue-700">
              <Lock className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">Please login to search</p>
                <p className="text-xs text-slate-400">Click the login button in the top left to get started</p>
              </div>
              <Button
                onClick={() => setLoginOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by university name, location, or course..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="pl-10 h-12 border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </form>
              <div className="flex items-center gap-2 mt-3">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-slate-400">
                  Try searches like "computer science", "APU", or "engineering in Malaysia"
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Admin Panel - Only show when logged in */}
      {auth.isAuthed && <AdminPanel auth={auth} setAuth={setAuth} data={data} setData={setData} />}
    </div>
    </>
  )
}

interface UniversityCardProps {
  university: (typeof universities)[0]
}

function UniversityCard({ university }: UniversityCardProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  // Determine logo based on university
  const getLogoPath = () => {
    if (university.name.toLowerCase().includes("apu") || university.name.toLowerCase().includes("asia pacific")) {
      return "/images/Asia-Pacific-University-APU-e1669185752781-300x300.png"
    }
    if (university.name.toLowerCase().includes("ugm") || university.name.toLowerCase().includes("geomatika")) {
      return "/images/ugm_logo-removebg-preview.png"
    }
    if (university.name.toLowerCase().includes("nilai")) {
      return "/images/ea-inst-logo-nilai.png"
    }
    return "/mahsa-university-logo-png_seeklogo-285048.png"
  }

  // Check university for color scheme
  const isAPU = university.name.toLowerCase().includes("apu") || university.name.toLowerCase().includes("asia pacific")
  const isUGM = university.name.toLowerCase().includes("ugm") || university.name.toLowerCase().includes("geomatika")
  const isNilai = university.name.toLowerCase().includes("nilai")

  // Get color scheme based on university
  const getHeaderColor = () => {
    if (isAPU) return "bg-gradient-to-r from-green-600 to-green-700"
    if (isUGM) return "bg-gradient-to-r from-red-600 to-red-700"
    if (isNilai) return "bg-gradient-to-r from-green-600 to-slate-700"
    return "bg-gradient-to-r from-blue-600 to-blue-700"
  }
  const getTextColor = () => {
    if (isAPU) return "text-green-100"
    if (isUGM) return "text-red-100"
    if (isNilai) return "text-green-100"
    return "text-blue-100"
  }
  const getTextColorOpacity = () => {
    if (isAPU) return "text-green-100/80"
    if (isUGM) return "text-red-100/80"
    if (isNilai) return "text-green-100/80"
    return "text-blue-100/80"
  }
  const getTagColors = () => {
    if (isAPU) return "border-green-200 text-green-700"
    if (isUGM) return "border-red-200 text-red-700"
    if (isNilai) return "border-green-200 text-slate-700"
    return "border-blue-100 text-blue-700"
  }
  const getHoverColor = () => {
    if (isAPU) return "hover:bg-green-50"
    if (isUGM) return "hover:bg-red-50"
    if (isNilai) return "hover:bg-green-50"
    return "hover:bg-blue-50"
  }
  const getFeeColor = () => {
    if (isAPU) return "text-green-600"
    if (isUGM) return "text-red-600"
    if (isNilai) return "text-green-600"
    return "text-blue-600"
  }
  const getIntakeColor = () => {
    if (isAPU) return "text-green-500"
    if (isUGM) return "text-red-500"
    if (isNilai) return "text-slate-500"
    return "text-blue-500"
  }

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800">
      <div className={`${getHeaderColor()} px-4 py-3 text-white flex items-start gap-3`}>
        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white border border-white/30 flex items-center justify-center overflow-hidden">
          <img src={getLogoPath()} alt={university.name} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{university.name}</h3>
          <p className={`text-sm ${getTextColor()}`}>{university.location}</p>
          {university.matchContext && <p className={`text-xs ${getTextColorOpacity()} mt-1`}>Matched by {university.matchContext}</p>}
        </div>
      </div>
      <div className="p-4 bg-slate-800">
        <div className="flex flex-wrap gap-2 mb-4">
          {university.courses.map((course) => (
            <span key={course} className={`text-xs bg-slate-700 border ${getTagColors()} px-2 py-1 rounded-full`}>
              {course}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {university.feeStructure.map((fee, idx) => {
            const label = fee.level
            const tuition = fee.tuitionFee ?? fee.annualFee
            const summaryLine = fee.mode ? `${fee.mode} · ${fee.duration}` : fee.duration
            return (
              <div key={idx} className="bg-slate-700 rounded p-3 border border-slate-600">
                <button
                  onClick={() => setExpandedCourse(expandedCourse === label ? null : label)}
                  className={`w-full text-left flex justify-between items-center ${getHoverColor()} -mx-3 -my-3 px-3 py-3 rounded`}
                >
                  <div className="pr-3">
                    <p className="font-medium text-slate-100">{label}</p>
                    <p className="text-sm text-slate-300">{summaryLine}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getFeeColor()}`}>{tuition}</p>
                    {fee.intake2025 && <p className={`text-xs ${getIntakeColor()}`}>2025 intake: {fee.intake2025}</p>}
                  </div>
                </button>
                {expandedCourse === label && (
                  <div className="mt-3 pt-3 border-t border-slate-600 text-xs text-slate-300 space-y-1">
                    {fee.applicationFee && (
                      <p>
                        <span className="font-semibold">Application:</span> {fee.applicationFee}
                      </p>
                    )}
                    {fee.registrationFee && (
                      <p>
                        <span className="font-semibold">Registration:</span> {fee.registrationFee}
                      </p>
                    )}
                    {fee.totalYearlyFees && (
                      <p>
                        <span className="font-semibold">Total yearly fees:</span> {fee.totalYearlyFees}
                      </p>
                    )}
                    {fee.admissionFee && (
                      <p>
                        <span className="font-semibold">Admission:</span> {fee.admissionFee}
                      </p>
                    )}
                    {fee.totalFee && (
                      <p>
                        <span className="font-semibold">Total fee:</span> {fee.totalFee}
                      </p>
                    )}
                    {fee.yearBreakdown && (
                      <p>
                        <span className="font-semibold">Yearly breakdown:</span>{" "}
                        {["Y1", "Y2", "Y3", "Y4"]
                          .map((year) => fee.yearBreakdown?.[year as keyof typeof fee.yearBreakdown])
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface AdminPanelProps {
  auth: { username: string; password: string; isAuthed: boolean }
  setAuth: React.Dispatch<React.SetStateAction<{ username: string; password: string; isAuthed: boolean }>>
  data: University[]
  setData: React.Dispatch<React.SetStateAction<University[]>>
}

function AdminPanel({ auth, setAuth, data, setData }: AdminPanelProps) {
  const [selectedUniId, setSelectedUniId] = useState<string>("")
  const [newUni, setNewUni] = useState({ name: "", location: "", course: "" })
  const [program, setProgram] = useState<FeeStructure>({
    level: "",
    duration: "",
    mode: "",
    applicationFee: "",
    registrationFee: "",
    tuitionFee: "",
    totalYearlyFees: "",
    totalFee: "",
    intake2025: "",
    yearBreakdown: {},
  })

  const selectedUni = useMemo(() => data.find((u) => u.id === selectedUniId), [data, selectedUniId])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const match =
      AUTH_USER.username === auth.username.trim() && AUTH_USER.password === auth.password.trim()
    if (match) {
      setAuth((prev) => ({ ...prev, isAuthed: true }))
    } else {
      alert("Invalid credentials")
    }
  }

  const addUniversity = () => {
    if (!newUni.name || !newUni.location) return
    const newEntry: University = {
      id: String(Date.now()),
      name: newUni.name,
      location: newUni.location,
      courses: newUni.course ? [newUni.course] : [],
      feeStructure: [],
    }
    setData((prev) => [...prev, newEntry])
    setNewUni({ name: "", location: "", course: "" })
  }

  const addProgramme = () => {
    if (!selectedUni) return
    if (!program.level) return
    const updated = data.map((u) =>
      u.id === selectedUni.id
        ? { ...u, feeStructure: [...u.feeStructure, program], courses: u.courses }
        : u,
    )
    setData(updated)
    setProgram({
      level: "",
      duration: "",
      mode: "",
      applicationFee: "",
      registrationFee: "",
      tuitionFee: "",
      totalYearlyFees: "",
      totalFee: "",
      intake2025: "",
      yearBreakdown: {},
    })
  }

  return (
    <Card className="mt-6 p-4 space-y-4 bg-slate-800 border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-200">Admin</h3>
        {auth.isAuthed && <span className="text-xs text-green-400">Signed in</span>}
      </div>

      {!auth.isAuthed ? (
        <form onSubmit={handleLogin} className="flex flex-wrap gap-2">
          <Input
            placeholder="Username"
            value={auth.username}
            onChange={(e) => setAuth((p) => ({ ...p, username: e.target.value }))}
            className="w-40 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
          />
          <Input
            placeholder="Password"
            type="password"
            value={auth.password}
            onChange={(e) => setAuth((p) => ({ ...p, password: e.target.value }))}
            className="w-40 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
          />
          <Button type="submit" className="bg-blue-600 text-white">
            Sign in
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <h4 className="font-medium text-sm mb-2 text-slate-200">Add University</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={newUni.name}
                  onChange={(e) => setNewUni((p) => ({ ...p, name: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Location"
                  value={newUni.location}
                  onChange={(e) => setNewUni((p) => ({ ...p, location: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Course tag (optional)"
                  value={newUni.course}
                  onChange={(e) => setNewUni((p) => ({ ...p, course: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Button type="button" onClick={addUniversity} className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                  Add University
                </Button>
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-medium text-sm mb-2 text-slate-200">Add Programme to a University</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={selectedUniId}
                  onChange={(e) => setSelectedUniId(e.target.value)}
                  className="border border-slate-600 bg-slate-700 text-slate-100 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select university</option>
                  {data.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Programme name"
                  value={program.level}
                  onChange={(e) => setProgram((p) => ({ ...p, level: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Mode"
                  value={program.mode ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, mode: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Duration (e.g., 4.0 years)"
                  value={program.duration ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, duration: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Application fee"
                  value={program.applicationFee ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, applicationFee: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Registration fee"
                  value={program.registrationFee ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, registrationFee: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Tuition fee"
                  value={program.tuitionFee ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, tuitionFee: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Total yearly fees"
                  value={program.totalYearlyFees ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, totalYearlyFees: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="Total fee"
                  value={program.totalFee ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, totalFee: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <Input
                  placeholder="2025 intake"
                  value={program.intake2025 ?? ""}
                  onChange={(e) => setProgram((p) => ({ ...p, intake2025: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <Button
                type="button"
                onClick={addProgramme}
                className="mt-2 bg-blue-600 text-white"
                disabled={!selectedUniId}
              >
                Add Programme
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
