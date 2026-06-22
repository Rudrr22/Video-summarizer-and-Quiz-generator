import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

// --- Web Audio API Synth Engine ---
// Dynamically creates custom sound effects without loading audio files
const playSound = (type, soundEnabled) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "correct") {
      // Pleasant double C-E arpeggio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "incorrect") {
      // Soft sliding warning buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3); // Down to A2
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "fanfare") {
      // Short victory arpeggio
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.12, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
        
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    }
  } catch (e) {
    console.warn("Audio Context blocked or unsupported:", e);
  }
};

// --- Canvas Confetti Overlay Component ---
function Confetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Confetti particles array
    const particles = [];
    const colors = ["#6366f1", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        r: Math.random() * 6 + 4,
        d: Math.random() * height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        // Draw particle
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Recycle particles when they fall off screen
        if (p.y > height) {
          particles[idx] = {
            ...p,
            x: Math.random() * width,
            y: -20,
            tiltAngle: 0,
          };
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active]);

  return active ? <canvas ref={canvasRef} className="confetti-canvas" /> : null;
}

function App() {
  // Input states
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState(null);

  // API content states
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState([]);
  
  // Navigation & Toggle states
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz interactive states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [ringOffset, setRingOffset] = useState(440);

  // Extract YouTube video ID
  useEffect(() => {
    if (!url) {
      setVideoId(null);
      return;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      setVideoId(match[2]);
    } else {
      setVideoId(null);
    }
  }, [url]);

  // Synchronize document.body classes with theme toggle
  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  }, [isLightTheme]);

  // Animate the score progress ring when quiz is completed
  useEffect(() => {
    if (quizCompleted) {
      if (score >= 8) {
        playSound("fanfare", soundEnabled);
      }
      const timer = setTimeout(() => {
        const circumference = 440;
        const calculatedOffset = circumference - (circumference * score) / quiz.length;
        setRingOffset(calculatedOffset);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setRingOffset(440);
    }
  }, [quizCompleted, score, quiz.length, soundEnabled]);

  const handleAnalyze = async () => {
    if (!url) return;
    
    try {
      setLoading(true);
      setErrorMsg("");
      setSummary("");
      setQuiz([]);
      setQuizCompleted(false);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setSearchQuery("");
      
      setLoadingStep(1);
      
      const stepTimer1 = setTimeout(() => setLoadingStep(2), 1500);
      const stepTimer2 = setTimeout(() => setLoadingStep(3), 3500);
      const stepTimer3 = setTimeout(() => setLoadingStep(4), 5500);

      const response = await axios.post(
        "http://127.0.0.1:8000/analyze",
        { url: url }
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setLoadingStep(5);
      
      const { summary: summaryText, quiz: quizData } = response.data;
      
      setSummary(summaryText);
      
      if (Array.isArray(quizData)) {
        setQuiz(quizData);
      } else if (quizData && quizData.error) {
        console.error("Quiz structure error:", quizData.raw_response);
        setErrorMsg("Failed to compile quiz questions. Showing key takeaways only.");
      } else {
        setQuiz([]);
      }

      setLoading(false);
      setActiveTab("summary");
    } catch (error) {
      console.error(error);
      setErrorMsg(
        error.response?.data?.detail || 
        "Failed to load video contents. Verify that the URL is correct and the video contains readable transcripts."
      );
      setLoading(false);
    }
  };

  const handleOptionClick = (option) => {
    if (quizSubmitted) return;

    const updatedAnswers = { ...selectedAnswers, [currentQuestionIndex]: option };
    setSelectedAnswers(updatedAnswers);
    setQuizSubmitted(true);

    const currentQuestion = quiz[currentQuestionIndex];
    if (option === currentQuestion.correct_answer) {
      setScore((prev) => prev + 1);
      playSound("correct", soundEnabled);
    } else {
      playSound("incorrect", soundEnabled);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuizSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizCompleted(false);
    setScore(0);
  };

  const copyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsTxt = () => {
    if (!summary) return;
    const element = document.createElement("a");
    const file = new Blob([summary], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `video_summary_${videoId || "download"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetAll = () => {
    setUrl("");
    setVideoId(null);
    setSummary("");
    setQuiz([]);
    setActiveTab("summary");
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setScore(0);
    setErrorMsg("");
    setSearchQuery("");
  };

  const getScoreBadge = () => {
    const percentage = (score / quiz.length) * 100;
    if (percentage === 100) return { text: "Flawless Performance 🏆", class: "perfect" };
    if (percentage >= 80) return { text: "Outstanding Score ⭐", class: "high" };
    if (percentage >= 50) return { text: "Quiz Completed 👍", class: "med" };
    return { text: "Try Again to Improve! 💪", class: "med" };
  };

  // Filtered bullet points based on live search
  const filteredBullets = summary
    ? summary
        .split("\n")
        .map((item) => item.replace(/^-\s*/, "").trim())
        .filter((item) => item.length > 0)
        .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="app-container">
      {/* Confetti canvas overlay triggered on victory */}
      <Confetti active={quizCompleted && score >= 8} />

      {/* Header controls and title */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h1 className="app-title">Video Summarizer & Quiz Generator</h1>
          </div>
          <p className="app-subtitle">Read structured highlights of any video and test your comprehension immediately</p>
        </div>
        
        <div className="header-controls">
          {/* Sound Toggle */}
          <button
            className={`btn-control-circle ${soundEnabled ? "active" : ""}`}
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.35 10.5H2.25a.75.75 0 00-.75.75v1.5c0 .414.336.75.75.75h2.1l2.9 2.25m0-9v9m3-6.75v4.5m3-6.75v9" />
              </svg>
            )}
          </button>

          {/* Theme Toggler */}
          <button
            className="btn-control-circle"
            onClick={() => setIsLightTheme((prev) => !prev)}
            title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLightTheme ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Input Stage */}
      {!summary && !loading && (
        <div className="glass-panel input-section">
          <div className="input-wrapper">
            <div className="input-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <input
              type="text"
              className="url-input"
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {/* Unique Embedding YouTube Player */}
          {videoId && (
            <div className="video-embed-wrapper">
              <iframe
                className="video-embed-iframe"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Embedded YouTube Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={!url || !videoId}
          >
            <span>Analyze Video & Generate Quiz</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="glass-panel" style={{ borderColor: "var(--error-border)", background: "var(--error-bg)" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--error)", marginBottom: "10px" }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Analysis Error</h3>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.6" }}>{errorMsg}</p>
          <button className="btn-secondary" onClick={resetAll} style={{ marginTop: "15px", padding: "8px 16px", fontSize: "0.9rem" }}>
            Try Another URL
          </button>
        </div>
      )}

      {/* Loading Stepper Panel */}
      {loading && (
        <div className="glass-panel loading-panel">
          <div className="loading-spinner-wrapper">
            <div className="loading-spinner"></div>
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "8px" }}>Processing Video Content</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "30px" }}>Compiling captions, summaries, and questions...</p>

          <div className="stepper">
            <div className={`step-item ${loadingStep >= 1 ? (loadingStep === 1 ? "active" : "completed") : ""}`}>
              <div className="step-indicator">
                {loadingStep > 1 ? "✓" : "1"}
              </div>
              <span className="step-text">Connecting and download transcripts from YouTube</span>
            </div>

            <div className={`step-item ${loadingStep >= 2 ? (loadingStep === 2 ? "active" : "completed") : ""}`}>
              <div className="step-indicator">
                {loadingStep > 2 ? "✓" : "2"}
              </div>
              <span className="step-text">Cleaning and indexing text payloads</span>
            </div>

            <div className={`step-item ${loadingStep >= 3 ? (loadingStep === 3 ? "active" : "completed") : ""}`}>
              <div className="step-indicator">
                {loadingStep > 3 ? "✓" : "3"}
              </div>
              <span className="step-text">Compiling summary key takeaways</span>
            </div>

            <div className={`step-item ${loadingStep >= 4 ? (loadingStep === 4 ? "active" : "completed") : ""}`}>
              <div className="step-indicator">
                {loadingStep > 4 ? "✓" : "4"}
              </div>
              <span className="step-text">Designing quiz challenge questions</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Results View (Tabs) */}
      {summary && !loading && (
        <div>
          {/* Tabs bar */}
          <div className="tabs-bar">
            <button
              className={`tab-btn ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Summary</span>
            </button>
            
            {quiz.length > 0 && (
              <button
                className={`tab-btn ${activeTab === "quiz" ? "active" : ""}`}
                onClick={() => setActiveTab("quiz")}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Interactive Quiz</span>
              </button>
            )}

            <button className="tab-btn" onClick={resetAll} style={{ flex: "0 0 auto", color: "var(--text-dim)" }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
              </svg>
              <span>New Video</span>
            </button>
          </div>

          {/* Tab Content 1: Summary */}
          {activeTab === "summary" && (
            <div className="glass-panel summary-container">
              <div className="summary-header">
                <h2 className="summary-title">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Key Takeaways
                </h2>

                {/* Live Search Bar for Takeaways */}
                <div className="search-wrapper">
                  <div className="search-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search takeaways..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="toolbar">
                  <button className={`btn-icon-label ${copied ? "success" : ""}`} onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button className="btn-icon-label" onClick={downloadAsTxt}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="summary-content">
                {filteredBullets.length > 0 ? (
                  <ul>
                    {filteredBullets.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>
                    No matching highlights found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab Content 2: Quiz */}
          {activeTab === "quiz" && quiz.length > 0 && (
            <div className="glass-panel quiz-container">
              {!quizCompleted ? (
                <div>
                  {/* Progress Header */}
                  <div className="quiz-progress-wrapper">
                    <div className="quiz-progress-text">
                      <span>QUESTION {currentQuestionIndex + 1} OF {quiz.length}</span>
                      <span>{Math.round(((currentQuestionIndex + 1) / quiz.length) * 100)}% Complete</span>
                    </div>
                    <div className="quiz-progress-bar-container">
                      <div
                        className="quiz-progress-bar"
                        style={{ width: `${((currentQuestionIndex + 1) / quiz.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="quiz-question-card">
                    <h3 className="quiz-question-title">
                      {quiz[currentQuestionIndex].question}
                    </h3>

                    {/* Options list */}
                    <div className="options-grid">
                      {quiz[currentQuestionIndex].options.map((option, idx) => {
                        const isSelected = selectedAnswers[currentQuestionIndex] === option;
                        const isCorrectOption = option === quiz[currentQuestionIndex].correct_answer;
                        
                        let cardClass = "";
                        if (quizSubmitted) {
                          cardClass += " disabled";
                          if (isCorrectOption) {
                            cardClass += " correct";
                          } else if (isSelected) {
                            cardClass += " incorrect";
                          }
                        } else if (isSelected) {
                          cardClass += " selected";
                        }

                        return (
                          <div
                            key={idx}
                            className={`option-card${cardClass}`}
                            onClick={() => handleOptionClick(option)}
                          >
                            <span>{option}</span>
                            <div className="option-icon-indicator">
                              {quizSubmitted && isCorrectOption && "✓"}
                              {quizSubmitted && isSelected && !isCorrectOption && "✗"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation showing when submitted */}
                  {quizSubmitted && (
                    <div className="explanation-panel">
                      <div className="explanation-title">Explanation</div>
                      <p className="explanation-text">
                        {quiz[currentQuestionIndex].explanation}
                      </p>
                    </div>
                  )}

                  {/* Next / Submit Button */}
                  {quizSubmitted && (
                    <div className="quiz-footer">
                      <button className="btn-primary" onClick={handleNextQuestion}>
                        <span>
                          {currentQuestionIndex === quiz.length - 1 ? "Finish Quiz" : "Next Question"}
                        </span>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Quiz Complete screen */
                <div className="results-container">
                  <div className="results-header">
                    <h2 className="results-title">Quiz Completed!</h2>
                    <p className="results-subtitle">Here's how you performed on this challenge</p>
                  </div>

                  {/* Ring Progress score */}
                  <div className="score-display-wrapper">
                    <div className="score-ring-container">
                      <svg width="160" height="160">
                        <defs>
                          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--primary)" />
                            <stop offset="100%" stopColor="var(--secondary)" />
                          </linearGradient>
                        </defs>
                        <circle className="score-ring-bg" cx="80" cy="80" r="70" />
                        <circle
                          className="score-ring-fill"
                          cx="80"
                          cy="80"
                          r="70"
                          style={{
                            strokeDasharray: 440,
                            strokeDashoffset: ringOffset,
                          }}
                        />
                      </svg>
                      <div className="score-center-text">
                        <span className="score-number">{score}</span>
                        <span className="score-max">OUT OF {quiz.length}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`score-badge ${getScoreBadge().class}`}>
                    {getScoreBadge().text}
                  </span>

                  {/* Review breakdown */}
                  <div className="review-section">
                    <h3 className="review-section-title">Question Breakdown</h3>
                    
                    <div className="review-list">
                      {quiz.map((q, idx) => {
                        const userAns = selectedAnswers[idx];
                        const correctAns = q.correct_answer;
                        const isCorrect = userAns === correctAns;

                        return (
                          <div key={idx} className="review-item">
                            <div className="review-item-header">
                              <span className="review-question">
                                {idx + 1}. {q.question}
                              </span>
                              <span className={`review-status-badge ${isCorrect ? "correct" : "incorrect"}`}>
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </div>

                            <div className="review-option-info">
                              {!isCorrect && (
                                <div className="review-option-label user-choice">
                                  <span>Your answer: {userAns || "(Skipped)"}</span>
                                </div>
                              )}
                              <div className="review-option-label correct-choice">
                                <span>Correct answer: {correctAns}</span>
                              </div>
                            </div>

                            <div className={`review-explanation ${isCorrect ? "correct" : "incorrect"}`}>
                              <strong>Explanation: </strong>
                              {q.explanation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="results-footer">
                    <button className="btn-primary" onClick={handleRetakeQuiz}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                      </svg>
                      <span>Retake Quiz</span>
                    </button>
                    <button className="btn-secondary" onClick={resetAll}>
                      Analyze Another Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;