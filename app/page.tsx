"use client"

import { useState } from "react"
import { UniversitySearchChat } from "@/components/university-search-chat"
import { Header } from "@/components/header"

export default function HomePage() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header 
        isAuthenticated={isAuthenticated}
        onLoginClick={() => setLoginOpen(true)}
        onLogout={handleLogout}
      />
      <main className="container mx-auto px-4 py-8">
        <UniversitySearchChat 
          loginOpen={loginOpen}
          setLoginOpen={setLoginOpen}
          onAuthChange={setIsAuthenticated}
          onLogout={handleLogout}
        />
      </main>
    </div>
  )
}
