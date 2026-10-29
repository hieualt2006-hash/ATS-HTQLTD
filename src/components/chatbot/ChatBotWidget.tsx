"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Send,
  X,
  RotateCcw,
  Minus,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

const DEFAULT_WELCOME_MSG =
  "Xin chào! Tôi là **Trợ lý AI**. Tôi có thể hỗ trợ bạn giải đáp thông tin về phần mềm cũng như các số liệu tài khoản.";

export default function ChatBotWidget() {
  const pathname = usePathname();

  // 1. Kiểm tra loại trừ: Ẩn hoàn toàn chatbot ở các trang đăng nhập/đăng ký VÀ TẤT CẢ các dạng web portal ứng viên (/careers, /apply)
  const isExcludedPage =
    !pathname ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register/") ||
    pathname === "/careers" ||
    pathname.startsWith("/careers/") ||
    pathname === "/apply" ||
    pathname.startsWith("/apply/");

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isLoading]);

  const [hasInitialized, setHasInitialized] = useState(false);

  // Khởi tạo lấy thông tin chào mừng và câu hỏi gợi ý khi người dùng mở ChatBot (Lazy load tối ưu tốc độ)
  useEffect(() => {
    if (isExcludedPage || !isOpen || hasInitialized) return;

    let isMounted = true;
    async function initChatbot() {
      try {
        setHasInitialized(true);
        const res = await fetch("/api/chatbot");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data.suggestedQuestions)) {
              setSuggestedQuestions(data.suggestedQuestions);
            }
            // Tin nhắn chào mừng ban đầu
            if (messages.length === 0) {
              setMessages([
                {
                  id: "welcome-msg",
                  sender: "bot",
                  text: data.welcomeMessage || DEFAULT_WELCOME_MSG,
                  timestamp: new Date().toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ]);
            }
          }
        }
      } catch (err) {
        console.warn("Không thể tải trạng thái chatbot:", err);
      }
    }

    initChatbot();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isExcludedPage, hasInitialized, messages.length]);

  // Nếu đang ở trang đăng nhập / đăng ký hoặc các trang web portal -> Ẩn hoàn toàn
  if (isExcludedPage) {
    return null;
  }

  // Gửi tin nhắn
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // 1. Hiển thị NGAY LẬP TỨC câu hỏi của người dùng và kích hoạt trạng thái đang trả lời
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputValue("");
    setIsLoading(true);

    // 2. Cuộn ngay lập tức xuống đáy để người dùng thấy rõ câu hỏi và hiệu ứng đang trả lời
    setTimeout(() => {
      scrollToBottom("smooth");
    }, 40);

    try {
      // Chuẩn bị lịch sử trò chuyện gần nhất
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const botReply = data.reply || "Xin lỗi, tôi chưa nhận được câu trả lời. Bạn vui lòng thử lại nhé!";

      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: botReply,
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: "bot-error-" + Date.now(),
        sender: "bot",
        text: "Không thể kết nối đến máy chủ trợ lý AI. Vui lòng kiểm tra lại kết nối mạng.",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 50);
    }
  };

  // Làm mới cuộc trò chuyện
  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome-reset-" + Date.now(),
        sender: "bot",
        text: DEFAULT_WELCOME_MSG,
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // Render nội dung Markdown cơ bản mượt mà, sạch đẹp
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading ###
      if (trimmed.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-sm text-[#0C0C0C] mt-2 mb-1">
            {trimmed.replace(/^###\s+/, "")}
          </h4>
        );
      }
      // Heading ##
      if (trimmed.startsWith("## ")) {
        return (
          <h3 key={idx} className="font-extrabold text-sm text-[#0C0C0C] mt-2.5 mb-1.5">
            {trimmed.replace(/^##\s+/, "")}
          </h3>
        );
      }
      // Bullet point
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemText = trimmed.replace(/^[-*]\s+/, "");
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-800 my-0.5 leading-relaxed">
            {parseInlineMarkdown(itemText)}
          </li>
        );
      }
      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="ml-1 text-xs text-slate-800 my-1 flex items-start gap-1.5 leading-relaxed">
            <span className="font-bold text-[#16a34a] shrink-0">{numMatch[1]}.</span>
            <span>{parseInlineMarkdown(numMatch[2])}</span>
          </div>
        );
      }
      // Dòng trống
      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }
      // Đoạn văn thường
      return (
        <p key={idx} className="text-xs text-slate-800 my-0.5 leading-relaxed">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  // Phân tích định dạng in đậm (**text**), code (`text`), link
  const parseInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

      const matches = [
        { type: "bold", match: boldMatch },
        { type: "code", match: codeMatch },
        { type: "link", match: linkMatch },
      ].filter((m) => m.match && m.match.index !== undefined);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      matches.sort((a, b) => (a.match!.index ?? 0) - (b.match!.index ?? 0));
      const first = matches[0];
      const matchIndex = first.match!.index!;
      const matchLength = first.match![0].length;

      if (matchIndex > 0) {
        parts.push(remaining.substring(0, matchIndex));
      }

      if (first.type === "bold") {
        parts.push(
          <strong key={keyIdx++} className="font-bold text-[#0C0C0C]">
            {first.match![1]}
          </strong>
        );
      } else if (first.type === "code") {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-[#16a34a] font-mono text-[11px] font-semibold border border-slate-200"
          >
            {first.match![1]}
          </code>
        );
      } else if (first.type === "link") {
        parts.push(
          <a
            key={keyIdx++}
            href={first.match![2]}
            className="text-[#16a34a] font-semibold hover:underline inline-flex items-center gap-0.5"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{first.match![1]}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }

      remaining = remaining.substring(matchIndex + matchLength);
    }

    return parts;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* ================= CỬA SỔ CHAT KHI MỞ ================= */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#E5E5E0] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header Cửa sổ Chat: Chỉ gồm Icon và Tiêu đề "Nhóm 20" theo đúng yêu cầu */}
          <div className="px-4 py-3 bg-[#FFFFFF] border-b border-[#E5E5E0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Avatar ChatBot sử dụng ảnh chat-bot.png */}
              <div className="relative w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-sm">
                <img
                  src="/chat-bot.png"
                  alt="Nhóm 20"
                  className="w-full h-full object-contain"
                />
                {/* Chấm trạng thái Online xanh lá */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#16a34a] border-2 border-white rounded-full" />
              </div>
              <h3 className="font-extrabold text-base text-[#0C0C0C] tracking-tight">
                Nhóm 20
              </h3>
            </div>

            {/* Các nút điều khiển ở Header */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ cửa sổ"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Đóng chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Danh sách tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Icon bot bên cạnh tin nhắn AI */}
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 mt-0.5 shadow-sm">
                    <img
                      src="/chat-bot.png"
                      alt="Bot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs ${
                    msg.sender === "user"
                      ? "bg-[#16a34a] text-white rounded-br-none"
                      : "bg-[#FFFFFF] text-[#0C0C0C] border border-[#E5E5E0] rounded-bl-none"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : (
                    <div>{renderFormattedText(msg.text)}</div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 font-medium ${
                      msg.sender === "user" ? "text-emerald-100 text-right" : "text-slate-400 text-left"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Dấu hiệu Đang trả lời rõ ràng, sinh động ngay dưới câu hỏi người dùng */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 shadow-sm flex items-center justify-center">
                  <img
                    src="/chat-bot.png"
                    alt="Bot thinking"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-[#FFFFFF] border border-[#E5E5E0] rounded-2xl rounded-bl-none px-3.5 py-2 shadow-sm flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Trợ lý AI đang trả lời</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#16a34a] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-[#16a34a] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[#16a34a] rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Câu hỏi gợi ý nhanh: CHỈ HIỂN THỊ KHI CHƯA BẮT ĐẦU CHAT (messages.length <= 1) để không làm giật khung hình */}
            {suggestedQuestions.length > 0 && messages.length <= 1 && (
              <div className="pt-2 animate-in fade-in duration-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#16a34a]" />
                  <span>Câu hỏi gợi ý nhanh</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(q)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#16a34a] border border-slate-200 hover:border-[#16a34a] transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <span className="line-clamp-1">{q}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#16a34a] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-[#FFFFFF] border-t border-[#E5E5E0]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Hỏi về số liệu hoặc tính năng phần mềm..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 bg-[#F2F1ED] border border-slate-200 rounded-xl text-xs text-[#0C0C0C] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#16a34a] transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ================= NÚT THU NHỎ NỔI Ở GÓC DƯỚI BÊN PHẢI ================= */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 rounded-2xl bg-white hover:bg-slate-50 border-2 border-[#16a34a] p-1.5 shadow-lg shadow-green-900/15 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Mở Nhóm 20"
        >
          {/* Ảnh chat-bot.png làm icon chat */}
          <img
            src="/chat-bot.png"
            alt="AI ChatBot Icon"
            className="w-full h-full object-contain select-none group-hover:rotate-3 transition-transform"
          />

          {/* Chấm trạng thái Online xanh lá đang phát tín hiệu */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#16a34a] border-2 border-white" />
          </span>
        </button>
      )}
    </div>
  );
}
