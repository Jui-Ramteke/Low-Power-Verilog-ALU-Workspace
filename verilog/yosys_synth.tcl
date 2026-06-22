# ==============================================================================
# Yosys RTL Synthesis Script for Low-Power ALU
# This script performs target compilation, general cell mapping, and statistics.
# ==============================================================================

# 1. Read Verilog Design Sources
read_verilog alu_lp.v

# 2. Elaborate Design Hierarchy
hierarchy -check -top alu_lp

# 3. Apply High-level optimizations (Dead code elimination, constant folder)
proc; opt; fsm; opt;

# 4. Extract Clock-Gating Cells and map register stages
# Yosys can automatically discover gated clocks and map them to clock gating cells
# if mapping to specific target standard cell libraries (e.g., SkyWater 130nm).
# For generic synthesis, we optimize the latches and gated logics.
memory; opt

# 5. Extract logic gates and map to generic cell library
techmap; opt

# 6. Map to standard gates from generic library
dfflibmap -liberty generic.lib; # If using specific technology liberty files
abc -g AND,OR,XOR,MUX

# 7. Clean up design hierarchy
clean

# 8. Report synthesis quality and cell usage statistics
stat

# 9. Write out gate-level synthesized netlist
write_verilog gate_level_alu_lp.v
