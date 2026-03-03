import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, Clock } from 'lucide-react';

export default function ROICalculator() {
  const [hourlyRate, setHourlyRate] = useState(50);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);

  const yearlyValue = hourlyRate * hoursPerWeek * 52;
  const monthlyValue = yearlyValue / 12;
  const paybackWeeks = Math.ceil(29 / (hourlyRate * hoursPerWeek / 4)); // $29 plan

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 rounded-xl p-6 border border-indigo-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-zinc-100">ROI Calculator</h3>
      </div>
      <p className="text-sm text-zinc-400 mb-6">
        Calculate your savings using our automation data
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Your Hourly Rate ($)</label>
          <input
            type="range"
            min="25"
            max="200"
            step="5"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <div className="text-right mt-1">
            <span className="text-2xl font-bold text-indigo-400">${hourlyRate}</span>
            <span className="text-xs text-zinc-500">/hour</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Hours Saved Per Week</label>
          <input
            type="range"
            min="1"
            max="40"
            step="1"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <div className="text-right mt-1">
            <span className="text-2xl font-bold text-amber-400">{hoursPerWeek}</span>
            <span className="text-xs text-zinc-500"> hours/week</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-xs text-zinc-500">Annual Savings</span>
          </div>
          <div className="text-2xl font-bold text-green-400">${yearlyValue.toLocaleString()}</div>
        </div>

        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500">Payback Period</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{paybackWeeks}w</div>
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-400 mb-1">
              ${monthlyValue.toLocaleString()}/month value
            </div>
            <div className="text-xs text-zinc-400">
              at just $29/mo, you save <span className="text-emerald-400 font-semibold">{Math.round(monthlyValue / 29)}x</span> your investment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
