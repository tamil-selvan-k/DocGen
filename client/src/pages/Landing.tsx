import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, GitBranch, FileText, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: GitBranch, title: 'GitHub Integration', desc: 'Connect any repo. Every push triggers automated doc generation.' },
  { icon: FileText, title: 'AI-Powered Docs', desc: 'Gemini AI reads your code diff and writes accurate, factual documentation.' },
  { icon: RefreshCw, title: 'Auto Pull Requests', desc: 'Documentation updates land as PRs for your team to review and merge.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1e2640]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100">AutoDocs AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/register" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-600/15 text-indigo-400 border border-indigo-600/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Documentation
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-slate-100 leading-tight mb-5">
            Your code ships.<br />
            <span className="gradient-text">Docs update automatically.</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
            AutoDocs AI watches your GitHub repos. Every commit triggers AI documentation generation and opens a Pull Request — zero manual work.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-6 py-3">
              Sign in
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-20 max-w-3xl w-full"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 text-left hover:border-indigo-600/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/15 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-200 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-600 border-t border-[#1e2640]">
        © {new Date().getFullYear()} AutoDocs AI. All rights reserved.
      </footer>
    </div>
  );
}
