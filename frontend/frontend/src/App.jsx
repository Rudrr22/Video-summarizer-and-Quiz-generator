import { useState } from "react";
import axios from "axios";

function App() {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        "http://127.0.0.1:8000/analyze",
        {
          url: url,
        }
      );

      setSummary(response.data.summary);
      setQuiz(response.data.quiz);

      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("Error analyzing video");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>AI Video Summarizer & Quiz Generator</h1>

      <input
        type="text"
        placeholder="Paste YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button onClick={handleAnalyze}>
        Analyze Video
      </button>

      {loading && <p>Generating summary and quiz...</p>}

      {summary && (
        <div>
          <h2>Summary</h2>
          <pre>{summary}</pre>
        </div>
      )}

      {quiz.length > 0 && (
        <div>
          <h2>Quiz</h2>

          {quiz.map((q, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "8px",
              }}
            >
              <h3>
                Q{index + 1}. {q.question}
              </h3>

              {q.options.map((option, optionIndex) => (
                <p key={optionIndex}>
                  {option}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;