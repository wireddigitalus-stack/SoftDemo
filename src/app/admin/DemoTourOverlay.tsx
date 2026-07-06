"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface TourStep {
  tab: string | null;
  title: string;
  description: string;
  emoji: string;
}

const tourSteps: TourStep[] = [
  {
    tab: "leads",
    title: "AI-Powered Lead Pipeline",
    description:
      "Every lead is automatically scored by Google Gemini AI. Hot leads (score 80+) get flagged for immediate follow-up. Watch for 🐋 Whale alerts on high-value prospects.",
    emoji: "🟢",
  },
  {
    tab: "tenants",
    title: "Tenant Lifecycle Management",
    description:
      "Track every tenant from lease signing to renewal. Monitor rent escalations, expiring leases, and generate QuickBooks-ready export files.",
    emoji: "👥",
  },
  {
    tab: "maintenance",
    title: "Maintenance Operations",
    description:
      "Priority-based ticket system tracks issues from report to resolution. Assign workers, track parts, and monitor response times across your portfolio.",
    emoji: "🔧",
  },
  {
    tab: "cleaning",
    title: "Cleaning & Turnover",
    description:
      "Schedule and track cleaning assignments for move-in/move-out prep and routine maintenance across all properties.",
    emoji: "✨",
  },
  {
    tab: "analytics",
    title: "Portfolio Analytics & Maps",
    description:
      "Real-time KPIs, revenue tracking, and interactive architecture maps showing how data flows through the entire platform.",
    emoji: "📊",
  },
  {
    tab: null,
    title: "Try the AI Lease-Bot!",
    description:
      "Visit the main website and click the chat bubble in the bottom-right corner. Ask about office space in Bristol — the AI will score your lead and match you to properties in real-time.",
    emoji: "🤖",
  },
];

interface DemoTourOverlayProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export default function DemoTourOverlay({
  open,
  onClose,
  onNavigate,
}: DemoTourOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!open) return null;

  const step = tourSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLast) {
      setCurrentStep(0);
      onClose();
      return;
    }
    const nextIndex = currentStep + 1;
    const nextStep = tourSteps[nextIndex];
    setCurrentStep(nextIndex);
    if (nextStep.tab) {
      onNavigate(nextStep.tab);
    }
  };

  const handleBack = () => {
    if (isFirst) return;
    const prevIndex = currentStep - 1;
    const prevStep = tourSteps[prevIndex];
    setCurrentStep(prevIndex);
    if (prevStep.tab) {
      onNavigate(prevStep.tab);
    }
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Card */}
      <div
        style={{
          position: "relative",
          maxWidth: 520,
          width: "90%",
          background: "rgba(15,15,20,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "40px 36px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transition: "transform 0.3s ease, opacity 0.3s ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          aria-label="Close tour"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
          }
        >
          <X size={20} />
        </button>

        {/* Emoji */}
        <div
          style={{
            fontSize: "3rem",
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          {step.emoji}
        </div>

        {/* Title */}
        <h2
          style={{
            color: "#ffffff",
            fontSize: "1.4rem",
            fontWeight: 700,
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          {step.title}
        </h2>

        {/* Description */}
        <p
          style={{
            color: "rgb(156,163,175)",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            margin: "0 0 28px",
            maxWidth: 420,
          }}
        >
          {step.description}
        </p>

        {/* Step dots */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {tourSteps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background:
                  i === currentStep
                    ? "linear-gradient(135deg, #4ADE80, #22C55E)"
                    : "rgba(255,255,255,0.15)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            justifyContent: "center",
          }}
        >
          {!isFirst && (
            <button
              onClick={handleBack}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
                padding: "10px 20px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
            >
              ← Back
            </button>
          )}

          <button
            onClick={handleNext}
            style={{
              background: "linear-gradient(135deg, #4ADE80, #22C55E)",
              border: "none",
              color: "#000",
              padding: "10px 28px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
              transition: "all 0.2s ease",
              boxShadow: "0 4px 16px rgba(74,222,128,0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(74,222,128,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 16px rgba(74,222,128,0.25)";
            }}
          >
            {isLast ? "Finish" : "Next →"}
          </button>
        </div>

        {/* Skip tour link */}
        <button
          onClick={handleSkip}
          style={{
            background: "transparent",
            border: "none",
            color: "rgb(107,114,128)",
            fontSize: "0.8rem",
            cursor: "pointer",
            marginTop: 16,
            padding: 4,
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgb(107,114,128)")
          }
        >
          Skip Tour
        </button>
      </div>
    </div>
  );
}
