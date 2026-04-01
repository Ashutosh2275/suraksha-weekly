"use client";

import { FormEvent, useMemo, useState } from "react";

import { authToken, createIdempotencyKey, apiClient } from "@/lib/apiClient";
import { Skeleton } from "@/components/common/Skeleton";

const cities = ["Bangalore", "Mumbai", "Delhi", "Hyderabad"];
const platforms = ["Swiggy", "Zomato", "Blinkit", "Zepto", "Other"];

type Language = "en" | "hi";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [city, setCity] = useState(cities[0]);
  const [platform, setPlatform] = useState(platforms[0]);
  const [hours, setHours] = useState(8);
  const [earnings, setEarnings] = useState(12000);
  const [riskTier, setRiskTier] = useState<"Low" | "Medium" | "High">("Medium");
  const [error, setError] = useState<string | null>(null);

  const topFactors = useMemo(() => {
    if (language === "hi") {
      return [
        "Aapke zone mein barish aur disruption risk zyada hai.",
        "Roz ke working hours zyada hone se exposure badhta hai.",
        "Aapki weekly income ke hisab se coverage limit set hoti hai.",
      ];
    }
    return [
      "Your zone has higher rain/disruption frequency.",
      "Longer daily working hours increase exposure.",
      "Coverage cap is tuned to your weekly earnings.",
    ];
  }, [language]);

  async function requestOtp(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await apiClient("/api/v1/auth/request-otp", {
        method: "POST",
        body: { phone },
        idempotencyKey: createIdempotencyKey("otp-request"),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not request OTP");
    }
  }

  async function verifyOtp(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      const response = await apiClient<{ token?: string; access_token?: string }>("/api/v1/auth/verify-otp", {
        method: "POST",
        body: { phone, otp },
        idempotencyKey: createIdempotencyKey("otp-verify"),
      });
      const token = response.access_token || response.token || "demo-worker-token";
      authToken.set(token);
      setStep(2);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "OTP verification failed");
    }
  }

  function submitProfile(event: FormEvent): void {
    event.preventDefault();
    setLoadingRisk(true);
    setStep(3);
    setTimeout(() => {
      if (hours >= 10 || earnings <= 9000) {
        setRiskTier("High");
      } else if (hours >= 8) {
        setRiskTier("Medium");
      } else {
        setRiskTier("Low");
      }
      setLoadingRisk(false);
    }, 2200);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Onboarding</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Suraksha Worker Setup</h1>
        <p className="mt-1 text-sm text-slate-600">Step {step} of 4</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {step === 1 ? (
          <>
            <h2 className="text-sm font-semibold text-slate-900">Step 1: Phone + OTP</h2>
            <form className="mt-3 space-y-3" onSubmit={requestOtp}>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                value={phone}
              />
              <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="submit">
                Request OTP
              </button>
            </form>
            <form className="mt-3 space-y-3" onSubmit={verifyOtp}>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter OTP"
                value={otp}
              />
              <button className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" type="submit">
                Verify & Continue
              </button>
            </form>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-sm font-semibold text-slate-900">Step 2: Profile details</h2>
            <form className="mt-3 space-y-3" onSubmit={submitProfile}>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" onChange={(event) => setCity(event.target.value)} value={city}>
                {cities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setPlatform(event.target.value)}
                value={platform}
              >
                {platforms.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <label className="block text-xs font-medium text-slate-700">
                Avg daily hours: {hours}
                <input
                  className="mt-2 w-full"
                  max={14}
                  min={2}
                  onChange={(event) => setHours(Number(event.target.value))}
                  type="range"
                  value={hours}
                />
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setEarnings(Number(event.target.value))}
                placeholder="Avg weekly earnings"
                type="number"
                value={earnings}
              />
              <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="submit">
                Generate Risk Profile
              </button>
            </form>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="text-sm font-semibold text-slate-900">Step 3: Risk profile</h2>
            {loadingRisk ? (
              <div className="mt-3 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <p className="text-xs text-slate-500">Analyzing city risk, trigger frequency, and earnings volatility...</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Risk tier: {riskTier}</p>
                <p className="text-sm text-slate-700">
                  Your risk profile combines zone disruption trends, work hours, and earnings pattern to produce a stable weekly premium.
                </p>
                <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => setStep(4)} type="button">
                  Continue to Quote
                </button>
              </div>
            )}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Step 4: Quote card</h2>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs"
                onClick={() => setLanguage((prev) => (prev === "en" ? "hi" : "en"))}
                type="button"
              >
                {language === "en" ? "हिंदी" : "English"}
              </button>
            </div>
            <article className="mt-3 rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-slate-300">Weekly quote</p>
              <p className="mt-2 text-2xl font-semibold">₹149</p>
              <p className="mt-1 text-sm text-slate-300">Coverage limit: ₹3,200</p>
            </article>
            <div className="mt-3 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Top 3 premium factors</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                {topFactors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </div>
            <a className="mt-4 inline-block w-full rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white" href="/dashboard">
              Finish & Go to Dashboard
            </a>
          </>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>
    </main>
  );
}
