export type DataWidth = 8 | 16 | 32 | 64;

export enum Opcode {
  OP_ADD = "0000",
  OP_SUB = "0001",
  OP_MUL = "0010",
  OP_AND = "0100",
  OP_OR  = "0101",
  OP_XOR = "0110",
  OP_SHL = "1000",
  OP_SHR = "1001",
}

export interface ALUConfig {
  dataWidth: DataWidth;
  lowPowerModeEnabled: boolean; // Dynamic lp_mode input wire
  operandIsolationEnabled: boolean; // Feature comparison enable
  clockGatingEnabled: boolean; // Feature comparison enable
}

export interface SimulationState {
  cycle: number;
  clk: number;
  rst_n: number;
  enable: number;
  lpMode: number;
  opcode: Opcode;
  opA: number;
  opB: number;
  aluCombOut: number; // Intermediate combinational output
  aluOut: number; // Registered output at clk edge
  flagZero: number;
  flagCarry: number;
  flagOverflow: number;
  flagNegative: number;
  isolatedMath_A: number;
  isolatedMath_B: number;
  isolatedShift_A: number;
  isolatedShift_B: number;
  multiplierAccessBlocked: boolean;
  shifterAccessBlocked: boolean;
  clockGatedActive: boolean;
  powerMetrics: {
    switchingActivityFactor: number; // Factor between 0 and 1 representing toggling
    dynamicPowerUW: number;
    leakagePowerUW: number;
    totalPowerUW: number;
    savingsPercent: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "gemini";
  text: string;
  timestamp: string;
}
