import React, { useState, useEffect } from 'react';
import { auth, db  } from '../firebase';
import Tesseract from "tesseract.js";
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
//import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast'; 
import './Admin.css';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Menu State
    
    // STATES ADD करा
const [searchPaper, setSearchPaper] = useState('');
const [searchDate, setSearchDate] = useState('');
const [searchStudent, setSearchStudent] = useState('');

    // Paper Details
    const [paperName, setPaperName] = useState('');
    const [totalMarks, setTotalMarks] = useState('');
    const [scheduledDate, setScheduledDate] = useState(''); 
    const [startTime, setStartTime] = useState('');       
    const [duration, setDuration] = useState('');      
    const [selectedPaper, setSelectedPaper] = useState(null);   
    
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

    // Upload States
    const [uploadFile, setUploadFile] =useState(null);
    const [convertedText, setConvertedText] =useState("");
    const [ocrLoading, setOcrLoading] =useState(false);
    const [uploadedPapers, setUploadedPapers] =useState([]);
  
    // FILTER LOGIC ADD करा
const filteredResults = studentResults.filter((res) => {

  const paperMatch =
    (res.testTitle || res.paperName || '')
      .toLowerCase()
      .includes(searchPaper.toLowerCase());

  const studentMatch =
    (res.studentName || '')
      .toLowerCase()
      .includes(searchStudent.toLowerCase());

  const dateMatch =
    searchDate === ''
      ? true
      : res.scheduledDate === searchDate;

  return (
    paperMatch &&
    studentMatch &&
    dateMatch
  );
});
    // Fetch Papers
    const fetchPapers = async () => {
        try {
            const q = query(collection(db, "exam_papers"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            setAllPapers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching papers:", error); }
    };
   
    // Fetch Results

    const fetchResults = async () => {
        try {
            const q = query(collection(db, "exam_results"), orderBy("submittedAt", "desc"));
            const querySnapshot = await getDocs(q);
            setStudentResults(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching results:", error); }
    };

    // Fetch Users
    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            setAllUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching users:", error); }
    };

     const fetchUploadedPapers = async () => {

    try {

        const querySnapshot = await getDocs(
            collection(db, "uploaded_papers")
        );

        setUploadedPapers(
            querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        );

    } catch (error) {

        console.log(error);
    }
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
        if (activeTab === 'upload') fetchUploadedPapers();
        if (activeTab === 'home')
        fetchStudentUploads();

    }, [activeTab]);
   
      // Logout
    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };
     // Add Question
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
     // Save Paper

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
    // OCR Convert
    const handleConvertPaper = async () => {

        if (!uploadFile) {

            alert("Select image first!");

            return;
        }

        try {

            setOcrLoading(true);

            const result = await Tesseract.recognize(
            uploadFile,
            'eng+mar',
            {
                logger: (m) => console.log(m)
            }
        );

            setConvertedText(
                result.data.text
            );

        } catch (error) {

            console.error(error);

        } finally {

            setOcrLoading(false);
        }
    };

    const handleDeleteUploadPaper = async (id) => {

    const confirmDelete = window.confirm(
        "Delete this uploaded paper?"
    );

    if (!confirmDelete) return;

    try {

        await deleteDoc(
            doc(db, "uploaded_papers", id)
        );

        toast.success("Deleted Successfully");

        fetchUploadedPapers();

    } catch (error) {

        console.log(error);

        toast.error("Delete Failed");
    }
};

    const handleSavePaper = async () => {

    if (!paperName || !convertedText) {
        toast.error("Fill all fields");
        return;
    }

    try {

        const newPaper = {
            paperName,
            convertedText,
            isActive: true,
            createdAt: serverTimestamp()
        };

        await addDoc(
            collection(db, "uploaded_papers"),
            newPaper
        );

        toast.success("Paper Saved");

        setPaperName('');
        setConvertedText('');
        setUploadFile(null);

        fetchUploadedPapers();

    } catch (error) {

        console.log(error);

        toast.error("Save Failed");
    }
};
// Toggle Upload Status
    const toggleUploadStatus = async ( id,currentStatus) => {
        await updateDoc(
            doc(
                db,
                "uploaded_papers",
                id
            ),
            {
                isActive: !currentStatus
            }
        );

        fetchUploadedPapers();
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

    const [studentUploads, setStudentUploads] =
useState([]);

const fetchStudentUploads = async () => {

  const querySnapshot =
    await getDocs(
      collection(
        db,
        "student_uploaded_images"
      )
    );

  setStudentUploads(
    querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  );
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
                <div className={`sidebar-item ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => switchTab('upload')}>📄 Upload Paper</div>
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
                    {/* Upload Section */}
        {activeTab === 'upload' ? (

            <div className="paper-list-section">

                <h1>Upload Question Paper</h1>

                <div className="test-card">

                    <input
                        type="text"
                        placeholder="Paper Name"
                        value={paperName}
                        onChange={(e) =>
                            setPaperName(e.target.value)
                        }
                    />

                    <br /><br />

                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setUploadFile(
                                e.target.files[0]
                            )
                        }
                    />

                    <br /><br />

                    <button
                        className="save-btn"
                        onClick={handleConvertPaper}
                    >
                        {
                            ocrLoading
                                ? "Converting..."
                                : "Convert Image To Text"
                        }
                    </button>

                    <br /><br />

                    <textarea
                        rows="12"
                        value={convertedText}
                        onChange={(e) =>
                            setConvertedText(
                                e.target.value
                            )
                        }
                        placeholder="Converted text..."
                        style={{
                            width: "100%",
                            padding: "10px"
                        }}
                    />

                    <br /><br />

                    <button
                        className="final-save-btn"
                        onClick={handleSavePaper}
                    >
                        Save Paper
                    </button>

                </div>

                <br />

                <h2>Uploaded Papers</h2>

                <div className="admin-table-container">

                    <table className="admin-table">

                        <thead>
                            <tr>
                                <th>Paper</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>

                            {uploadedPapers.map((paper) => (

                                <tr key={paper.id}>

                                    <td>
                                        {paper.paperName}
                                    </td>

                                    <td>

                                        <span
                                            className={`status-badge ${paper.isActive ? 'active' : 'inactive'}`}
                                        >
                                            {
                                                paper.isActive
                                                    ? "Active"
                                                    : "Off"
                                            }
                                        </span>

                                    </td>

                                    <td>

                                        <button className="upload-toggle-btn"
                                            onClick={() =>
                                                toggleUploadStatus(
                                                    paper.id,
                                                    paper.isActive
                                                )
                                            }
                                        >
                                            OnOff
                                        </button>

                                        <a
                                            href={paper.fileURL}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                        <button  className="open-paper-btn" onClick={() =>
        setSelectedPaper(paper)
    }
>
    Open
</button>
                                            <button
                    className="delete-btn"
                    onClick={() =>
                        handleDeleteUploadPaper(
                            paper.id
                        )
                    }
                >
                    🗑️ Delete
                </button>
                                        </a>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        ) 
                    :activeTab === 'manage' ? (
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

    {/* FILTER SECTION */}
    <div
      style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}
    >

      {/* Search Student */}
      <input
        type="text"
        placeholder="Search Student"
        value={searchStudent}
        onChange={(e) =>
          setSearchStudent(e.target.value)
        }
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}
      />

      {/* Search Paper */}
      <input
        type="text"
        placeholder="Search Paper"
        value={searchPaper}
        onChange={(e) =>
          setSearchPaper(e.target.value)
        }
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}
      />

      {/* Date Filter */}
      <input
        type="date"
        value={searchDate}
        onChange={(e) =>
          setSearchDate(e.target.value)
        }
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}
      />

    </div>

    <div className="admin-table-container">

      <table className="admin-table">

        <thead>

          <tr>
            <th>Seq No</th>
            <th>Date</th>
            <th>Student</th>
            <th>Paper</th>
            <th>Score</th>
            <th>Actions</th>
          </tr>

        </thead>

        <tbody>

          {filteredResults.map((res, index) => (

            <tr key={res.id}>

              <td>{index + 1}</td>

              <td>
                {res.scheduledDate || '-'}
              </td>

              <td>
                {res.studentName}
              </td>

              <td>
                {res.testTitle || res.paperName}
              </td>

              <td>
                {res.correctAnswers}
                {" / "}
                {res.totalQuestions}
              </td>

              <td>

                <button
                  onClick={() =>
                    setSelectedResult(res)
                  }
                >
                  👁️
                </button>

                <button
                  onClick={() =>
                    handleDeleteResult(res.id)
                  }
                >
                  🗑️
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

    {/* RESULT MODAL */}
    {selectedResult && (

      <div
        className="modal-overlay"
        style={modalOverlayStyle}
      >

        <div
          className="result-modal"
          style={modalStyle}
        >

          <h2>Exam Report</h2>

          <p>
            <strong>Student:</strong>
            {" "}
            {selectedResult.studentName}
          </p>

          <p>
            <strong>Exam:</strong>
            {" "}
            {selectedResult.testTitle ||
              selectedResult.paperName}
          </p>

          <p>
            <strong>Date:</strong>
            {" "}
            {selectedResult.scheduledDate || '-'}
          </p>

          <p>
            <strong>Score:</strong>
            {" "}
            {(
              (
                selectedResult.correctAnswers /
                selectedResult.totalQuestions
              ) * 100
            ).toFixed(2)}%
          </p>

          <button
            onClick={() =>
              setSelectedResult(null)
            }
            style={closeBtnStyle}
          >
            Close
          </button>

        </div>

      </div>

    )}

  </div>
) :(
    <div className="home-hero">

        <h1>Welcome Abhishek</h1>

        {/* STATS */}

        <div className="stats-row">

            <div className="stat-card">
                <h3>{allPapers.length}</h3>
                <p>Papers</p>
            </div>

            <div className="stat-card">
                <h3>{studentResults.length}</h3>
                <p>Results</p>
            </div>

            <div className="stat-card">
                <h3>{allUsers.length}</h3>
                <p>Students</p>
            </div>

        </div>

        {/* STUDENT UPLOADED IMAGES */}

        <h2
            style={{
                marginTop: "40px",
                marginBottom: "20px"
            }}
        >
            Student Uploaded Images
        </h2>

        {

            studentUploads.length > 0 ? (

                <div className="cards-grid">

                    {

                        studentUploads.map((item) => (

                            <div
                                key={item.id}
                                className="test-card"
                            >

                                <img
                                    src={item.imageURL}
                                    alt="student-upload"
                                    style={{
                                        width: "100%",
                                        height: "220px",
                                        objectFit: "cover",
                                        borderRadius: "10px"
                                    }}
                                />

                                <h3
                                    style={{
                                        marginTop: "10px"
                                    }}
                                >
                                    {item.studentName}
                                </h3>

                                <p>
                                    {item.imageName}
                                </p>

                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "#666"
                                    }}
                                >
                                    {item.studentEmail}
                                </p>

                                <a
                                    href={item.imageURL}
                                    target="_blank"
                                    rel="noreferrer"
                                >

                                    <button
                                        className="open-paper-btn"
                                    >
                                        👁 View Full
                                    </button>

                                </a>

                            </div>

                        ))

                    }

                </div>

            ) : (

                <div className="no-tests">

                    <p>
                        No Student Uploads Found
                    </p>

                </div>

            )

        }

    </div>

)}

                    {/* ADD HERE 👇 */}

{selectedPaper && (

    <div
        className="modal-overlay"
        style={modalOverlayStyle}
    >

        <div
            className="result-modal"
            style={{
                ...modalStyle,
                maxWidth: "700px"
            }}
        >

            <h2>
                {selectedPaper.paperName}
            </h2>

            <textarea
                value={selectedPaper.convertedText}
                readOnly
                rows="20"
                style={{
                    width: "100%",
                    padding: "10px",
                    marginTop: "15px"
                }}
            />

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "15px"
                }}
            >

                <button
                    className="save-btn"
                    onClick={() => {

                        const blob = new Blob(
                            [selectedPaper.convertedText],
                            {
                                type: "text/plain"
                            }
                        );

                        const url =
                            window.URL.createObjectURL(blob);

                        const a =
                            document.createElement("a");

                        a.href = url;

                        a.download =
                            `${selectedPaper.paperName}.txt`;

                        a.click();

                        window.URL.revokeObjectURL(url);
                    }}
                >
                    ⬇ Download
                </button>

                <button
                    style={closeBtnStyle}
                    onClick={() =>
                        setSelectedPaper(null)
                    }
                >
                    Close
                </button>

            </div>

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