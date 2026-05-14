import React, { useState } from 'react';
import './Login.css'; 
import { auth, db } from '../firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // 1. Authenticate user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch the user's role from Firestore ('users' collection)
      // Make sure the document ID in Firestore is the user's UID
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // 3. Role-based Redirection
        // Check if the role field is exactly 'admin'
        if (userData.role === 'admin') {
          console.log("Welcome Admin");
          navigate('/adminpanel'); // Make sure this matches your Route path in App.js
        } else {
          console.log("Welcome Student");
          navigate('/dashboard'); 
        }
      } else {
        // Fallback: If UID doesn't exist in Firestore, send to student dashboard
        console.warn("No user role found in Firestore");
        navigate('/dashboard');
      }

    } catch (err) {
      console.error(err.code);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="header-banner">
        <div className="plus-icon">✚</div>
        <h1>Nursing MCQ Platform</h1>
      </div>

      <div className="login-card">
        <div className="form-section">
          <h2 style={{color: '#1e3a8a', marginBottom: '5px'}}>Welcome!</h2>
          <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '20px'}}>
            Prepare for your exams with practice tests!
          </p>
          
          <form onSubmit={handleLogin} className="login-form">
            <label style={{color: '#1d4ed8', fontWeight: 'bold', fontSize: '14px'}}>
              User Login
            </label>
            
            <div className="input-group">
              <span className="input-icon"></span>
              <input 
                type="email" 
                placeholder="Email" 
                className="login-input"
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon"></span>
              <input 
                type="password" 
                placeholder="Password" 
                className="login-input"
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p style={{color: 'red', fontSize: '12px', margin: '5px 0'}}>{error}</p>}

            <button type="submit" className="login-button">Login</button>
          </form>

          <p style={{marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#4b5563'}}>
            Don't have an account? <Link to="/signup" style={{color: '#2563eb', fontWeight: 'bold', textDecoration: 'none'}}>Sign Up</Link>
          </p>
        </div>

        <div className="illustration-section">
          <img 
            src="https://img.freepik.com/free-vector/nurses-concept-illustration_114360-323.jpg" 
            alt="Nurse" 
          />
        </div>
      </div>
    </div>
  );
};

export default Login;