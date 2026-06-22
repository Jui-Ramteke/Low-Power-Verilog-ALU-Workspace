import React from "react";
import { Opcode } from "../types";

interface ALUSchematicProps {
  opcode: Opcode;
  lpMode: boolean;
  enable: boolean;
  operandIsolation: boolean;
  clockGating: boolean;
  opA: number;
  opB: number;
  aluOut: number;
}

export default function ALUSchematic({
  opcode,
  lpMode,
  enable,
  operandIsolation,
  clockGating,
  opA,
  opB,
  aluOut,
}: ALUSchematicProps) {
  // Determine block activity
  const isAdderActive = opcode === Opcode.OP_ADD || opcode === Opcode.OP_SUB;
  const isMulActive = opcode === Opcode.OP_MUL;
  const isShiftActive = opcode === Opcode.OP_SHL || opcode === Opcode.OP_SHR;
  const isLogicActive = opcode === Opcode.OP_AND || opcode === Opcode.OP_OR || opcode === Opcode.OP_XOR;

  // Determine isolation states (if enabled)
  const isMathIsolated = operandIsolation ? !isAdderActive && !isMulActive : false;
  const isShiftIsolated = operandIsolation ? !isShiftActive : false;
  const isMulPowerGated = lpMode && isMulActive;

  // Clock state
  const isClockActive = clkActiveLine();

  function clkActiveLine() {
    if (clockGating) {
      return enable;
    }
    return true;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative text-white" id="schema-panel">
      <div className="absolute top-4 right-4 flex gap-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 bg-emerald-500 rounded inline-block" />
          Active Path
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 bg-slate-600 rounded inline-block" />
          Isolated (Safe)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 bg-amber-500 rounded inline-block" />
          Standard Toggling (Wasting)
        </span>
      </div>

      <h3 className="text-md font-sans text-slate-300 font-semibold mb-4">
        Interactive RTL Logic Schematic
      </h3>
      <p className="text-xs text-slate-400 mb-6 max-w-2xl">
        Select operations or toggle low-power controls to see signal routes. Green lines represent active data paths, gray lines show gated/isolated sections, and amber dashes highlight where baseline ALUs experience redundant switching.
      </p>

      {/* SVG Stage */}
      <div className="w-full flex justify-center py-4 bg-slate-950 rounded-lg border border-slate-800/80 p-4">
        <svg
          viewBox="0 0 800 450"
          className="w-full max-w-4xl h-auto"
          style={{ fontFamily: "monospace" }}
        >
          {/* Signal Definitions */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#eab308" />
            </marker>
            <linearGradient id="active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* 1. INPUT PORTS */}
          <g transform="translate(10, 80)">
            <rect x="10" y="0" width="80" height="36" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="50" y="22" fill="#e2e8f0" fontSize="11" textAnchor="middle">
              op_a: {opA}
            </text>
            <text x="10" y="-6" fill="#94a3b8" fontSize="10">Inputs</text>

            <rect x="10" y="50" width="80" height="36" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="50" y="72" fill="#e2e8f0" fontSize="11" textAnchor="middle">
              op_b: {opB}
            </text>
          </g>

          {/* 2. OPERAND ISOLATION MODULES */}
          {/* Isolation (Math) */}
          <g transform="translate(150, 70)">
            <rect
              x="0"
              y="0"
              width="100"
              height="70"
              rx="6"
              fill={operandIsolation ? "#0f172a" : "#1e1b4b"}
              stroke={operandIsolation ? (isMathIsolated ? "#334155" : "#10b981") : "#f59e0b"}
              strokeWidth="2"
              strokeDasharray={operandIsolation ? "" : "3,3"}
            />
            <text x="50" y="26" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">
              ISO_GATING
            </text>
            <text x="50" y="42" fill="#94a3b8" fontSize="10" textAnchor="middle">
              {operandIsolation ? "AND Gates" : "(Bypassed)"}
            </text>
            <text x="50" y="56" fill={isMathIsolated ? "#64748b" : "#10b981"} fontSize="10" textAnchor="middle">
              {isMathIsolated ? "Isolating" : "Active"}
            </text>
          </g>

          {/* Isolation (Shifter) */}
          <g transform="translate(150, 210)">
            <rect
              x="0"
              y="0"
              width="100"
              height="70"
              rx="6"
              fill={operandIsolation ? "#0f172a" : "#1e1b4b"}
              stroke={operandIsolation ? (isShiftIsolated ? "#334155" : "#10b981") : "#f59e0b"}
              strokeWidth="2"
              strokeDasharray={operandIsolation ? "" : "3,3"}
            />
            <text x="50" y="26" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">
              ISO_GATING
            </text>
            <text x="50" y="42" fill="#94a3b8" fontSize="10" textAnchor="middle">
              {operandIsolation ? "AND Gates" : "(Bypassed)"}
            </text>
            <text x="50" y="56" fill={isShiftIsolated ? "#64748b" : "#10b981"} fontSize="10" textAnchor="middle">
              {isShiftIsolated ? "Isolating" : "Active"}
            </text>
          </g>

          {/* 3. HARDWARE SUB-BLOCKS */}
          {/* Adder Sub-block */}
          <g transform="translate(320, 30)">
            <polygon
              points="0,0 90,10 90,50 0,60 20,30"
              fill={isAdderActive ? "#064e3b" : "#1e293b"}
              stroke={isAdderActive ? "#10b981" : "#475569"}
              strokeWidth="2"
            />
            <text x="45" y="34" fill={isAdderActive ? "#34d399" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">
              ADD / SUB
            </text>
          </g>

          {/* Multiplier Sub-block */}
          <g transform="translate(320, 110)">
            <polygon
              points="0,0 90,10 90,50 0,60 20,30"
              fill={isMulActive ? (isMulPowerGated ? "#451a03" : "#064e4f") : "#1e293b"}
              stroke={isMulActive ? (isMulPowerGated ? "#ef4444" : "#06b6d4") : "#475569"}
              strokeWidth="2"
            />
            <text x="45" y="34" fill={isMulActive ? (isMulPowerGated ? "#f87171" : "#22d3ee") : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">
              {isMulPowerGated ? "MUL (Gated)" : "MUL (Costly)"}
            </text>
          </g>

          {/* Shifter Sub-block */}
          <g transform="translate(320, 210)">
            <polygon
              points="0,0 90,10 90,50 0,60 20,30"
              fill={isShiftActive ? "#14532d" : "#1e293b"}
              stroke={isShiftActive ? "#10b981" : "#475569"}
              strokeWidth="2"
            />
            <text x="45" y="34" fill={isShiftActive ? "#4ade80" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">
              SHIFTER
            </text>
          </g>

          {/* Logic Sub-block */}
          <g transform="translate(320, 310)">
            <polygon
              points="0,0 90,10 90,50 0,60 20,30"
              fill={isLogicActive ? "#1e1b4b" : "#1e293b"}
              stroke={isLogicActive ? "#6366f1" : "#475569"}
              strokeWidth="2"
            />
            <text x="45" y="34" fill={isLogicActive ? "#a5b4fc" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">
              AND/OR/XOR
            </text>
          </g>

          {/* CONNECTIONS (ROUTING INTERFACES) - lines with dynamic layout */}

          {/* Input Bus to Isolation Blocks */}
          {/* OP A bus */}
          <path
            d="M 100 100 L 125 100 L 125 90 L 150 90"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            markerEnd="url(#arrow-emerald)"
          />
          {/* OP B bus */}
          <path
            d="M 100 150 L 135 150 L 135 120 L 150 120"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            markerEnd="url(#arrow-emerald)"
          />

          {/* OP A/B Routing to Logic Isolation Block */}
          <path
            d="M 125 100 L 125 230 L 150 230"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            markerEnd="url(#arrow-emerald)"
          />
          <path
            d="M 135 150 L 135 260 L 150 260"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            markerEnd="url(#arrow-emerald)"
          />

          {/* Connections from Isolation Blocks to Processing Blocks */}

          {/* To Adder (Combines Isolation effect) */}
          <path
            d="M 250 105 L 280 105 L 280 50 L 320 50"
            fill="none"
            stroke={isMathIsolated ? "#475569" : (!operandIsolation ? "#eab308" : "#10b981")}
            strokeWidth="2"
            strokeDasharray={!operandIsolation && !isAdderActive ? "3,3" : ""}
            markerEnd={isMathIsolated ? "url(#arrow)" : (!operandIsolation ? "url(#arrow-amber)" : "url(#arrow-emerald)")}
          />
          {/* To Multiplier (Combines isolation and LP Mode dynamic gating) */}
          <path
            d="M 250 105 L 295 105 L 295 140 L 320 140"
            fill="none"
            stroke={isMulPowerGated ? "#ef4444" : (isMathIsolated ? "#475569" : (!operandIsolation ? "#eab308" : "#10b981"))}
            strokeWidth="2"
            strokeDasharray={!operandIsolation && !isMulActive ? "3,3" : ""}
            markerEnd={isMulPowerGated ? "url(#arrow)" : (isMathIsolated ? "url(#arrow)" : (!operandIsolation ? "url(#arrow-amber)" : "url(#arrow-emerald)"))}
          />

          {/* To Shifter */}
          <path
            d="M 250 245 L 320 240"
            fill="none"
            stroke={isShiftIsolated ? "#475569" : (!operandIsolation ? "#eab308" : "#10b981")}
            strokeWidth="2"
            strokeDasharray={!operandIsolation && !isShiftActive ? "3,3" : ""}
            markerEnd={isShiftIsolated ? "url(#arrow)" : (!operandIsolation ? "url(#arrow-amber)" : "url(#arrow-emerald)")}
          />

          {/* Lightweight Logic bypasses isolation directly */}
          <path
            d="M 100 150 L 135 150 L 135 340 L 320 340"
            fill="none"
            stroke={isLogicActive ? "#10b981" : "#475569"}
            strokeDasharray={!isLogicActive ? "3,3" : ""}
            strokeWidth="1.5"
            markerEnd={isLogicActive ? "url(#arrow-emerald)" : "url(#arrow)"}
          />

          {/* 4. MULTIPLEXER STAGE */}
          <g transform="translate(490, 130)">
            {/* Trapezoid MUX */}
            <polygon points="0,0 40,30 40,110 0,140" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <text x="20" y="76" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">
              MUX
            </text>
            <text x="5" y="25" fill="#94a3b8" fontSize="8">Add</text>
            <text x="5" y="55" fill="#94a3b8" fontSize="8">Mul</text>
            <text x="5" y="90" fill="#94a3b8" fontSize="8">Shift</text>
            <text x="5" y="125" fill="#94a3b8" fontSize="8">Logic</text>
          </g>

          {/* Outputs from sub-blocks to MUX */}
          <path
            d="M 410 60 L 460 60 L 460 145 L 490 145"
            fill="none"
            stroke={isAdderActive ? "#10b981" : "#475569"}
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          <path
            d="M 410 140 L 490 170"
            fill="none"
            stroke={isMulActive && !isMulPowerGated ? "#06b6d4" : "#475569"}
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          <path
            d="M 410 240 L 465 240 L 465 210 L 490 210"
            fill="none"
            stroke={isShiftActive ? "#10b981" : "#475569"}
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          <path
            d="M 410 340 L 475 340 L 475 245 L 490 245"
            fill="none"
            stroke={isLogicActive ? "#6366f1" : "#475569"}
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          {/* Opcode Selector feed to MUX */}
          <path
            d="M 510 50 L 510 130"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2,2"
            markerEnd="url(#arrow)"
          />
          <text x="510" y="42" fill="#94a3b8" fontSize="9" textAnchor="middle">
            opcode: {opcode}
          </text>

          {/* 5. GATED PIPELINE CLOCK CELL & REGISTER BANK */}
          {/* Clock gating cell block */}
          <g transform="translate(520, 310)">
            <rect x="0" y="0" width="70" height="50" rx="4" fill="#1e1b4b" stroke={clockGating ? "#f59e0b" : "#475569"} strokeWidth="2" />
            <text x="35" y="20" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
              CLK_GATER
            </text>
            <text x="35" y="34" fill={isClockActive ? "#10b981" : "#64748b"} fontSize="9" textAnchor="middle">
              {clockGating ? (enable ? "Gated ON" : "Gates OFF") : "Continuous"}
            </text>
          </g>

          {/* Clock inputs */}
          <path
            d="M 460 410 L 485 410 L 485 335 L 520 335"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            markerEnd="url(#arrow)"
          />
          <text x="440" y="414" fill="#94a3b8" fontSize="10">clk</text>

          <path
            d="M 505 295 L 530 295 L 530 310"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            markerEnd="url(#arrow)"
          />
          <text x="495" y="290" fill="#f59e0b" fontSize="9">enable: {enable ? "1" : "0"}</text>

          {/* Output Pipeline Register Block */}
          <g transform="translate(610, 160)">
            <rect x="0" y="0" width="80" height="100" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x="40" y="24" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
              REG_BANK
            </text>
            <text x="40" y="50" fill="#94a3b8" fontSize="9" textAnchor="middle">
              FF Registers
            </text>
            <text x="40" y="76" fill={isClockActive ? "#22d3ee" : "#475569"} fontSize="9" textAnchor="middle">
              {isClockActive ? "Toggled ●" : "CLOCK SHUT ○"}
            </text>
          </g>

          {/* Mux Out to Reg */}
          <path
            d="M 530 200 L 610 200"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            markerEnd="url(#arrow-emerald)"
          />

          {/* Gated clock output line */}
          <path
            d="M 590 335 L 630 335 L 630 260"
            fill="none"
            stroke={isClockActive ? "#22d3ee" : "#475569"}
            strokeWidth="1.5"
            strokeDasharray={!isClockActive ? "3,3" : ""}
            markerEnd="url(#arrow)"
          />

          {/* 6. OUTPUT PORTS */}
          <g transform="translate(710, 185)">
            <rect x="10" y="0" width="70" height="30" rx="3" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <text x="45" y="18" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">
              {aluOut}
            </text>
            <text x="10" y="-6" fill="#94a3b8" fontSize="9">alu_out</text>
          </g>

          <g transform="translate(710, 240)">
            <text x="10" y="10" fill="#38bdf8" fontSize="8 font-mono">
              FLAGS: Z={(aluOut === 0) ? 1 : 0} C={opcode === Opcode.OP_ADD ? (opA + opB > 255 ? 1 : 0) : 0}
            </text>
          </g>

        </svg>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <span className="font-bold text-teal-400 block mb-1">Operand Isolation (RTL Gates)</span>
          Prevents input transition noise from passing to ALU subunits. Keeps inactive blocks flat at 0V so they do not drain active switching power.
        </div>
        <div>
          <span className="font-bold text-amber-400 block mb-1">Integrated Clock Gating (ICG)</span>
          Shuts off clock triggers to output D-Flip-Flops when <span className="font-mono bg-slate-800 text-slate-200 px-1 rounded">enable=0</span>. This cuts massive clock tree toggling power fully.
        </div>
        <div>
          <span className="font-bold text-sky-400 block mb-1">Bypass Low-Power mode</span>
          Activating the dynamic bypass restricts multiplication and limits voltage charging of complex math gates for extreme ultra-low power execution.
        </div>
      </div>
    </div>
  );
}
