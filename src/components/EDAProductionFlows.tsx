import React, { useState } from "react";
import { Terminal, Check, Copy, Download, HardDrive, Cpu, Settings, Eye } from "lucide-react";

export default function EDAProductionFlows() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const flows = [
    {
      title: "1. Compilation & Simulation Flow (Icarus Verilog)",
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      description: "Checks synthesizability syntax compliance, activates register banks, runs sequential waveforms, and compiles output signals.",
      command: `iverilog -o alu_simulation_netlist tb_alu_lp.v alu_lp.v alu_standard.v\nvvp alu_simulation_netlist`,
      explanation: "• 'iverilog' compiles standard Verilog behavioral modules together.\n• 'vvp' executes the simulation pipeline resulting in a self-checking report and writes 'alu_simulation.vcd' wave traces."
    },
    {
      title: "2. Toggle Capture & Power Proxy Flow",
      icon: <Eye className="w-4 h-4 text-sky-405 text-cyan-400" />,
      description: "Generates switching activity factors (SAIF) or logs active value toggles over clk triggers to compute silicon heat dissipated.",
      command: `# Under ModelSim/VCS, compile and generate Switching Activity files:\nvlib work\nvlog alu_lp.v tb_alu_lp.v\nvsim -c -do "power add -r tb_alu_lp/uut_lp/*; run 1000ns; power export -saif alu_activity.saif; quit"`,
      explanation: "• Logging transitions to SAIF captures the average switching probability (α) of each wire node.\n• Synthesizer tools import the SAIF to estimate real dynamic leakage curves."
    },
    {
      title: "3. Logic Core Synthesis (Yosys OpenFlow)",
      icon: <Cpu className="w-4 h-4 text-indigo-400" />,
      description: "Performs RTL parsing, flattens sub-adder networks, and maps cells directly to Gate-Level elements (D-flipflop standard cells).",
      command: `yosys -s yosys_synth.tcl`,
      explanation: "• Reads synthesizable RTL from 'alu_lp.v', performs logical constant flattening, and translates abstract logic into gate-and-latch topologies."
    },
    {
      title: "4. Static Timing Analysis Constraints (OpenSTA)",
      icon: <Settings className="w-4 h-4 text-amber-500" />,
      description: "Tests timing closure against target clock limits, checks clock slacks, propagation delays, setup-and-hold limits inside flip-flops.",
      command: `sta -f -echo -exit <<EOF\nread_liberty -min generic_stdcells.lib\nread_verilog gate_level_alu_lp.v\nlink_design alu_lp\nread_sdc opensta.sdc\nreport_checks -path_delay max -delay_type max -limit 10\nEOF`,
      explanation: "• Maps cell timings using liberty libraries and checks physical delays from 'opensta.sdc' specifications."
    }
  ];

  const handleCopyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-white" id="eda-panel">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-5 h-5 text-indigo-400 animate-bounce" />
        <h3 className="text-md font-sans text-slate-300 font-semibold">
          Reproducible ASIC/EDA Toolchain Flows
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-6 max-w-3xl">
        To transition from virtual simulation to true structural layout cells, you can execute these identical CLI directives using free open-source VLSI applications locally on Linux or WSL shells.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {flows.map((flow, idx) => (
          <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-3">
                {flow.icon}
                <h4 className="text-xs font-semibold text-slate-200">{flow.title}</h4>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">{flow.description}</p>
              
              {/* Terminal code snippet line */}
              <div className="relative font-mono text-[10px] bg-slate-900 border border-slate-800 p-2.5 rounded text-teal-400 overflow-x-auto truncate">
                <button
                  type="button"
                  onClick={() => handleCopyCommand(flow.command, idx)}
                  className="absolute right-2 top-2 bg-slate-950 border border-slate-800 p-1 rounded-sm text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition-all"
                >
                  {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-[9px]">Copy</span>}
                </button>
                <pre>{flow.command}</pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-400 leading-normal whitespace-pre-wrap font-sans">
              {flow.explanation}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border border-dashed border-indigo-900/60 bg-indigo-950/20 p-4 rounded-lg text-xs leading-relaxed text-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <strong className="text-indigo-400 block mb-0.5">Need a pre-configured open-source EDA workstation?</strong>
          We recommend using the <strong className="text-slate-200">OpenLane / OSS CAD Suite</strong> Docker images to test Verilog synthesis, linting, routing, and cell mapping instantly on standard environments.
        </div>
        <div className="shrink-0">
          <a
            href="https://github.com/YosysHQ/oss-cad-suite-build"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 font-bold px-3 py-1.5 rounded text-white text-[11px] text-center transition-all"
          >
            OSS CAD Suite on GitHub &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
