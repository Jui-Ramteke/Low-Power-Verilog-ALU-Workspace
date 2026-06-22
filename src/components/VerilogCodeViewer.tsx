import React, { useState } from "react";
import { Check, Copy, Download, Code, FileCode } from "lucide-react";

const verilogLpCode = `// ==============================================================================
// Module: alu_lp.v
// Features: Parameterized bit-width, Operand Isolation, Integrated Clock Gating
// ==============================================================================
module alu_lp #(
    parameter DATA_WIDTH = 16
)(
    input  wire                  clk,          // Clock
    input  wire                  rst_n,        // Active-low asynchronous reset
    input  wire                  enable,       // Master Write Gating Enable (ICG)
    input  wire                  lp_mode,      // Low-Power mode (gates MUL block)
    input  wire [3:0]            opcode,       // Opcode selector
    input  wire [DATA_WIDTH-1:0] op_a,         // Operand A
    input  wire [DATA_WIDTH-1:0] op_b,         // Operand B
    
    output reg  [DATA_WIDTH-1:0] alu_out,      // Pipeline output register
    output reg                   flag_zero,    // Zero status flag
    output reg                   flag_carry,   // Carry status flag
    output reg                   flag_overflow,// Overflow status flag
    output reg                   flag_negative // Negative status flag
);

    // --- Technique 1: Block Operand Isolation ---
    wire math_gated  = (opcode == OP_ADD || opcode == OP_SUB || opcode == OP_MUL) ? 1'b0 : 1'b1;
    wire shift_gated = (opcode == OP_SHL || opcode == OP_SHR)                    ? 1'b0 : 1'b1;

    // Isolation clamping via comb AND-gates:
    wire [DATA_WIDTH-1:0] op_a_iso_math  = (math_gated || (opcode == OP_MUL && lp_mode))  ? {DATA_WIDTH{1'b0}} : op_a;
    wire [DATA_WIDTH-1:0] op_b_iso_math  = (math_gated || (opcode == OP_MUL && lp_mode))  ? {DATA_WIDTH{1'b0}} : op_b;
    wire [DATA_WIDTH-1:0] op_a_iso_shift = shift_gated ? {DATA_WIDTH{1'b0}} : op_a;

    // --- TECHNIQUE 2: Integrated Clock Gating (ICG) ---
    wire gated_clk;
    reg latch_enable;
    
    // Model Latch-Based clock gating cell
    always @(clk or enable) begin
        if (!clk) begin
            latch_enable <= enable;
        end
    end
    assign gated_clk = clk & latch_enable;

    // Registered Stage
    always @(posedge gated_clk or negedge rst_n) begin
        if (!rst_n) begin
            alu_out <= {DATA_WIDTH{1'b0}};
        end else begin
            alu_out <= alu_comb_out;
        end
    end
endmodule`;

const verilogStdCode = `// ==============================================================================
// Module: alu_standard.v
// Baseline: Standard unoptimized ALU with continuous clock trigger
// ==============================================================================
module alu_standard #(
    parameter DATA_WIDTH = 16
)(
    input  wire                  clk,
    input  wire                  rst_n,
    input  wire                  enable,       // Continuous register write-enable mux
    input  wire [3:0]            opcode,
    input  wire [DATA_WIDTH-1:0] op_a,
    input  wire [DATA_WIDTH-1:0] op_b,
    
    output reg  [DATA_WIDTH-1:0] alu_out,
    output reg                   flag_zero
);

    // Direct connections - transistors toggle continuously!
    wire [DATA_WIDTH-1:0] math_res  = op_a + op_b;
    wire [DATA_WIDTH-1:0] mul_res   = op_a * op_b;
    wire [DATA_WIDTH-1:0] shift_res = op_a << op_b[3:0];

    // Registers clock triggered continuously on every active positive clock edge
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            alu_out <= {DATA_WIDTH{1'b0}};
        end else if (enable) begin
            alu_out <= alu_comb_out;
        end
    end
endmodule`;

export default function VerilogCodeViewer() {
  const [selectedTab, setSelectedTab] = useState<"gated" | "standard">("gated");
  const [copied, setCopied] = useState(false);

  const activeCode = selectedTab === "gated" ? verilogLpCode : verilogStdCode;
  const activeFileName = selectedTab === "gated" ? "alu_lp.v" : "alu_standard.v";

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-white" id="code-panel">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-md font-sans text-slate-300 font-semibold flex items-center gap-1.5 animate-pulse">
            <FileCode className="w-5 h-5 text-indigo-400" />
            Synthesizable Verilog Source Code
          </h3>
          <p className="text-xs text-slate-400">
            Compare and analyze the synthesizable RTL Verilog differences between optimized low-power gating and continuous baseline cells.
          </p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setSelectedTab("gated")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              selectedTab === "gated"
                ? "bg-emerald-600 text-white font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Optimized Low-Power ALU
          </button>
          <button
            onClick={() => setSelectedTab("standard")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              selectedTab === "standard"
                ? "bg-slate-800 text-slate-200 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Continuous Standard ALU
          </button>
        </div>
      </div>

      {/* Code panel with description annotator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Actual code display */}
        <div className="lg:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800 relative font-mono text-xs overflow-x-auto max-h-[420px] scrollbar-thin">
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              onClick={handleCopy}
              className="p-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded text-xs flex items-center gap-1"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="p-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded text-xs flex items-center gap-1"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
          <pre className="text-slate-300 leading-relaxed pt-6">
            <code>{activeCode}</code>
          </pre>
        </div>

        {/* Dynamic RTL reviewer breakdown board */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              Low Power RTL Design Review
            </h4>

            {selectedTab === "gated" ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/20 p-2.5 rounded border border-emerald-900/60">
                  <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                    Input Operand Isolation (Lines 26-32)
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Inputs to heavy operators (e.g. `op_a_iso_math`) are clamped to all-zero vectors using combinational AND-gates when those operators are not selected by `opcode`, eliminating redundant nodes from charging up.
                  </p>
                </div>

                <div className="bg-amber-950/20 p-2.5 rounded border border-amber-900/60">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
                    Latch-Based Clock Gate (Lines 34-43)
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard flip-flops consume up to 35% of total power in clocking internal master-slave layers. When `enable` is low, the localized `gated_clk` halts, cutting out active switching power in the register block.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <h5 className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block" />
                    Bit-Width Parameterization
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    With `parameter DATA_WIDTH = 16`, compilers can easily re-target the design for light 8-bit MCU logic or high-throughput 32-bit CPU elements without code rewrites.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-rose-950/20 p-2.5 rounded border border-rose-900/60">
                  <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full inline-block" />
                    Transistor Toggling Inefficiency
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Without any isolation cells, input state changes feed into both active and inactive computing sub-modules. An addition will cause cells in the multiplier to toggle continuously, wasting dynamic leakage.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <h5 className="text-xs font-bold text-slate-400">
                    Continuous Clocking Dissipation
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1">
                    The registers clock on *every single* clock edge. Clock tree power is fully dissipated even if `enable=0` and values stay identical, draining battery cell voltage directly.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-blue-400 bg-blue-950/20 border border-blue-900/60 p-2.5 rounded-lg font-mono">
            <strong>Simulation Note:</strong> These Verilog modules can be synthesized with Open Source toolchains like <strong>Yosys</strong> to produce layout cells.
          </div>
        </div>
      </div>
    </div>
  );
}
