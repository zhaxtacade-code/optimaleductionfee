"use client"

import { Button } from "@/components/ui/button"
import { LogIn, LogOut, User } from "lucide-react"

interface HeaderProps {
  isAuthenticated: boolean
  onLoginClick: () => void
  onLogout: () => void
}

export function Header({ isAuthenticated, onLoginClick, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-slate-700 bg-slate-800 shadow-lg sticky top-0 z-40 backdrop-blur-sm bg-slate-800/95">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={onLoginClick}
            variant="outline"
            className="flex items-center gap-2 border-blue-600 hover:bg-blue-900/50 hover:border-blue-500 text-blue-400 bg-slate-700/50"
          >
            {isAuthenticated ? (
              <>
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </>
            )}
          </Button>
          {isAuthenticated && (
            <Button
              onClick={onLogout}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative">
            <img
              src="/images/image.png"
              alt="Optimal Fees Structure (OEN)"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-300">Optimal Fees Structure</h1>
            <p className="text-xs text-blue-400">OEN Tuition Explorer</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Find the right course investment</p>
        </div>
      </div>
    </header>
  )
}
