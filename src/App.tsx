import React, { useState, useEffect } from "react";
import { 
  Play, 
  RotateCcw, 
  Cpu, 
  Settings, 
  Activity, 
  Sparkles, 
  Terminal, 
  Code, 
  Zap, 
  Check, 
  AlertTriangle,
  Lightbulb,
  Info
} from "lucide-react";
import { DataWidth, Opcode, SimulationState, ALUConfig } from "./types";
import ALUSchematic from "./components/ALUSchematic";
import WaveformViewer from "./components/WaveformViewer";
import PowerAnalysisChart from "./components/PowerAnalysisChart";
import VerilogCodeViewer from "./components/VerilogCodeViewer";
import AIDiscussion from "./components/AIDiscussion";
import EDAProductionFlows from "./components/EDAProductionFlows";

export default function App() {
  // 1. Initial State Parameterization
  const [dataWidth, setDataWidth] = useState<DataWidth>(16);
  const [opcode, setOpcode] = useState<Opcode>(Opcode.OP_ADD);
  const [opA, setOpA] = useState<number>(35);
  const [opB, setOpB] = useState<number>(12);
  const [enable, setEnable] = useState<boolean>(true);
  const [lpMode, setLpMode] = useState<boolean>(false);

  // Power feature switches for direct comparative testing
  const [operandIsolation, setOperandIsolation] = useState<boolean>(true);
  const [clockGating, setClockGating] = useState<boolean>(true);

  // Simulation run state
  const [history, setHistory] = useState<SimulationState[]>([]);
  const [currentCycleIndex, setCurrentCycleIndex] = useState<number>(-1);
  const [isAutoClocking, setIsAutoClocking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"schematic" | "waveform" | "power" | "code" | "flows" | "ai">("schematic");

  // Mask value for parameterizable bit-width representation
  const getMask = (width: DataWidth) => {
    switch (width) {
      case 8: return 0xFF;
      case 16: return 0xFFFF;
      case 32: return 0xFFFFFFFF;
      case 64: return Number.MAX_SAFE_INTEGER; // Simple JS representation
    }
  };

  // 2. Main Logic Evaluation (Equivalent to synthesis behavior)
  const calculateOutput = (
    a: number,
    b: number,
    op: Opcode,
    width: DataWidth,
    lowPower: boolean
  ) => {
    const mask = getMask(width);
    const maskedA = a & mask;
    const maskedB = b & mask;
    let combVal = 0;
    let carry = 0;
    let overflow = 0;

    switch (op) {
      case Opcode.OP_ADD:
        combVal = maskedA + maskedB;
        carry = combVal > mask ? 1 : 0;
        // Overflow simulation for signed add
        const signA = (maskedA >> (width - 1)) & 1;
        const signB = (maskedB >> (width - 1)) & 1;
        const signR = ((combVal & mask) >> (width - 1)) & 1;
        overflow = (signA === signB && signA !== signR) ? 1 : 0;
        break;
      case Opcode.OP_SUB:
        combVal = maskedA - maskedB;
        carry = maskedA >= maskedB ? 1 : 0;
        const signASub = (maskedA >> (width - 1)) & 1;
        const signBSub = (maskedB >> (width - 1)) & 1;
        const signRSub = ((combVal & mask) >> (width - 1)) & 1;
        overflow = (signASub !== signBSub && signASub !== signRSub) ? 1 : 0;
        break;
      case Opcode.OP_MUL:
        if (lowPower) {
          // Gated multiplication shuts down the cell to save voltage
          combVal = 0;
        } else {
          combVal = maskedA * maskedB;
        }
        carry = 0;
        overflow = 0;
        break;
      case Opcode.OP_AND:
        combVal = maskedA & maskedB;
        break;
      case Opcode.OP_OR:
        combVal = maskedA | maskedB;
        break;
      case Opcode.OP_XOR:
        combVal = maskedA ^ maskedB;
        break;
      case Opcode.OP_SHL:
        combVal = maskedA << (maskedB % width);
        break;
      case Opcode.OP_SHR:
        combVal = maskedA >> (maskedB % width);
        break;
    }

    return {
      aluCombOut: combVal & mask,
      flagZero: (combVal & mask) === 0 ? 1 : 0,
      flagCarry: carry,
      flagOverflow: overflow,
      flagNegative: (((combVal & mask) >> (width - 1)) & 1) === 1 ? 1 : 0
    };
  };

  // 3. Simulated Power Modeling
  const simulatePowerUsage = (
    currentOp: Opcode,
    isEnable: boolean,
    isLpMode: boolean,
    isIsoActive: boolean,
    isGatingActive: boolean,
    operandA: number,
    operandB: number,
    prevInHistory: SimulationState | null
  ) => {
    // Standard static leakage in uW (shrinks when isolation clamps unused Gates)
    let leakagePowerUW = 60;
    if (isIsoActive) leakagePowerUW -= 35; // gated transistors do not leak as much thermal charge
    if (isLpMode) leakagePowerUW -= 10;    // cutting multiplier saves additional leakage channels

    let dynamicPowerUW = 0;

    // Clock tree dynamic power (registers capture and toggle clock nets constant rate)
    let clkTreePower = 180;
    let clockThrottled = false;

    if (isGatingActive && !isEnable) {
      clkTreePower = 12; // Clock is successfully gated off (93% clock tree tree power saved!)
      clockThrottled = true;
    }
    dynamicPowerUW += clkTreePower;

    // Standard baseline un-gated registers switch based on changed outputs
    let registerSwitching = 120;
    if (clockThrottled) {
      registerSwitching = 0; // Gated flip flops don't toggle!
    }
    dynamicPowerUW += registerSwitching;

    // Heavy operational sub-blocks dynamic switching
    // If operand isolation is OFF, all sub-blocks switch simultaneously on EVERY input toggle.
    // If operand isolation is ON, only the active opcode blocks switch.
    let logicSw = 20;
    let adderSw = 110;
    let multiSw = 520;
    let shifterSw = 65;

    // Calculate toggle factor (activity metric)
    let toggleFactor = 0.45;

    if (isIsoActive) {
      // Clamps unselected networks. Only the selected block draws power.
      if (currentOp === Opcode.OP_MUL) {
        if (isLpMode) {
          multiSw = 0; 
          toggleFactor = 0.01;
        } else {
          multiSw = 520;
          toggleFactor = 0.38;
        }
        adderSw = 0;
        shifterSw = 0;
        logicSw = 0;
      } else if (currentOp === Opcode.OP_ADD || currentOp === Opcode.OP_SUB) {
        adderSw = 110;
        multiSw = 0;
        shifterSw = 0;
        logicSw = 0;
        toggleFactor = 0.15;
      } else if (currentOp === Opcode.OP_SHL || currentOp === Opcode.OP_SHR) {
        shifterSw = 65;
        adderSw = 0;
        multiSw = 0;
        logicSw = 0;
        toggleFactor = 0.12;
      } else {
        // Logic instructions are very lightweight
        logicSw = 20;
        adderSw = 0;
        multiSw = 0;
        shifterSw = 0;
        toggleFactor = 0.05;
      }
    } else {
      // Wasting state: No isolation. Toggling A and B propagates across all gates!
      // Add a penalty if current operands changed from previous tick.
      const opChanged = prevInHistory 
        ? prevInHistory.opA !== operandA || prevInHistory.opB !== operandB 
        : true;
      if (!opChanged) {
        multiSw = 120; // smaller switching if inputs are stable
        adderSw = 30;
      }
      toggleFactor = 0.85; // high active toggles
    }

    dynamicPowerUW += (shifterSw + adderSw + multiSw + logicSw);

    // Compute dynamic savings percent relative to baseline maximum
    const maxReferenceBase = 950; // Max baseline ALU with multipliers toggling
    const totalPowerUW = dynamicPowerUW + leakagePowerUW;
    const savingsPercent = Math.max(0, Math.round(((maxReferenceBase - totalPowerUW) / maxReferenceBase) * 100));

    return {
      switchingActivityFactor: toggleFactor,
      dynamicPowerUW,
      leakagePowerUW,
      totalPowerUW,
      savingsPercent,
      clockThrottled
    };
  };

  // 4. Initial Setup (Simulates asynchronous reset release)
  useEffect(() => {
    resetSimulation();
  }, [dataWidth]);

  const resetSimulation = () => {
    const initialState: SimulationState = {
      cycle: 0,
      clk: 0,
      rst_n: 0, // Reset asset
      enable: 1,
      lpMode: 0,
      opcode: Opcode.OP_ADD,
      opA: 0,
      opB: 0,
      aluCombOut: 0,
      aluOut: 0,
      flagZero: 1,
      flagCarry: 0,
      flagOverflow: 0,
      flagNegative: 0,
      isolatedMath_A: 0,
      isolatedMath_B: 0,
      isolatedShift_A: 0,
      isolatedShift_B: 0,
      multiplierAccessBlocked: true,
      shifterAccessBlocked: true,
      clockGatedActive: false,
      powerMetrics: {
        switchingActivityFactor: 0.0,
        dynamicPowerUW: 0.0,
        leakagePowerUW: 10.0,
        totalPowerUW: 10.0,
        savingsPercent: 98
      }
    };

    setHistory([initialState]);
    setCurrentCycleIndex(0);
  };

  // 5. Virtual Clock Step
  const stepClock = (customInputs?: { opA: number; opB: number; opcode: Opcode; lpMode: boolean; enable: boolean }) => {
    const nextCycle = history.length;
    const prevTick = history[history.length - 1];

    // Inputs to apply on this positive rise
    const appliedOpA = customInputs ? customInputs.opA : opA;
    const appliedOpB = customInputs ? customInputs.opB : opB;
    const appliedOpcode = customInputs ? customInputs.opcode : opcode;
    const appliedLpMode = customInputs ? customInputs.lpMode : lpMode;
    const appliedEnable = customInputs ? customInputs.enable : enable;

    // Calculate combinational logic paths
    const mathResults = calculateOutput(
      appliedOpA,
      appliedOpB,
      appliedOpcode,
      dataWidth,
      appliedLpMode
    );

    // Clock gating: If clock Gating is enabled, and enable is low, output register holds previous state!
    let registeredAluOut = prevTick ? prevTick.aluOut : 0;
    let registeredZero = prevTick ? prevTick.flagZero : 1;
    let registeredCarry = prevTick ? prevTick.flagCarry : 0;
    let registeredOverflow = prevTick ? prevTick.flagOverflow : 0;
    let registeredNegative = prevTick ? prevTick.flagNegative : 0;

    const pipelineActive = !clockGating || appliedEnable;

    if (pipelineActive) {
      registeredAluOut = mathResults.aluCombOut;
      registeredZero = mathResults.flagZero;
      registeredCarry = mathResults.flagCarry;
      registeredOverflow = mathResults.flagOverflow;
      registeredNegative = mathResults.flagNegative;
    }

    // Determine isolation status
    const isMathIsolated = operandIsolation ? !(appliedOpcode === Opcode.OP_ADD || appliedOpcode === Opcode.OP_SUB || appliedOpcode === Opcode.OP_MUL) : false;
    const isShiftIsolated = operandIsolation ? !(appliedOpcode === Opcode.OP_SHL || appliedOpcode === Opcode.OP_SHR) : false;

    // Compute power metrics
    const powerAnalysis = simulatePowerUsage(
      appliedOpcode,
      appliedEnable,
      appliedLpMode,
      operandIsolation,
      clockGating,
      appliedOpA,
      appliedOpB,
      prevTick
    );

    const newTick: SimulationState = {
      cycle: nextCycle,
      clk: 1, // Rose positive edge
      rst_n: 1, // release reset
      enable: appliedEnable ? 1 : 0,
      lpMode: appliedLpMode ? 1 : 0,
      opcode: appliedOpcode,
      opA: appliedOpA,
      opB: appliedOpB,
      aluCombOut: mathResults.aluCombOut,
      aluOut: registeredAluOut,
      flagZero: registeredZero,
      flagCarry: registeredCarry,
      flagOverflow: registeredOverflow,
      flagNegative: registeredNegative,
      isolatedMath_A: isMathIsolated ? 0 : appliedOpA,
      isolatedMath_B: isMathIsolated ? 0 : appliedOpB,
      isolatedShift_A: isShiftIsolated ? 0 : appliedOpA,
      isolatedShift_B: isShiftIsolated ? 0 : appliedOpB,
      multiplierAccessBlocked: isMathIsolated || (appliedOpcode === Opcode.OP_MUL && appliedLpMode),
      shifterAccessBlocked: isShiftIsolated,
      clockGatedActive: clockGating && !appliedEnable,
      powerMetrics: {
        switchingActivityFactor: powerAnalysis.switchingActivityFactor,
        dynamicPowerUW: powerAnalysis.dynamicPowerUW,
        leakagePowerUW: powerAnalysis.leakagePowerUW,
        totalPowerUW: powerAnalysis.totalPowerUW,
        savingsPercent: powerAnalysis.savingsPercent
      }
    };

    setHistory((prev) => [...prev, newTick]);
    setCurrentCycleIndex(nextCycle);
  };

  // 6. Automatic Clock Sequence Trigger (Generates simulated waveform patterns)
  const runAutoClockSequence = () => {
    if (isAutoClocking) return;
    setIsAutoClocking(true);

    const testSequences = [
      { opA: 55, opB: 12, opcode: Opcode.OP_ADD, lpMode: false, enable: true },
      { opA: 100, opB: 30, opcode: Opcode.OP_SUB, lpMode: false, enable: true },
      { opA: 15, opB: 8, opcode: Opcode.OP_MUL, lpMode: false, enable: true },
      { opA: 15, opB: 8, opcode: Opcode.OP_MUL, lpMode: true, enable: true }, // lp_mode triggered
      { opA: 0x55, opB: 0xAA, opcode: Opcode.OP_XOR, lpMode: false, enable: true }, // logic isolation check
      { opA: 4, opB: 2, opcode: Opcode.OP_SHL, lpMode: false, enable: false }, // gated register write
      { opA: 4, opB: 2, opcode: Opcode.OP_SHL, lpMode: false, enable: true },  // clock gate recovered
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < testSequences.length) {
        const seq = testSequences[step];
        // Sync states to inputs panel
        setOpA(seq.opA);
        setOpB(seq.opB);
        setOpcode(seq.opcode);
        setLpMode(seq.lpMode);
        setEnable(seq.enable);

        stepClock(seq);
        step++;
      } else {
        clearInterval(interval);
        setIsAutoClocking(false);
      }
    }, 1000);
  };

  // Extract current parameters
  const activeState = currentCycleIndex >= 0 && currentCycleIndex < history.length 
    ? history[currentCycleIndex] 
    : history[history.length - 1] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      
      {/* 1. PROFESSIONAL LOGO HEADER BLOCK */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 border border-indigo-500/30 p-2.5 rounded-lg text-indigo-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-sans font-bold tracking-tight text-white flex items-center gap-2">
                Low-Power Verilog ALU Workspace
                <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-900">
                  v1.2 Parameterizable
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Course Design Project • Gated RTL & Operand Isolation Silicon Simulator
              </p>
            </div>
          </div>

          {/* Quick Real-Time Power Status Banner */}
          {activeState && (
            <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Total Gated Power</span>
                <span className="text-emerald-400 font-bold">{Math.round(activeState.powerMetrics.totalPowerUW)} μW</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-500 text-[10px] uppercase block">Power Reduction</span>
                <span className="text-cyan-400 font-bold">-{activeState.powerMetrics.savingsPercent}%</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-500 text-[10px] uppercase block">Selected Ops</span>
                <span className="text-indigo-400 font-bold">{activeState.opcode}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. CORE WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SIDEBAR: HARWARE CONTROLS & TEST vectors (1 grid column) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* A. DESIGN PARAMETERS (STATIC HARDWARE COMPILER CONFIGS) */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative" id="params-panel">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-400" />
              1. RTL Design Parameters
            </h3>
            
            <div className="space-y-4 text-xs">
              {/* Bit-width Parameterizer Selection */}
              <div>
                <label className="text-slate-400 block mb-1">Synthesized Bit-Width (`DATA_WIDTH`):</label>
                <div className="grid grid-cols-4 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {( [8, 16, 32, 64] as DataWidth[] ).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDataWidth(w)}
                      className={`py-1 text-center font-mono rounded transition-all ${
                        dataWidth === w
                          ? "bg-indigo-600 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {w}-bit
                    </button>
                  ))}
                </div>
              </div>

              {/* Operand Isolation toggle switch */}
              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <div>
                  <span className="font-semibold block text-slate-300">Operand Isolation</span>
                  <span className="text-[10px] text-slate-500">AND-Gates at block inputs</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOperandIsolation(!operandIsolation)}
                  className={`w-11 h-6 rounded-full p-1 transition-all ${
                    operandIsolation ? "bg-emerald-600" : "bg-slate-800"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${operandIsolation ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {/* Clock Gating Switch */}
              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <div>
                  <span className="font-semibold block text-slate-300">RTL Clock Gating</span>
                  <span className="text-[10px] text-slate-500">Integrated latch flip-flop gating</span>
                </div>
                <button
                  type="button"
                  onClick={() => setClockGating(!clockGating)}
                  className={`w-11 h-6 rounded-full p-1 transition-all ${
                    clockGating ? "bg-emerald-600" : "bg-slate-800"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${clockGating ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>
          </section>

          {/* B. TESTBENCH HARDWARE SIGNAL STIMULI PANEL */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl" id="stimuli-panel">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              2. Simulation Stimuli (Inputs)
            </h3>

            <div className="space-y-4 text-xs">
              {/* Opcode selecting box */}
              <div>
                <label className="text-slate-400 block mb-1">Instruction OPCODE:</label>
                <select
                  value={opcode}
                  onChange={(e) => setOpcode(e.target.value as Opcode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-cyan-500 text-slate-200"
                >
                  <option value={Opcode.OP_ADD}>0000 - OP_ADD (Addition)</option>
                  <option value={Opcode.OP_SUB}>0001 - OP_SUB (Subtraction)</option>
                  <option value={Opcode.OP_MUL}>0010 - OP_MUL (Intensive Multiplier)</option>
                  <option value={Opcode.OP_AND}>0100 - OP_AND (Logical AND)</option>
                  <option value={Opcode.OP_OR}>0101 - OP_OR (Logical OR)</option>
                  <option value={Opcode.OP_XOR}>0110 - OP_XOR (Logical XOR)</option>
                  <option value={Opcode.OP_SHL}>1000 - OP_SHL (Shift Left)</option>
                  <option value={Opcode.OP_SHR}>1001 - OP_SHR (Shift Right)</option>
                </select>
              </div>

              {/* Operand A decimal input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Operand A (Dec):</label>
                  <input
                    type="number"
                    value={opA}
                    onChange={(e) => setOpA(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                    max={getMask(dataWidth)}
                  />
                </div>
                {/* Operand B decimal */}
                <div>
                  <label className="text-slate-400 block mb-1">Operand B (Dec):</label>
                  <input
                    type="number"
                    value={opB}
                    onChange={(e) => setOpB(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                    max={getMask(dataWidth)}
                  />
                </div>
              </div>

              {/* Enable / clock gate wire toggling */}
              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <div>
                  <span className="font-semibold block text-slate-300">Clock enable (`enable`)</span>
                  <span className="text-[10px] text-slate-500">FF writes are frozen when 0</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnable(!enable)}
                  className={`px-3 py-1 text-xs rounded border font-mono font-bold transition-all ${
                    enable 
                      ? "bg-amber-950 text-amber-400 border-amber-900/60" 
                      : "bg-slate-950 text-slate-500 border-slate-850"
                  }`}
                >
                  {enable ? "ON (1)" : "GATED (0)"}
                </button>
              </div>

              {/* lp_mode dynamic wire toggling */}
              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <div>
                  <span className="font-semibold block text-slate-300">Low-Power (`lp_mode`)</span>
                  <span className="text-[10px] text-slate-500">Restricts hot multiply cells</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLpMode(!lpMode)}
                  className={`px-3 py-1 text-xs rounded border font-mono font-bold transition-all ${
                    lpMode 
                      ? "bg-pink-950 text-pink-400 border-pink-900" 
                      : "bg-slate-950 text-slate-500 border-slate-850"
                  }`}
                >
                  {lpMode ? "ACTIVE (1)" : "SHUT (0)"}
                </button>
              </div>

              {/* ACTION COMMANDS BUTTONS BOARD */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => stepClock()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30 text-xs"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Clock Step (Tick Rise)
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={runAutoClockSequence}
                    disabled={isAutoClocking}
                    className="bg-teal-700 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-600 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all text-white"
                  >
                    <Activity className="w-3.5 h-3.5 animate-bounce" />
                    {isAutoClocking ? "Clocking..." : "Auto Stimulus"}
                  </button>
                  <button
                    type="button"
                    onClick={resetSimulation}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Netlist
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* C. WARNING/ALERTER: SHADOW GATE STATISTICS BANNER */}
          {activeState && activeState.multiplierAccessBlocked && opcode === Opcode.OP_MUL && (
            <div className="bg-amber-950/30 border border-amber-900/60 p-4 rounded-xl text-xs text-amber-300 flex items-start gap-2.5 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-400 block mb-0.5">Static Block Inactive Notice</strong>
                The math multiplier block is currently isolated/bypassed. Output remains clamped to zero. This restricts leakage currents from propagating into standard CMOS gates.
              </div>
            </div>
          )}

        </div>

        {/* VISUAL BOARDS: tabs AND content modules (2 grid columns) */}
        <div className="space-y-6 lg:col-span-2 flex flex-col">
          
          {/* TABS NAVIGATION BAR */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("schematic")}
              className={`flex-1 min-w-[90px] text-center py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold ${
                activeTab === "schematic"
                  ? "bg-indigo-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              RTL schematic
            </button>
            <button
              onClick={() => setActiveTab("waveform")}
              className={`flex-1 min-w-[90px] text-center py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold ${
                activeTab === "waveform"
                  ? "bg-indigo-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Wave analyzer
            </button>
            <button
              onClick={() => setActiveTab("power")}
              className={`flex-1 min-w-[90px] text-center py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold ${
                activeTab === "power"
                  ? "bg-indigo-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Power physics
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 min-w-[90px] text-center py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold ${
                activeTab === "code"
                  ? "bg-indigo-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Verilog code
            </button>
            <button
              onClick={() => setActiveTab("flows")}
              className={`flex-1 min-w-[90px] text-center py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold ${
                activeTab === "flows"
                  ? "bg-indigo-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              ASIC tutorials
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 min-w-[90px] text-center py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold ${
                activeTab === "ai"
                  ? "bg-indigo-600 text-white shadow-md font-bold animate-pulse"
                  : "text-indigo-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              VLSI advisor
            </button>
          </div>

          {/* ACTIVE TAB MODULES RENDERER */}
          <div className="flex-1 min-h-[450px]">
            {activeTab === "schematic" && activeState && (
              <ALUSchematic
                opcode={activeState.opcode}
                lpMode={activeState.lpMode === 1}
                enable={activeState.enable === 1}
                operandIsolation={operandIsolation}
                clockGating={clockGating}
                opA={activeState.opA}
                opB={activeState.opB}
                aluOut={activeState.aluOut}
              />
            )}

            {activeTab === "waveform" && (
              <WaveformViewer
                history={history}
                currentCycleIndex={currentCycleIndex}
                onSelectCycle={(index) => setCurrentCycleIndex(index)}
              />
            )}

            {activeTab === "power" && activeState && (
              <PowerAnalysisChart
                currentState={activeState}
                operandIsolation={operandIsolation}
                clockGating={clockGating}
              />
            )}

            {activeTab === "code" && (
              <VerilogCodeViewer />
            )}

            {activeTab === "flows" && (
              <EDAProductionFlows />
            )}

            {activeTab === "ai" && (
              <AIDiscussion />
            )}
          </div>
          
          {/* Quick learning card footer in bottom of active visualizer */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mt-4 flex items-start gap-3">
            <div className="bg-cyan-950 p-2 rounded text-cyan-400 shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-300">
              <span className="font-bold text-slate-200 block mb-0.5">Quick Academic Tips:</span>
              Compare dynamic power curves between custom patterns. You will note that when <strong className="text-amber-400">Operand Isolation</strong> is disabled, transitioning inputs during idle cycles wastes up to <span className="text-rose-400 font-bold">500%</span> more heat through inactive multiplier cells than when isolated!
            </div>
          </div>

        </div>

      </main>

      {/* 3. CLASSY CHIP DESIGN FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/60 backdrop-blur-md py-4 px-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            Synthesizable RTL Verilog • Evaluated for 180nm CMOS Logic Library
          </div>
          <div className="flex gap-4">
            <span>IEEE Standard 1364-2001 Compliant</span>
            <span>•</span>
            <span className="text-indigo-400">VCD Waveform output enabled</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
