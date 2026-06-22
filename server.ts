import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add your API key in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// AI Expert Route
app.post("/api/expert", async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const ai = getAI();
    const systemInstruction = 
      "You are an expert VLSI design engineer, Verilog RTL developer, and low-power ASIC design specialist. " +
      "Help the student with their parameterizable Verilog ALU implementation. " +
      "Answer their question in detail with professional expertise, referencing core concepts like operand-isolation, RTL clock gating (using latch-free or latch-based Integrated Clock Gating cells), dynamic and leakage power, and synthesis optimization. " +
      "Structure your response beautifully with markdown headings and lists.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred while communicating with the AI service. Please make sure GEMINI_API_KEY is configured."
    });
  }
});

// AI Verilog RTL Analysis Route
app.post("/api/analyze-rtl", async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "Verilog code is required" });
      return;
    }

    const ai = getAI();
    const prompt = 
      `Please analyze the following Verilog code for power-efficiency, clock-gating support, operand-isolation, and general syntax. ` +
      `Identify any potential redundant switching hazards or floating values, and suggest low-power code modifications:\n\n\`\`\`verilog\n${code}\n\`\`\``;

    const systemInstruction = 
      "You are a CAD automated RTL review tool in an EDA compilation flow. " +
      "Analyze the uploaded HDL RTL snippet specifically for power optimization criteria and RTL correctness. " +
      "Provide: 1) Executive Summary, 2) Switching Activity Hazard Analysis, 3) Suggestions for Gating / Isolation, 4) Revised RTL Snippet if applicable.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("RTL analysis error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to analyze RTL code. Please verify GEMINI_API_KEY is active."
    });
  }
});

// Vite server setup in different environments
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Bootstrap: Mounting Vite in dev mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Bootstrap: Serving production build...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application booted on http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("Critical: Dev/Prod Express server failed to compile/start", err);
});
