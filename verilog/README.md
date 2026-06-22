# Low-Power Parameterized Verilog ALU Design

This repository contains an industry-standard, parameterizable (8/16/32/64-bit) Low-Power Arithmetic Logic Unit (ALU) implemented in Verilog HDL. It integrates advanced hardware-level low-power VLSI design methodologies directly into the RTL architecture, contrasting performance with a standard baseline ALU.

## Key Hardware Architectures

### 1. Block-Level Operand Isolation
In traditional ALU designs, any input transition on `op_a` or `op_b` propagates down the logic cones of **all** internal computing sub-blocks (adder, multiplier, shifter). This creates massive duplicate switching activities and wastes charging energy ($P_{dynamic} = \alpha C V_{dd}^2 f$). 
This implementation applies combinational gates (AND-gates/muxes) to the inputs of the arithmetic and shift cores, completely isolating them to prevent toggle propagation when they are unused.

### 2. RTL Clock Gating
Registers normally lock their inputs on every clock edge, consuming power constantly even when the value does not change. Here, an **Integrated Clock Gating (ICG)** system is modeled where the clock is only enabled and toggled to the output registers on active cycles (determined by the global `enable` control), routing clock tree power down effectively.

### 3. Dedicated "Low-Power Mode" (`lp_mode`)
Designed for battery-save states, asserting `lp_mode` physically gates the input vectors to the highly intensive, leakage-heavy multiplication multiplier array block, shutting it down entirely when active.

---

## File Structure

- `alu_lp.v`: Parameterized Low-Power ALU with isolation and clock gating.
- `alu_standard.v`: Unoptimized baseline reference ALU.
- `tb_alu_lp.v`: Self-checking testbench.
- `yosys_synth.tcl`: Gate mapping script for Yosys RTL compiler.
- `opensta.sdc`: Synopsys timing constraint file.

---

## Reproducible Simulation & Synthesis Flows

### 1. Functional Simulation (using Icarus Verilog)
Verify correct logical operation and capture signal wave logs:
```bash
# Compile testbench and hardware designs
iverilog -o alu_simulation tb_alu_lp.v alu_lp.v alu_standard.v

# Execute simulation to dump wave logs
vvp alu_simulation
```

### 2. Viewing Waveforms
The simulation outputs `alu_simulation.vcd`. You can open this using GTKWave to analyze signal gating:
```bash
gtkwave alu_simulation.vcd
```

### 3. Synthesis Flow (Yosys)
To synthesize the logic design into gate-level primitives, execute Yosys with our TCL script:
```bash
yosys -s yosys_synth.tcl
```
Check the printed statistics to compare cell numbers against standard libraries.
