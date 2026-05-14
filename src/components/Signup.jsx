import React, { useState } from 'react';
import { auth, db } from '../firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Toast import કરો
import './Signup.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    // પાસવર્ડ મેચ ચેક
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    setLoading(true);

    try {
      // 1. Firebase Auth માં યુઝર બનાવો
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Firestore માં યુઝરનો રોલ સેવ કરો
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        role: 'student', 
        createdAt: new Date().toISOString()
      });

      toast.success("Account created successfully!");
      navigate('/login'); 
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-banner">
        <div className="plus-icon">✚</div>
        <h1>Nursing MCQ Platform</h1>
      </div>

      <div className="auth-card">
        <div className="form-content">
          <h2 className="form-title">Create Account</h2>
          <p className="form-subtitle">Join thousands of nursing students today.</p>
          
          <form onSubmit={handleSignup} className="signup-form">
            <h3>Student Registration</h3>
            
            <div className="input-group">
              <span className="input-icon"></span>
              <input 
                type="email" 
                placeholder="Email Address" 
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon"></span>
              <input 
                type="password" 
                placeholder="Password" 
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon"></span>
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Creating Account..." : "Register Now"}
            </button>
          </form>

          <p className="footer-link">
            Already have an account? <Link to="/login" style={{color: '#2563eb', fontWeight: 'bold', textDecoration: 'none'}}>Login</Link>
          </p>
        </div>

        <div className="image-section">
          <img src="https://img.freepik.com/free-vector/nurses-concept-illustration_114360-323.jpg" alt="Signup Illustration" />
        </div>
      </div>
    </div>
  );
};

export default Signup;