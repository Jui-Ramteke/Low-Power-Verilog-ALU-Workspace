// -----------------------------------------------------------------------------
// Module: alu_lp.v
// Purpose: Multi-bit Parameterized Low-Power ALU with Block-Level
//          Operand Isolation, Clock Gating, and Dynamic Low-Power Mode.
// Author: VLSI Course Project Student
// -----------------------------------------------------------------------------
module alu_lp #(
    parameter DATA_WIDTH = 16
)(
    input  wire                  clk,          // Main Clock
    input  wire                  rst_n,        // Active-low Asynchronous Reset
    input  wire                  enable,       // Master Register Enable (Clock gating)
    input  wire                  lp_mode,      // Low-Power mode (bypasses power-hungry blocks)
    input  wire [3:0]            opcode,       // Instruction Opcode
    input  wire [DATA_WIDTH-1:0] op_a,         // Operand A
    input  wire [DATA_WIDTH-1:0] op_b,         // Operand B
    
    output reg  [DATA_WIDTH-1:0] alu_out,      // Registered Output
    output reg                   flag_zero,    // Zero flag
    output reg                   flag_carry,   // Carry output flag
    output reg                   flag_overflow,// Arithmetic signed overflow
    output reg                   flag_negative // Negative status flag
);

    // Opcodes Definition
    localparam OP_ADD  = 4'b0000;
    localparam OP_SUB  = 4'b0001;
    localparam OP_MUL  = 4'b0010;
    localparam OP_AND  = 4'b0100;
    localparam OP_OR   = 4'b0101;
    localparam OP_XOR  = 4'b0110;
    localparam OP_SHL  = 4'b1000;
    localparam OP_SHR  = 4'b1001;

    // ============================================
    // TECHNIQUE 1: Block-Level Operand Isolation
    // ============================================
    // Under standard design, any change in op_a or op_b triggers switching 
    // activity inside deep logic trees of all units (e.g. multiplier, shifter),
    // causing massive dynamic power dissipation.
    // By gating inputs to blocks not currently selected, we completely stop 
    // transitions inside inactive modules.

    wire math_gated;
    wire shift_gated;

    // Active conditions
    assign math_gated  = (opcode == OP_ADD || opcode == OP_SUB || opcode == OP_MUL) ? 1'b0 : 1'b1;
    assign shift_gated = (opcode == OP_SHL || opcode == OP_SHR)                    ? 1'b0 : 1'b1;

    // Isolation MUX / Gate Cells 
    wire [DATA_WIDTH-1:0] op_a_iso_math;
    wire [DATA_WIDTH-1:0] op_b_iso_math;
    wire [DATA_WIDTH-1:0] op_a_iso_shift;
    wire [DATA_WIDTH-1:0] op_b_iso_shift;

    // Apply AND-gate operand isolation. 
    // Note: If lp_mode is assert, we also shut down multiplier inputs to save static leakage/toggling.
    assign op_a_iso_math  = (math_gated || (opcode == OP_MUL && lp_mode))  ? {DATA_WIDTH{1'b0}} : op_a;
    assign op_b_iso_math  = (math_gated || (opcode == OP_MUL && lp_mode))  ? {DATA_WIDTH{1'b0}} : op_b;

    assign op_a_iso_shift = shift_gated ? {DATA_WIDTH{1'b0}} : op_a;
    assign op_b_iso_shift = shift_gated ? {DATA_WIDTH{1'b0}} : op_b;

    // ============================================
    // Internal Combinational Blocks (Sub-units)
    // ============================================
    
    // 1. Adder/Subtractor Unit (only switches when op_a_iso_math / op_b_iso_math toggles)
    wire [DATA_WIDTH:0] adder_sum;
    assign adder_sum = (opcode == OP_SUB) ? 
                       (op_a_iso_math - op_b_iso_math) : 
                       (op_a_iso_math + op_b_iso_math);

    wire [DATA_WIDTH-1:0] math_res;
    wire                  math_carry;
    wire                  math_overflow;

    assign math_res      = adder_sum[DATA_WIDTH-1:0];
    assign math_carry    = (opcode == OP_ADD || opcode == OP_SUB) ? adder_sum[DATA_WIDTH] : 1'b0;
    assign math_overflow = (opcode == OP_ADD || opcode == OP_SUB) ? 
                           ((op_a_iso_math[DATA_WIDTH-1] ^ op_b_iso_math[DATA_WIDTH-1] ^ (opcode == OP_SUB)) & 
                            (op_a_iso_math[DATA_WIDTH-1] ^ adder_sum[DATA_WIDTH-1])) : 1'b0;

    // 2. Power-Intensive Multiplier Unit
    wire [(DATA_WIDTH*2)-1:0] mul_temp;
    assign mul_temp = op_a_iso_math * op_b_iso_math;
    wire [DATA_WIDTH-1:0]     mul_res;
    assign mul_res  = mul_temp[DATA_WIDTH-1:0];

    // 3. Shifter Unit
    wire [DATA_WIDTH-1:0] shift_res;
    // We mask shifter inputs to log2 bits of width for shifting safety
    assign shift_res = (opcode == OP_SHL) ? 
                       (op_a_iso_shift << op_b_iso_shift[3:0]) : 
                       (op_a_iso_shift >> op_b_iso_shift[3:0]);

    // 4. Zero-Leakage Combinational Logic block (AND, OR, XOR)
    // Logic blocks stay direct as they are lightweight and do not have deep switching chains.
    wire [DATA_WIDTH-1:0] logic_res;
    assign logic_res = (opcode == OP_AND) ? (op_a & op_b) :
                       (opcode == OP_OR)  ? (op_a | op_b) :
                       (opcode == OP_XOR) ? (op_a ^ op_b) : {DATA_WIDTH{1'b0}};

    // ============================================
    // Output Multiplexing (Combinational Select)
    // ============================================
    reg  [DATA_WIDTH-1:0] alu_comb_out;
    reg                   comb_carry;
    reg                   comb_overflow;

    always @(*) begin
        case (opcode)
            OP_ADD, OP_SUB: begin
                alu_comb_out  = math_res;
                comb_carry    = math_carry;
                comb_overflow = math_overflow;
            end
            OP_MUL: begin
                if (lp_mode) begin
                    alu_comb_out  = {DATA_WIDTH{1'b0}}; // Mathematical block bypassed in Low Power Mode
                    comb_carry    = 1'b0;
                    comb_overflow = 1'b0;
                end else begin
                    alu_comb_out  = mul_res;
                    comb_carry    = 1'b0;
                    comb_overflow = 1'b0;
                end
            end
            OP_SHL, OP_SHR: begin
                alu_comb_out  = shift_res;
                comb_carry    = 1'b0;
                comb_overflow = 1'b0;
            end
            OP_AND, OP_OR, OP_XOR: begin
                alu_comb_out  = logic_res;
                comb_carry    = 1'b0;
                comb_overflow = 1'b0;
            end
            default: begin
                alu_comb_out  = {DATA_WIDTH{1'b0}};
                comb_carry    = 1'b0;
                comb_overflow = 1'b0;
            end
        endcase
    end

    // ============================================
    // TECHNIQUE 2: RTL Clock Gating
    // ============================================
    // Registered architectures dissipate vast amounts of power clocking 
    // master-slave flip-flops every cycle, even with unchanged inputs.
    // Clock gating halts the clock to flip-flops when enable = 0.
    
    wire gated_clk;

    // Modeling an Integrated Clock Gating (ICG) latch cell style in RTL:
    // This blocks glitches by validating clock gating during the low phase of the clock.
    reg latch_enable;
    always @(clk or enable) begin
        if (!clk) begin
            latch_enable <= enable;
        end
    end
    
    // Gate the clock using latch_enable
    assign gated_clk = clk & latch_enable;

    // Register Pipeline Stage
    always @(posedge gated_clk or negedge rst_n) begin
        if (!rst_n) begin
            alu_out        <= {DATA_WIDTH{1'b0}};
            flag_zero      <= 1'b0;
            flag_carry     <= 1'b0;
            flag_overflow  <= 1'b0;
            flag_negative  <= 1'b0;
        end else begin
            alu_out        <= alu_comb_out;
            flag_zero      <= (alu_comb_out == {DATA_WIDTH{1'b0}});
            flag_carry     <= comb_carry;
            flag_overflow  <= comb_overflow;
            flag_negative  <= alu_comb_out[DATA_WIDTH-1];
        end
    end

endmodule
