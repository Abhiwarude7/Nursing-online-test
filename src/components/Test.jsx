// src/Test.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function Test({ testId }) {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchTest = async () => {
      const docRef = doc(db, "tests", testId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuestions(docSnap.data().questions);
      }
    };
    fetchTest();
  }, [testId]);

  return (
    <div>
      <h2>Test</h2>
      {questions.map((q, i) => (
        <div key={i}>
          <p>{q.question}</p>
          {q.options.map((opt, j) => (
            <button key={j}>{opt}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Test;
