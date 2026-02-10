'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, Globe, BarChart3, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'hasSeenOnboarding';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

interface Slide {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

const slides: Slide[] = [
  {
    icon: <Sparkles className="h-8 w-8 text-emerald-400" />,
    title: 'Welcome to FinTrack',
    subtitle: 'Your ultimate multi-currency portfolio tracker',
    content: (
      <div className="space-y-3 text-white/60 text-sm leading-relaxed">
        <p>
          Track stocks, ETFs, crypto, and bonds across multiple currencies —
          all converted to PLN in real time.
        </p>
        <p>
          Add transactions manually or import from your broker. FinTrack
          handles the rest: live prices, exchange rates, and performance
          analytics.
        </p>
      </div>
    ),
  },
  {
    icon: <Globe className="h-8 w-8 text-blue-400" />,
    title: 'Currency Intelligence',
    subtitle: 'Multi-currency made simple',
    content: (
      <div className="space-y-3 text-white/60 text-sm leading-relaxed">
        <p>
          Every transaction keeps its original purchase currency (USD, EUR, GBP, etc.).
          FinTrack fetches live exchange rates and converts everything to your
          Base Currency <span className="text-white font-medium">(PLN)</span> automatically.
        </p>
        <p>
          Your profit/loss always reflects both asset price changes
          <span className="text-emerald-400"> and </span>
          currency movements — giving you the true picture.
        </p>
      </div>
    ),
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-purple-400" />,
    title: 'Benchmarking & Charts',
    subtitle: 'Are you beating the market?',
    content: (
      <div className="space-y-4 text-white/60 text-sm leading-relaxed">
        <p>
          The Cumulative Return chart shows your portfolio performance as a percentage
          over time. Toggle <span className="text-white font-medium">&quot;vs S&P 500&quot;</span> to
          compare against the market.
        </p>
        <div className="bg-white/5 rounded-lg p-3 space-y-2">
          <p className="text-white/80 font-medium text-xs uppercase tracking-wider">Chart Legend</p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 rounded-sm bg-emerald-500" />
            <span>Green area — Profit (return above 0%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 rounded-sm bg-rose-500" />
            <span>Red area — Loss (return below 0%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
            <span>Dashed line — S&P 500 benchmark return</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t border-dashed border-white/20" />
            <span>Thin dashed line — 0% baseline</span>
          </div>
        </div>
      </div>
    ),
  },
];

export function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    setStep(0);
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-2">
            {slide.icon}
          </div>
          <DialogTitle className="text-xl text-white">{slide.title}</DialogTitle>
          <DialogDescription className="text-white/50">{slide.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="py-2">{slide.content}</div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              className="text-white/40 hover:text-white gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white/40 hover:text-white"
            >
              Skip
            </Button>
          )}

          <Button
            onClick={handleNext}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Returns true if the user has already seen onboarding. */
export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
