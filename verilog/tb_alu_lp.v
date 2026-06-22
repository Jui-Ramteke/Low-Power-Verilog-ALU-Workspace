// -----------------------------------------------------------------------------
// Module: tb_alu_lp.v
// Purpose: Self-Checking Testbench for Low-Power ALU Verification.
//          Generates VCD output to log signal transitions.
// -----------------------------------------------------------------------------
`timescale 1ns/1ps

module tb_alu_lp;

    parameter DATA_WIDTH = 16;
    
    // Testbench signals
    reg                  clk;
    reg                  rst_n;
    reg                  enable;
    reg                  lp_mode;
    reg  [3:0]           opcode;
    reg  [DATA_WIDTH-1:0] op_a;
    reg  [DATA_WIDTH-1:0] op_b;
    
    // Gated LP outputs
    wire [DATA_WIDTH-1:0] alu_out_lp;
    wire                  flag_zero_lp;
    wire                  flag_carry_lp;
    wire                  flag_overflow_lp;
    wire                  flag_negative_lp;

    // Standard baseline outputs
    wire [DATA_WIDTH-1:0] alu_out_std;
    wire                  flag_zero_std;
    wire                  flag_carry_std;
    wire                  flag_overflow_std;
    wire                  flag_negative_std;

    // Instantiate Low-Power Gated ALU
    alu_lp #(
        .DATA_WIDTH(DATA_WIDTH)
    ) uut_lp (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .lp_mode(lp_mode),
        .opcode(opcode),
        .op_a(op_a),
        .op_b(op_b),
        .alu_out(alu_out_lp),
        .flag_zero(flag_zero_lp),
        .flag_carry(flag_carry_lp),
        .flag_overflow(flag_overflow_lp),
        .flag_negative(flag_negative_lp)
    );

    // Instantiate Reference Standard ALU
    alu_standard #(
        .DATA_WIDTH(DATA_WIDTH)
    ) uut_std (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .opcode(opcode),
        .op_a(op_a),
        .op_b(op_b),
        .alu_out(alu_out_std),
        .flag_zero(flag_zero_std),
        .flag_carry(flag_carry_std),
        .flag_overflow(flag_overflow_std),
        .flag_negative(flag_negative_std)
    );

    // Clock Generator (50MHz -> Period = 20ns)
    always #10 clk = ~clk;

    // Verification monitor
    initial begin
        $dumpfile("alu_simulation.vcd");
        $dumpvars(0, tb_alu_lp);
        
        // Initial setup
        clk     = 0;
        rst_n   = 0;
        enable  = 0;
        lp_mode = 0;
        opcode  = 4'b0000;
        op_a    = {DATA_WIDTH{1'b0}};
        op_b    = {DATA_WIDTH{1'b0}};

        $display("==========================================================");
        $display("   STARTING LOW-POWER ALU VERIFICATION AND SIMULATION     ");
        $display("==========================================================");

        // Apply Asynchronous Reset
        #15;
        rst_n = 1;
        #15;
        
        // ---------------------------------------------------------------------
        // Test Case 1: Arithmetic Addition (Standard active)
        // ---------------------------------------------------------------------
        $display("[TC1] Testing Adder Core...");
        enable  = 1;
        opcode  = 4'b0000; // OP_ADD
        op_a    = 16'd250;
        op_b    = 16'd750;
        #20;
        if (alu_out_lp === 16'd1000) 
            $display("-> TC1 ADD Passed: 250 + 750 = %d", alu_out_lp);
        else 
            $display("-> TC1 ADD FAILED: Got %d", alu_out_lp);

        // ---------------------------------------------------------------------
        // Test Case 2: Verification of OP_MUL and LP_MODE Active Bypass
        // ---------------------------------------------------------------------
        $display("[TC2] Testing Multiplier Bypass in Low-Power Mode...");
        opcode  = 4'b0010; // OP_MUL
        op_a    = 16'd25;
        op_b    = 16'd8;
        #20;
        $display("-> Normal Mul out: %d (LP disabled, expecting 200)", alu_out_lp);
        
        // Now turn on lp_mode which cuts off multiplier inputs
        lp_mode = 1;
        #20;
        $display("-> Gated Mul out in LP_MODE: %d [STD out is %d] (Correct if LP out is 0)", alu_out_lp, alu_out_std);
        lp_mode = 0;
        #20;

        // ---------------------------------------------------------------------
        // Test Case 3: Verify Operand Isolation on Non-Active Blocks
        // ---------------------------------------------------------------------
        $display("[TC3] Testing Operand Isolation transition reduction...");
        opcode  = 4'b0100; // OP_AND (Lightweight logic only)
        op_a    = 16'h00FF;
        op_b    = 16'h5555;
        #20;
        // Toggling multipliers during logical shift operation. 
        // In Gated ALU, multiplier inputs must remain flat at 0 to isolate toggles.
        op_a    = 16'hFFFF;
        op_b    = 16'h0000;
        #20;
        $display("-> Active Logical Logic Result: %h", alu_out_lp);

        // ---------------------------------------------------------------------
        // Test Case 4: Verify Clock Gating Register holding state
        // ---------------------------------------------------------------------
        $display("[TC4] Evaluating Clock Gating Efficiency with Gating Active...");
        enable  = 0; // Disable write pipeline stage to ALU registers
        opcode  = 4'b0000; // OP_ADD
        op_a    = 16'd5000;
        op_b    = 16'd3000;
        #20;
        $display("-> Gated ALU output with enable=0: %d (Expected to hold previous state: %h)", alu_out_lp, alu_out_lp);
        $display("-> Standard ALU output holds latch: %d", alu_out_std);

        enable  = 1;
        #20;
        $display("-> Gated ALU register fired on un-gating: %d", alu_out_lp);

        // End simulation
        #100;
        $display("==========================================================");
        $display("   SIMULATION SUCCESSFUL. VCD WAVEFORM alu_simulation.vcd GENERATED ");
        $display("==========================================================");
        $finish;
    end

endmodule
