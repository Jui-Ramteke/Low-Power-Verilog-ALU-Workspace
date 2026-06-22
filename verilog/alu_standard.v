// -----------------------------------------------------------------------------
// Module: alu_standard.v
// Purpose: Standard multi-bit Parameterized ALU without any
//          low-power enhancements (no clock gating, no operand isolation).
// -----------------------------------------------------------------------------
module alu_standard #(
    parameter DATA_WIDTH = 16
)(
    input  wire                  clk,
    input  wire                  rst_n,
    input  wire                  enable,       // Acts merely as writing mux select instead of gating clock
    input  wire [3:0]            opcode,
    input  wire [DATA_WIDTH-1:0] op_a,
    input  wire [DATA_WIDTH-1:0] op_b,
    
    output reg  [DATA_WIDTH-1:0] alu_out,
    output reg                   flag_zero,
    output reg                   flag_carry,
    output reg                   flag_overflow,
    output reg                   flag_negative
);

    localparam OP_ADD  = 4'b0000;
    localparam OP_SUB  = 4'b0001;
    localparam OP_MUL  = 4'b0010;
    localparam OP_AND  = 4'b0100;
    localparam OP_OR   = 4'b0101;
    localparam OP_XOR  = 4'b0110;
    localparam OP_SHL  = 4'b1000;
    localparam OP_SHR  = 4'b1001;

    // Direct Arithmetic and Logic sub-blocks with no input gating
    wire [DATA_WIDTH:0] adder_sum;
    assign adder_sum = (opcode == OP_SUB) ? (op_a - op_b) : (op_a + op_b);

    wire [DATA_WIDTH-1:0] math_res;
    assign math_res = adder_sum[DATA_WIDTH-1:0];

    wire [(DATA_WIDTH*2)-1:0] mul_temp;
    assign mul_temp = op_a * op_b;
    wire [DATA_WIDTH-1:0] mul_res;
    assign mul_res = mul_temp[DATA_WIDTH-1:0];

    wire [DATA_WIDTH-1:0] shift_res;
    assign shift_res = (opcode == OP_SHL) ? (op_a << op_b[3:0]) : (op_a >> op_b[3:0]);

    wire [DATA_WIDTH-1:0] logic_res;
    assign logic_res = (opcode == OP_AND) ? (op_a & op_b) :
                       (opcode == OP_OR)  ? (op_a | op_b) :
                       (opcode == OP_XOR) ? (op_a ^ op_b) : {DATA_WIDTH{1'b0}};

    reg  [DATA_WIDTH-1:0] alu_comb_out;
    reg                   comb_carry;
    reg                   comb_overflow;

    always @(*) begin
        case (opcode)
            OP_ADD, OP_SUB: begin
                alu_comb_out  = math_res;
                comb_carry    = (opcode == OP_ADD || opcode == OP_SUB) ? adder_sum[DATA_WIDTH] : 1'b0;
                comb_overflow = (opcode == OP_ADD || opcode == OP_SUB) ? 
                                ((op_a[DATA_WIDTH-1] ^ op_b[DATA_WIDTH-1] ^ (opcode == OP_SUB)) & 
                                 (op_a[DATA_WIDTH-1] ^ adder_sum[DATA_WIDTH-1])) : 1'b0;
            end
            OP_MUL: begin
                alu_comb_out  = mul_res;
                comb_carry    = 1'b0;
                comb_overflow = 1'b0;
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

    // Clock is running fully active every cycle; no dynamic gating is applied 
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            alu_out        <= {DATA_WIDTH{1'b0}};
            flag_zero      <= 1'b0;
            flag_carry     <= 1'b0;
            flag_overflow  <= 1'b0;
            flag_negative  <= 1'b0;
        end else if (enable) begin
            alu_out        <= alu_comb_out;
            flag_zero      <= (alu_comb_out == {DATA_WIDTH{1'b0}});
            flag_carry     <= comb_carry;
            flag_overflow  <= comb_overflow;
            flag_negative  <= alu_comb_out[DATA_WIDTH-1];
        end
    end

endmodule
