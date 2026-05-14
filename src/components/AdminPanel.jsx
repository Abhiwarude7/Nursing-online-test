import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast'; 
import './Admin.css';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Menu State

    // Paper Details
    const [paperName, setPaperName] = useState('');
    const [totalMarks, setTotalMarks] = useState('');
    const [scheduledDate, setScheduledDate] = useState(''); 
    const [startTime, setStartTime] = useState('');       
    const [duration, setDuration] = useState('');         
    
    // Question Input States
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState(null);

    // States
    const [tempQuestions, setTempQuestions] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [allPapers, setAllPapers] = useState([]); 
    const [editingPaperId, setEditingPaperId] = useState(null);
    const [studentResults, setStudentResults] = useState([]);
    const [allUsers, setAllUsers] = useState([]); 
    
    // User Management States
    const [selectedResult, setSelectedResult] = useState(null); 
    const [editingUser, setEditingUser] = useState(null);

    const fetchPapers = async () => {
        try {
            const q = query(collection(db, "exam_papers"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            setAllPapers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching papers:", error); }
    };

    const fetchResults = async () => {
        try {
            const q = query(collection(db, "exam_results"), orderBy("submittedAt", "desc"));
            const querySnapshot = await getDocs(q);
            setStudentResults(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching results:", error); }
    };

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            setAllUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching users:", error); }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const userRef = doc(db, "users", editingUser.id);
            await updateDoc(userRef, { name: editingUser.name, email: editingUser.email });
            toast.success("User updated!");
            setEditingUser(null);
            fetchUsers();
        } catch (error) { toast.error("Failed to update user."); }
    };

    const handlePasswordReset = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success("Reset link sent!");
        } catch (error) { toast.error(error.message); }
    };

    const handleDeleteResult = async (resultId) => {
        if (window.confirm("Delete this result?")) {
            try {
                await deleteDoc(doc(db, "exam_results", resultId));
                toast.success("Deleted!");
                fetchResults(); 
            } catch (error) { toast.error("Failed to delete."); }
        }
    };

    useEffect(() => {
        if (activeTab === 'list' || activeTab === 'home') fetchPapers();
        if (activeTab === 'results' || activeTab === 'home') fetchResults();
        if (activeTab === 'users') fetchUsers(); 
    }, [activeTab]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const handleAddOrUpdateQuestion = (e) => {
        e.preventDefault();
        if (correctAnswer === null) return alert("Select correct answer!");
        const updatedQuestion = {
            questionNumber: editIndex !== null ? tempQuestions[editIndex].questionNumber : tempQuestions.length + 1,
            question: questionText, options: [...options], correctAnswer: correctAnswer
        };
        if (editIndex !== null) {
            const updatedList = [...tempQuestions];
            updatedList[editIndex] = updatedQuestion;
            setTempQuestions(updatedList);
            setEditIndex(null);
        } else {
            setTempQuestions([...tempQuestions, updatedQuestion]);
        }
        setQuestionText(''); setOptions(['', '', '', '']); setCorrectAnswer(null);
    };

    const saveFullPaperToFirebase = async () => {
        if (tempQuestions.length === 0) return alert("Add at least one question!");
        if (!scheduledDate || !startTime || !duration) return alert("Fill all details!");
        try {
            const paperData = {
                paperName, totalMarks, scheduledDate, startTime,
                duration: parseInt(duration), questions: tempQuestions,
                updatedAt: serverTimestamp(), totalQuestions: tempQuestions.length, isActive: true 
            };
            if (editingPaperId) {
                await updateDoc(doc(db, "exam_papers", editingPaperId), paperData);
                toast.success("Paper updated!");
            } else {
                await addDoc(collection(db, "exam_papers"), { ...paperData, createdAt: serverTimestamp() });
                toast.success("Paper scheduled!");
            }
            setTempQuestions([]); setPaperName(''); setScheduledDate(''); setStartTime(''); setDuration('');
            setEditingPaperId(null); setActiveTab('list');
        } catch (error) { alert("Error: " + error.message); }
    };

    const toggleStatus = async (id, currentStatus) => {
        await updateDoc(doc(db, "exam_papers", id), { isActive: !currentStatus });
        fetchPapers();
    };

    const loadPaperForEdit = (paper) => {
        setEditingPaperId(paper.id); setPaperName(paper.paperName); setTotalMarks(paper.totalMarks);
        setScheduledDate(paper.scheduledDate || ''); setStartTime(paper.startTime || '');
        setDuration(paper.duration || ''); setTempQuestions(paper.questions);
        switchTab('manage');
    };

    // Sidebar navigation helper for mobile
    const switchTab = (tab) => {
        setActiveTab(tab);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    return (
        <div className="dashboard-container">
            {/* Hamburger Button for Mobile */}
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? '✕' : '☰'}
            </button>

            {/* Sidebar with mobile class toggle */}
            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">Nursing MCQ Admin</div>
                <div className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => switchTab('home')}>🏠 Admin Home</div>
                <div className={`sidebar-item ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => switchTab('manage')}>📝 Create/Schedule</div>
                <div className={`sidebar-item ${activeTab === 'list' ? 'active' : ''}`} onClick={() => switchTab('list')}>📚 Paper List</div>
                <div className={`sidebar-item ${activeTab === 'results' ? 'active' : ''}`} onClick={() => switchTab('results')}>📊 Student Results</div>
                <div className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => switchTab('users')}>👥 User List</div>
                <div className="sidebar-item" onClick={handleLogout} style={{ marginTop: 'auto' }}>🚪 Logout</div>
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className="main-content">
                <header className="top-nav">
                    <h2>Nursing MCQ Admin Portal</h2>
                </header>

                <div className="content-body">
                    {activeTab === 'manage' ? (
                        <div className="paper-creator">
                             <div className="creator-header-main">
                                <h1>{editingPaperId ? "✏️ Edit Schedule" : "➕ Schedule New Paper"}</h1>
                                <button className="final-save-btn" onClick={saveFullPaperToFirebase}>
                                    {editingPaperId ? "Update Schedule" : "🚀 Save & Launch"}
                                </button>
                            </div>
                            <div className="schedule-config-bar">
                                <div className="input-group">
                                    <label>Paper Name</label>
                                    <input type="text" value={paperName} onChange={(e)=>setPaperName(e.target.value)} placeholder="Anatomy Exam" />
                                </div>
                                <div className="input-group">
                                    <label>Exam Date</label>
                                    <input type="date" value={scheduledDate} onChange={(e)=>setScheduledDate(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label>Start Time</label>
                                    <input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label>Duration (Min)</label>
                                    <input type="number" value={duration} onChange={(e)=>setDuration(e.target.value)} placeholder="60" />
                                </div>
                            </div>
                            
                            <div className="admin-layout-grid">
                                <div className="test-card editor-card">
                                    <h3>Add Question</h3>
                                    <form onSubmit={handleAddOrUpdateQuestion}>
                                        <textarea className="admin-textarea" value={questionText} onChange={(e)=>setQuestionText(e.target.value)} required />
                                        <div className="options-container">
                                            {options.map((opt, i) => (
                                                <div key={i} className={`opt-box ${correctAnswer === i ? 'is-correct' : ''}`}>
                                                    <input type="text" value={opt} onChange={(e)=>{
                                                        const newOpts = [...options]; newOpts[i] = e.target.value; setOptions(newOpts);
                                                    }} required />
                                                    <button type="button" onClick={()=>setCorrectAnswer(i)}>{correctAnswer === i ? '✅' : 'Set'}</button>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="submit" className="save-btn">{editIndex !== null ? 'Update' : 'Add to List'}</button>
                                    </form>
                                </div>
                                <div className="test-card list-card">
                                    <h3>Preview ({tempQuestions.length})</h3>
                                    <div className="questions-scroll">
                                        {tempQuestions.map((q, index) => (
                                            <div key={index} className="saved-q-item">
                                                <p><strong>Q{index+1}.</strong> {q.question.substring(0, 40)}...</p>
                                                <div className="q-actions">
                                                    <button onClick={() => { setQuestionText(q.question); setOptions(q.options); setCorrectAnswer(q.correctAnswer); setEditIndex(index); }}>✏️</button>
                                                    <button onClick={() => setTempQuestions(tempQuestions.filter((_, i) => i !== index))}>❌</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'list' ? (
                        <div className="paper-list-section">
                            <h1>All Scheduled Papers</h1>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Paper Name</th>
                                            <th>Schedule</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allPapers.map(paper => (
                                            <tr key={paper.id}>
                                                <td><strong>{paper.paperName}</strong></td>
                                                <td>{paper.scheduledDate} | {paper.startTime}</td>
                                                <td><span className={`status-badge ${paper.isActive ? 'active' : 'inactive'}`}>{paper.isActive ? "Active" : "Off"}</span></td>
                                                <td>
                                                    <button onClick={() => toggleStatus(paper.id, paper.isActive)}>OnOff</button>
                                                    <button onClick={() => loadPaperForEdit(paper)}>✏️</button>
                                                    <button onClick={async () => {if(window.confirm("Delete?")){ await deleteDoc(doc(db,"exam_papers",paper.id)); fetchPapers();}}}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeTab === 'users' ? (
                        <div className="paper-list-section">
                            <h1>Registered Students List</h1>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Email</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allUsers.map((user) => (
                                            <tr key={user.id}>
                                                <td><strong>{user.name || "N/A"}</strong></td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <button onClick={() => setEditingUser(user)}>✏️</button>
                                                    <button onClick={() => handlePasswordReset(user.email)}>🔑 Reset</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {editingUser && (
                                <div className="modal-overlay" style={modalOverlayStyle}>
                                    <div className="result-modal" style={modalStyle}>
                                        <h3>Edit Profile</h3>
                                        <form onSubmit={handleUpdateUser}>
                                            <input type="text" style={{width:'100%', padding:'10px', marginBottom:'10px'}} value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} />
                                            <input type="email" style={{width:'100%', padding:'10px', marginBottom:'10px'}} value={editingUser.email} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} />
                                            <div style={{display:'flex', gap:'10px'}}>
                                                <button type="submit" className="save-btn">Save</button>
                                                <button type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'results' ? (
                        <div className="paper-list-section">
                            <h1>Student Results</h1>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Paper</th>
                                            <th>Score</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentResults.map((res) => (
                                            <tr key={res.id}>
                                                <td>{res.studentName}</td>
                                                <td>{res.testTitle || res.paperName}</td>
                                                <td>{res.correctAnswers} / {res.totalQuestions}</td>
                                                <td>
                                                    <button onClick={() => setSelectedResult(res)}>👁️</button>
                                                    <button onClick={() => handleDeleteResult(res.id)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {selectedResult && (
                                <div className="modal-overlay" style={modalOverlayStyle}>
                                    <div className="result-modal" style={modalStyle}>
                                        <h2>Exam Report</h2>
                                        <p><strong>Student:</strong> {selectedResult.studentName}</p>
                                        <p><strong>Exam:</strong> {selectedResult.testTitle || selectedResult.paperName}</p>
                                        <p><strong>Score:</strong> {((selectedResult.correctAnswers / selectedResult.totalQuestions) * 100).toFixed(2)}%</p>
                                        <button onClick={() => setSelectedResult(null)} style={closeBtnStyle}>Close</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="home-hero">
                            <h1>Welcome Abhishek</h1>
                            <div className="stats-row">
                                <div className="stat-card"><h3>{allPapers.length}</h3><p>Papers</p></div>
                                <div className="stat-card"><h3>{studentResults.length}</h3><p>Results</p></div>
                                <div className="stat-card"><h3>{allUsers.length}</h3><p>Students</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ... Inline styles variables (modalOverlayStyle, modalStyle, closeBtnStyle) same as before

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '450px' };
const closeBtnStyle = { width: '100%', marginTop: '20px', padding: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' };

export default AdminPanel;