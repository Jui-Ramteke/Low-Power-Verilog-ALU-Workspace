import React, { useState, useRef, useEffect } from "react";
import { Send, Cpu, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { ChatMessage } from "../types";

export default function AIDiscussion() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "gemini",
      text: "Hello! I am your Gemini VLSI Synthesis Advisor. I can help explain the low-power hardware features of your ALU project. You can ask me questions about **Operand Isolation**, **Clock Gating logic**, **Yosys synthesis directives**, or paste a custom Verilog module for an automated low-power review!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "What is the difference between latch-based and latch-free clock gating?",
    "How does operand isolation impact circuit area during synthesis?",
    "Explain the CMOS power formula and how our ALU optimizes each factor.",
    "Show me how to simulate dynamic power in a testbench using VCD/SAIF.",
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend }),
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "gemini",
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setError(data.error || "An unexpected response was returned by the server.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to reach server API endpoint. Please verify GEMINI_API_KEY settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-white flex flex-col h-[550px]" id="chat-panel">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-md font-sans text-slate-300 font-semibold">
            Gemini AI VLSI Expert & RTL Advisor
          </h3>
          <p className="text-xs text-slate-400">
            Ask questions about synthesis compiler behaviors, cell cell libraries, or review code.
          </p>
        </div>
      </div>

      {/* Messages bubble body */}
      <div className="flex-1 overflow-y-auto mb-4 bg-slate-950 rounded-lg p-4 border border-slate-800/60 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-900 text-slate-200 border border-slate-850 rounded-bl-none font-sans"
              }`}
            >
              {/* Parse nested markdown headings slightly for cleaner view */}
              <div className="whitespace-pre-wrap space-y-2">
                {msg.text.split("\n\n").map((para, pIdx) => {
                  if (para.startsWith("###")) {
                    return <h4 key={pIdx} className="font-bold text-teal-400 text-xs mt-2 border-b border-slate-800 pb-1">{para.replace("###", "")}</h4>;
                  }
                  if (para.startsWith("##")) {
                    return <h3 key={pIdx} className="font-bold text-indigo-300 text-sm mt-3">{para.replace("##", "")}</h3>;
                  }
                  return <p key={pIdx}>{para}</p>;
                })}
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-mono">
              {msg.sender === "user" ? "You" : "Gemini Copilot"} • {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mr-auto p-3 bg-slate-900/40 rounded-lg border border-slate-850">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            Synthesizing expertise advice...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-300 mr-auto p-3 bg-rose-950/20 rounded-lg border border-rose-900/60 max-w-[90%]">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold">Synthesis Error:</span> {error}
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggested chips */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Suggested Discussion Points:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q, qidx) => (
              <button
                key={qidx}
                onClick={() => handleSendMessage(q)}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded px-2.5 py-1 text-left transition-all max-w-full truncate"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your hardware or Verilog question here..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          Ask
        </button>
      </form>
    </div>
  );
}
