# ##############################################################################
# Synopsys Design Constraints (SDC) File for alu_lp
# Target: 50MHz Clock Frequency (Period = 20.0 ns)
# ##############################################################################

# 1. Define Master Clock
create_clock -name virtual_clk -period 20.0 [get_ports clk]

# 2. Timing Tolerances (Clock Uncertainty & Jitter)
set_clock_uncertainty 0.25 [get_clocks virtual_clk]

# 3. Input Delays (Assuming 20% of period timing overhead)
set_input_delay -clock virtual_clk -max 4.0 [get_ports {op_a op_b opcode enable lp_mode rst_n}]
set_input_delay -clock virtual_clk -min 0.5 [get_ports {op_a op_b opcode enable lp_mode rst_n}]

# 4. Output Delays (Assuming 20% of period constraint for load routing)
set_output_delay -clock virtual_clk -max 4.0 [get_ports {alu_out flag_zero flag_carry flag_overflow flag_negative}]
set_output_delay -clock virtual_clk -min 0.5 [get_ports {alu_out flag_zero flag_carry flag_overflow flag_negative}]

# 5. External Environment (External Standard Load capacitance)
set_load 0.05 [all_outputs]

# 6. Maximum Slew/Transition Constraints for signal integrity
set_max_transition 1.5 [all_inputs]
