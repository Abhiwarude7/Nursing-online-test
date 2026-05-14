import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import QuizPage from './components/QuizPage';
function App() {
  return (
    <Router>
      <Routes>
        {/* Default route goes to Login */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/adminpanel" element={<AdminPanel />} />
        <Route path="/test/:id" element={<QuizPage />} />
      </Routes>
    </Router>
  );
}

export default App;