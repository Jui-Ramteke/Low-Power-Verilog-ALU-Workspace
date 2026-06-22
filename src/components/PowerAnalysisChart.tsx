import React from "react";
import { SimulationState, Opcode } from "../types";
import { Zap, ShieldCheck, BatteryCharging, AlertTriangle } from "lucide-react";

interface PowerAnalysisChartProps {
  currentState: SimulationState;
  operandIsolation: boolean;
  clockGating: boolean;
}

export default function PowerAnalysisChart({
  currentState,
  operandIsolation,
  clockGating,
}: PowerAnalysisChartProps) {
  // Extract info
  const metrics = currentState.powerMetrics;

  // Let's compute estimated values for Standard ALU for comparison:
  // Baseline static leakage is higher because of un-isolated active transistors.
  // Standard MUL multiplier is very heavy.
  let standardDynamicPower = 345; // base dynamic power in uW
  let standardStaticPower = 65;   // base static leakage in uW

  const isMathActive = currentState.opcode === Opcode.OP_ADD || currentState.opcode === Opcode.OP_SUB || currentState.opcode === Opcode.OP_MUL;
  const isShiftActive = currentState.opcode === Opcode.OP_SHL || currentState.opcode === Opcode.OP_SHR;

  // Scale dynamic power on current operation complexity
  if (currentState.opcode === Opcode.OP_MUL) {
    standardDynamicPower = 840;
  } else if (isMathActive) {
    standardDynamicPower = 480;
  } else if (isShiftActive) {
    standardDynamicPower = 310;
  } else {
    standardDynamicPower = 180; // simple logical gate
  }

  // If clock gating is off or enable is active, register banks consume full speed
  if (currentState.enable === 0) {
    // Under standard, even with enable=0, registers still cycle clock trees
    standardDynamicPower += 150;
  } else {
    standardDynamicPower += 180;
  }

  // Savings computation
  const standardTotal = standardDynamicPower + standardStaticPower;
  const gatedTotal = metrics.totalPowerUW;
  const realSavingsPercent = Math.max(0, Math.round(((standardTotal - gatedTotal) / standardTotal) * 100));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-white grid grid-cols-1 md:grid-cols-2 gap-6" id="power-panel">
      {/* Power meter visualization */}
      <div className="flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-md font-sans text-slate-300 font-semibold">
              Power Proxy Estimation Center
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Simulated calculations mapping dynamic CMOS switching activity factoring operand isolation, gate capacitances, and registers scaling.
          </p>
        </div>

        {/* Bar comparison */}
        <div className="space-y-4 my-3">
          {/* Baseline standard */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Unoptimized Standard ALU
              </span>
              <span className="font-bold text-slate-200">{standardTotal} μW</span>
            </div>
            <div className="h-6 w-full bg-slate-950 rounded-md overflow-hidden flex border border-slate-800">
              <div 
                className="bg-amber-600/80 flex items-center justify-center text-[10px] text-white font-mono font-bold transition-all duration-500"
                style={{ width: `${(standardDynamicPower / standardTotal) * 100}%` }}
              >
                {standardDynamicPower}μW Dyn
              </div>
              <div 
                className="bg-slate-700/80 flex items-center justify-center text-[10px] text-slate-300 font-mono transition-all duration-500"
                style={{ width: `${(standardStaticPower / standardTotal) * 100}%` }}
              >
                {standardStaticPower}μW Lkg
              </div>
            </div>
          </div>

          {/* Gated ALU */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-mono text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Gated Low-Power ALU
              </span>
              <span className="font-bold text-emerald-400">{Math.round(gatedTotal)} μW</span>
            </div>
            <div className="h-6 w-full bg-slate-950 rounded-md overflow-hidden flex border border-slate-800">
              <div 
                className="bg-emerald-600 flex items-center justify-center text-[10px] text-white font-mono font-bold transition-all duration-300"
                style={{ width: `${Math.max(15, (metrics.dynamicPowerUW / standardTotal) * 100)}%` }}
              >
                {Math.round(metrics.dynamicPowerUW)}μW
              </div>
              <div 
                className="bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono transition-all duration-300"
                style={{ width: `${(metrics.leakagePowerUW / standardTotal) * 100}%` }}
              >
                {Math.round(metrics.leakagePowerUW)}μW
              </div>
            </div>
          </div>
        </div>

        {/* Live dynamic metrics cards */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Active Power Savings</span>
            <span className="text-xl font-mono font-bold text-emerald-400">-{realSavingsPercent}%</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Gating Efficiency</span>
            <span className="text-xl font-mono font-bold text-cyan-400">
              {currentState.clockGatedActive ? "92%" : operandIsolation ? "68%" : "5%"}
            </span>
          </div>
        </div>
      </div>

      {/* Physics/theory breakdown */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            CMOS Power Dissipation Physics
          </h4>
          
          <div className="font-mono text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div className="font-bold text-cyan-400">Total Power Formula:</div>
            <div>P_total = P_dynamic + P_static</div>
            <div className="mt-1 font-bold text-yellow-400">Dynamic Gating Equation:</div>
            <div>P_dynamic = α · C_load · V_dd² · f_clk</div>
          </div>

          <div className="text-xs text-slate-400 space-y-2">
            <p>
              • <strong className="text-slate-300">Switching Activity Factor (α):</strong> Operand Isolation locks inputs to zeroes, dropping <span className="font-mono text-emerald-400">α</span> from around <span className="text-amber-500 font-mono">0.45</span> to <span className="text-emerald-400 font-mono">0.02</span> in unselected zones.
            </p>
            <p>
              • <strong className="text-slate-300">Clock Gating Control (f_clk):</strong> Clock gating zeroes out local frequency nets, cutting register dynamic switching down to near-absolute zero during idle hold phases.
            </p>
            <p>
              • <strong className="text-slate-300">Voltage Leakage Isolation (I_lkg):</strong> Restricting access blocks static channels, keeping thermal leakage low inside high-density multiplier cells.
            </p>
          </div>
        </div>

        <div className="mt-4 text-[10px] text-slate-500 text-right">
          *Calculated for 180nm CMOS technology models at V_dd = 1.8V
        </div>
      </div>
    </div>
  );
}
