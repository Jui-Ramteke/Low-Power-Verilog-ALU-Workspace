import React from "react";
import { SimulationState } from "../types";

interface WaveformViewerProps {
  history: SimulationState[];
  currentCycleIndex: number;
  onSelectCycle: (index: number) => void;
}

export default function WaveformViewer({
  history,
  currentCycleIndex,
  onSelectCycle,
}: WaveformViewerProps) {
  if (history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
        No simulation data available. Advance clocks to generate waveforms.
      </div>
    );
  }

  const svgWidth = Math.max(700, history.length * 60 + 100);
  const cycleWidth = 60;
  const labelWidth = 110;
  const rowHeight = 36;
  const signalCount = 9;
  const totalHeight = (signalCount + 1.2) * rowHeight;

  // Render horizontal timelines
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-white md:col-span-2" id="waveform-panel">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-md font-sans text-slate-300 font-semibold">
            Logic Analyzer Waveform Viewer (VCD Chronogram)
          </h3>
          <p className="text-xs text-slate-400">
            Click on any clock cycle segment to jump and inspect that specific execution state.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-900 px-2 py-1 rounded font-mono">
            VCD Stream: ACTIVE
          </span>
        </div>
      </div>

      {/* Scrolling Waveform Container */}
      <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 relative scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <svg
          width={svgWidth}
          height={totalHeight}
          className="select-none"
        >
          {/* Grid lines and background highlights */}
          {history.map((state, index) => {
            const xPos = labelWidth + index * cycleWidth;
            const isCurrent = index === currentCycleIndex;

            return (
              <g key={index} className="cursor-pointer" onClick={() => onSelectCycle(index)}>
                {/* Vertical Divider */}
                <line
                  x1={xPos}
                  y1={0}
                  x2={xPos}
                  y2={totalHeight}
                  stroke={isCurrent ? "#10b981" : "#1e293b"}
                  strokeWidth={isCurrent ? "1.5" : "1"}
                  strokeDasharray={isCurrent ? "" : "3,3"} 
                />
                
                {/* Active Highlight Panel */}
                {isCurrent && (
                  <rect
                    x={xPos}
                    y={0}
                    width={cycleWidth}
                    height={totalHeight}
                    fill="#10b981"
                    fillOpacity="0.06"
                  />
                )}

                {/* Grid Title on top */}
                <text
                  x={xPos + cycleWidth / 2}
                  y="16"
                  fill={isCurrent ? "#34d399" : "#64748b"}
                  fontSize="10"
                  fontWeight={isCurrent ? "bold" : "normal"}
                  textAnchor="middle"
                >
                  T{state.cycle}
                </text>
              </g>
            );
          })}

          {/* Row Headers (Signal List) */}
          {[
            { label: "clk", type: "digital" },
            { label: "rst_n", type: "digital" },
            { label: "enable", type: "digital" },
            { label: "lp_mode", type: "digital" },
            { label: "opcode", type: "analog" },
            { label: "op_a", type: "analog" },
            { label: "op_b", type: "analog" },
            { label: "alu_out", type: "analog" },
            { label: "power", type: "graph" },
          ].map((sig, rIdx) => {
            const yBasis = 36 + rIdx * rowHeight;
            return (
              <g key={sig.label}>
                {/* Row separator */}
                <line
                  x1={0}
                  y1={yBasis + rowHeight}
                  x2={svgWidth}
                  y2={yBasis + rowHeight}
                  stroke="#1e293b"
                  strokeWidth="0.5"
                />
                {/* Label text */}
                <text
                  x="10"
                  y={yBasis + 18}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="bold"
                  alignmentBaseline="middle"
                  className="font-mono"
                >
                  {sig.label}
                </text>
                {/* Signal Info Type badge */}
                <text
                  x="100"
                  y={yBasis + 18}
                  fill="#475569"
                  fontSize="8"
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="font-mono uppercase"
                >
                  {sig.type}
                </text>
              </g>
            );
          })}

          {/* RENDER DIGITAL AND ANALOG CHRONOGRAMS */}

          {/* 1. clk (Toggling 0 -> 1 -> 0 each step) */}
          <path
            d={history.reduce((acc, state, idx) => {
              const xStart = labelWidth + idx * cycleWidth;
              const xHalf = xStart + cycleWidth / 2;
              const xEnd = xStart + cycleWidth;
              // clk toggles low state then high state in a cycle
              return acc + ` M ${xStart} 62 L ${xHalf} 62 L ${xHalf} 42 L ${xEnd} 42`;
            }, "")}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />

          {/* 2. rst_n */}
          <path
            d={history.reduce((acc, state, idx) => {
              const xStart = labelWidth + idx * cycleWidth;
              const xEnd = xStart + cycleWidth;
              const yVal = state.rst_n === 1 ? 78 : 98; // active low high=78, low=98
              return acc + (idx === 0 ? `M ${xStart} ${yVal}` : "") + ` L ${xEnd} ${yVal}`;
            }, "")}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
          />

          {/* 3. enable */}
          <path
            d={history.reduce((acc, state, idx) => {
              const xStart = labelWidth + idx * cycleWidth;
              const xEnd = xStart + cycleWidth;
              const yVal = state.enable === 1 ? 114 : 134;
              return acc + (idx === 0 ? `M ${xStart} ${yVal}` : "") + ` L ${xEnd} ${yVal}`;
            }, "")}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />

          {/* 4. lp_mode */}
          <path
            d={history.reduce((acc, state, idx) => {
              const xStart = labelWidth + idx * cycleWidth;
              const xEnd = xStart + cycleWidth;
              const yVal = state.lpMode === 1 ? 150 : 170;
              return acc + (idx === 0 ? `M ${xStart} ${yVal}` : "") + ` L ${xEnd} ${yVal}`;
            }, "")}
            fill="none"
            stroke="#ec4899"
            strokeWidth="1.5"
          />

          {/* 5. opcode (Hex labels inside polygons) */}
          {history.map((state, idx) => {
            const xStart = labelWidth + idx * cycleWidth;
            const xEnd = xStart + cycleWidth;
            const yTop = 186;
            const yBot = 210;
            return (
              <g key={idx}>
                <polygon
                  points={`${xStart},${yTop + 12} ${xStart + 5},${yTop} ${xEnd - 5},${yTop} ${xEnd},${yTop + 12} ${xEnd - 5},${yBot} ${xStart + 5},${yBot}`}
                  fill="#1e1b4b"
                  stroke="#818cf8"
                  strokeWidth="1"
                />
                <text
                  x={xStart + cycleWidth / 2}
                  y={yTop + 15}
                  fontSize="8"
                  fill="#e0e7ff"
                  textAnchor="middle"
                  className="font-mono"
                >
                  0x{parseInt(state.opcode, 2).toString(16).toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* 6. op_a */}
          {history.map((state, idx) => {
            const xStart = labelWidth + idx * cycleWidth;
            const xEnd = xStart + cycleWidth;
            const yTop = 222;
            const yBot = 246;
            return (
              <g key={idx}>
                <polygon
                  points={`${xStart},${yTop + 12} ${xStart + 5},${yTop} ${xEnd - 5},${yTop} ${xEnd},${yTop + 12} ${xEnd - 5},${yBot} ${xStart + 5},${yBot}`}
                  fill="#0f172a"
                  stroke="#475569"
                  strokeWidth="15"
                />
                <polygon
                  points={`${xStart},${yTop + 12} ${xStart + 5},${yTop} ${xEnd - 5},${yTop} ${xEnd},${yTop + 12} ${xEnd - 5},${yBot} ${xStart + 5},${yBot}`}
                  fill="transparent"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x={xStart + cycleWidth / 2}
                  y={yTop + 15}
                  fontSize="8"
                  fill="#bae6fd"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {state.opA}
                </text>
              </g>
            );
          })}

          {/* 7. op_b */}
          {history.map((state, idx) => {
            const xStart = labelWidth + idx * cycleWidth;
            const xEnd = xStart + cycleWidth;
            const yTop = 258;
            const yBot = 282;
            return (
              <g key={idx}>
                <polygon
                  points={`${xStart},${yTop + 12} ${xStart + 5},${yTop} ${xEnd - 5},${yTop} ${xEnd},${yTop + 12} ${xEnd - 5},${yBot} ${xStart + 5},${yBot}`}
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x={xStart + cycleWidth / 2}
                  y={yTop + 15}
                  fontSize="8"
                  fill="#bae6fd"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {state.opB}
                </text>
              </g>
            );
          })}

          {/* 8. alu_out */}
          {history.map((state, idx) => {
            const xStart = labelWidth + idx * cycleWidth;
            const xEnd = xStart + cycleWidth;
            const yTop = 294;
            const yBot = 318;
            return (
              <g key={idx}>
                <polygon
                  points={`${xStart},${yTop + 12} ${xStart + 5},${yTop} ${xEnd - 5},${yTop} ${xEnd},${yTop + 12} ${xEnd - 5},${yBot} ${xStart + 5},${yBot}`}
                  fill={state.clockGatedActive ? "#1c2541" : "#062f22"}
                  stroke={state.clockGatedActive ? "#475569" : "#10b981"}
                  strokeWidth="1"
                />
                <text
                  x={xStart + cycleWidth / 2}
                  y={yTop + 15}
                  fontSize="8"
                  fill={state.clockGatedActive ? "#94a3b8" : "#34d399"}
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {state.clockGatedActive ? "HOLD" : state.aluOut}
                </text>
              </g>
            );
          })}

          {/* 9. power (Real-time Area graph of power usage in uW) */}
          <path
            d={history.reduce((acc, state, idx) => {
              const xStart = labelWidth + idx * cycleWidth;
              const xEnd = xStart + cycleWidth;
              // Power scale: max is 1000uW mapping to row height (36px range)
              // Row: yBasis = 36 + 8 * 36 = 324px. Height: y = 324 to 360
              // High power -> closer to 330px, low power -> closer to 358px
              const powerVal = Math.min(1000, state.powerMetrics.totalPowerUW);
              const yVal = 358 - (powerVal / 1000) * 26;
              
              if (idx === 0) {
                return `M ${xStart} 360 L ${xStart} ${yVal} L ${xEnd} ${yVal}`;
              }
              return acc + ` L ${xStart} ${yVal} L ${xEnd} ${yVal}`;
            }, "") + ` L ${labelWidth + history.length * cycleWidth} 360 Z`}
            fill="url(#power-gradient)"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />

          {/* Gradient for Power Graph */}
          <defs>
            <linearGradient id="power-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-cyan-400 inline-block rounded-sm" />
          clk (Master)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 inline-block rounded-sm" />
          rst_n (Active-low Reset)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-400 inline-block rounded-sm" />
          enable (Write Clock Gate)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-pink-500 inline-block rounded-sm" />
          lp_mode (Dynamic Core Bypass)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 border border-emerald-500 bg-emerald-950 inline-block rounded-sm" />
          Power Curve (uW)
        </span>
      </div>
    </div>
  );
}
