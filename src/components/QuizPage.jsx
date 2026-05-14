import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import './QuizPage.css';

const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [timeLeft, setTimeLeft] = useState(null); // CRITICAL: Start as null
  const [isSubmitting, setIsSubmitting] = useState(false);

  const testData = location.state;

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !testData || timeLeft === null) return;
    setIsSubmitting(true);

    let score = 0;
    const { questions, title, id } = testData;

    questions.forEach((q, index) => {
      if (selectedOptions[index] === q.correctAnswer) {
        score++;
      }
    });

    try {
      await addDoc(collection(db, "exam_results"), {
        studentEmail: auth.currentUser.email,
        studentName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        testId: id,
        testTitle: title,
        totalQuestions: questions.length,
        correctAnswers: score,
        scorePercentage: ((score / questions.length) * 100).toFixed(2),
        submittedAt: serverTimestamp()
      });

      toast.success("Test submitted successfully!");
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Error submitting test.");
      setIsSubmitting(false);
    }
  }, [isSubmitting, testData, selectedOptions, navigate, timeLeft]);

  useEffect(() => {
    const verifyAndStart = async () => {
      if (!testData) {
        navigate('/dashboard');
        return;
      }
      
      if (auth.currentUser) {
        const q = query(
          collection(db, "exam_results"),
          where("studentEmail", "==", auth.currentUser.email),
          where("testId", "==", testData.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast.error("You have already submitted this test!");
          navigate('/dashboard');
        } else {
          setTimeLeft(testData.duration * 60);
        }
      }
    };
    verifyAndStart();
  }, [testData, navigate]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  if (!testData || timeLeft === null) return <div className="loading">Initializing Secure Exam Environment...</div>;

  const { questions, title } = testData;
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <div className="header-info">
          <h1>{title}</h1>
          <span className={`timer ${timeLeft < 60 ? 'timer-low' : ''}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      <div className="quiz-layout">
        <main className="question-section">
          <div className="question-card">
            <div className="q-header">
              <span className="q-count">Question {currentQ + 1} of {questions.length}</span>
              <span className="q-points">Score: +1 | Negative: 0</span>
            </div>
            
            <h3 className="question-text">{questions[currentQ].question}</h3>
            
            <div className="options-grid">
              {questions[currentQ].options.map((opt, i) => (
                <button 
                  key={i} 
                  className={`option-btn ${selectedOptions[currentQ] === i ? 'selected' : ''}`}
                  onClick={() => setSelectedOptions({ ...selectedOptions, [currentQ]: i })}
                >
                  <span className="option-index">{String.fromCharCode(65 + i)}</span>
                  <span className="option-label">{opt}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-controls">
            <button className="ctrl-btn back" disabled={currentQ === 0} onClick={() => setCurrentQ(prev => prev - 1)}>Previous</button>
            {currentQ === questions.length - 1 ? (
              <button className="ctrl-btn finish" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Finish Test"}
              </button>
            ) : (
              <button className="ctrl-btn next" onClick={() => setCurrentQ(prev => prev + 1)}>Next Question</button>
            )}
          </div>
        </main>

        <aside className="question-palette">
          <h4>Exam Palette</h4>
          <div className="palette-grid">
            {questions.map((_, i) => (
              <div 
                key={i} 
                className={`palette-item ${currentQ === i ? 'active' : ''} ${selectedOptions[i] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentQ(i)}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuizPage;