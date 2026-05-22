import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc }from 'firebase/firestore';//, deleteDoc, doc
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbyYufvDHPaUwb95oZkcwF9MH-Dvdxt66sTgI7gt8KZ6vuaVQxRyGnFncj0qKzZ1iHGGBg/exec";
  const [userName, setUserName] = useState('Student');
  const [activeTests, setActiveTests] = useState([]);
  const [uploadedPapers, setUploadedPapers] = useState([]);
  const [userCompletedTests, setUserCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(
        user.displayName ||
        user.email.split('@')[0]
      );
      fetchData();
    } else {
      navigate('/login');
    }

  }, [navigate]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const qTests = query(
        collection(db, "exam_papers")
      );
      const testSnap = await getDocs(qTests);
      const allPapersData =
        testSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      const currentlyActive =
        allPapersData.filter(
          test => test.isActive === true
        );
      setActiveTests(currentlyActive);
      const uploadQuery = query(
        collection(db, "uploaded_papers")
      );

      const uploadSnap =
        await getDocs(uploadQuery);

      const uploadData =
        uploadSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      const activeUploads =
        uploadData.filter(
          paper => paper.isActive === true
        );

      setUploadedPapers(activeUploads);

      // FETCH RESULTS
      const qResults = query(
        collection(db, "exam_results"),
        where(
          "studentEmail",
          "==",
          auth.currentUser.email
        )
      );

      const resultSnap =
        await getDocs(qResults);

      const allUserResults =
        resultSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      setUserCompletedTests(
        allUserResults.map(
          res => res.testId
        )
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "डेटा लोड करताना त्रुटी आली."
      );

    } finally {

      setLoading(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("कृपया फक्त PDF फाईल निवडा!");
      return;
    }

    setUploadingToDrive(true);
    toast.info("Data फाईल अपलोड होत आहे...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        const customFileName = `${userName}_${file.name}`;

        // Drive वर पाठवण्यासाठी
        await fetch(DRIVE_UPLOAD_URL, {
          method: "POST",
          mode: 'no-cors',
          body: JSON.stringify({ fileName: customFileName, fileData: base64Data }),
        });

        // Firestore मध्ये नोंद
        await addDoc(collection(db, "uploaded_papers"), {
          paperName: customFileName,
          isActive: true,
          uploadedBy: auth.currentUser.email,
          timestamp: new Date()
        });

        toast.success("PDF यशस्वीरित्या अपलोड झाली!");
        fetchData();
      };
    } catch (error) {
      toast.error("अपलोड अयशस्वी!");
    } finally {
      setUploadingToDrive(false);
      e.target.value = null;
    }
  };

  // --- Delete Record Logic ---
  /*const handleDeletePaper = async (paperId) => {
    if (window.confirm("तुम्हाला हा रेकॉर्ड डिलीट करायचा आहे का?")) {
      try {
        await deleteDoc(doc(db, "uploaded_papers", paperId));
        toast.success("रेकॉर्ड डिलीट झाले!");
        fetchData();
      } catch (error) {
        toast.error("डिलीट करताना त्रुटी आली.");
      }
    }
  };*/

const handleStartTest = (test) => {

  const now = new Date();

  //  date
  const today =
    now.toISOString().split('T')[0];

  // Firestore  exam date
  const examDate =
    test.scheduledDate;

  // Today Not any exam date
  if (today !== examDate) {

    toast.error(
      "आज या पेपरची दिनांक नाही!"
    );

    return;
  }

  // Start Time
  const testStartTime =
    new Date(
      `${test.scheduledDate}T${test.startTime}`
    );

  // Toady paper Not Start
  if (now < testStartTime) {

    toast.warn(
      "हा पेपर अजून सुरू झाला नाही!"
    );

    return;
  }

  // Start Test
  navigate(`/test/${test.id}`, {
    state: {
      id: test.id,
      questions: test.questions,
      duration: test.duration,
      title: test.paperName
    }
  });
};

  const handleLogout = async () => {

    await signOut(auth);

    navigate('/login');
  };

  const toggleSidebar = () => {

    setIsSidebarOpen(!isSidebarOpen);
  };

  return (

    <div className="dashboard-container">

      <ToastContainer />

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>

        <div className="sidebar-header">

          <span
            className="close-btn"
            onClick={toggleSidebar}
          >
            ✕
          </span>

          <h3 className="menu-title">
            Menu
          </h3>

        </div>

        <div className="sidebar-item active">
          🏠 Dashboard
        </div>

        <div
          className="sidebar-item logout-item"
          onClick={handleLogout}
        >
          🚪 Logout
        </div>

      </div>

      <div className="main-content">

        <header className="top-nav">

          <div
            className="hamburger-menu"
            onClick={toggleSidebar}
          >
            ☰
          </div>

          <div className="nav-brand">
            <div className="nav-logo">✚</div>
            <h2>Online Nursing MCQ</h2>
          </div>

        </header>

        <main className="content-body">

          <h1 className="welcome-text">
            Welcome, {userName}!
          </h1>
          {/* Upload Section */}
          <div className="upload-section" style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>📁 Upload PDF Question Paper</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>तुमची प्रश्नपत्रिका निवडा ({userName}_ या नावाने सेव्ह होईल).</p>
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} disabled={uploadingToDrive} style={{ marginTop: '10px' }} />
            {uploadingToDrive && <p style={{ color: 'blue' }}>अपलोड होत आहे...</p>}
          </div>

          {/* TESTS */}
          <h2 className="section-title">
            Available Tests
          </h2>

          {loading ? (
            <p>Loading...</p>
          ) : (

            <div className="cards-grid">

              {activeTests.map((test) => (

                <div
                  key={test.id}
                  className="test-card"
                >

                  <h3>{test.paperName}</h3>

                  <p>
                    <strong>Total Marks:</strong>
                    {" "}
                    {test.totalMarks}
                  </p>

                  <p>
                    <strong>Time:</strong>
                    {" "}
                    {test.startTime}
                    {" "}
                    ({test.duration} Min)
                  </p>

                  {userCompletedTests.includes(test.id) ? (

                    <button
                      className="start-btn submitted"
                      disabled
                    >
                      Already Submitted ✅
                    </button>

                  ) : (

                    <button className="start-btn" onClick={() => handleStartTest(test) }> Start Test </button> )}
                </div>
              ))}
            </div>

          )}

          {/* UPLOADED PAPERS */}
          <h2 className="section-title">
            Uploaded Papers
          </h2>

          <div className="cards-grid">

            {uploadedPapers.map((paper) => (

              <div
                key={paper.id}
                className="test-card"
              >

                <h3>
                  {paper.paperName}
                </h3>

                <p>
                  Uploaded Question Paper
                </p>
                
                <button
                  className="download-btn"
                  onClick={() => {

                    const blob = new Blob(
                      [paper.convertedText],
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
                      `${paper.paperName}.txt`;

                    a.click();

                    window.URL.revokeObjectURL(url);
                  }}
                >
                  ⬇ Download Paper
                </button>
                {/* Delete Button */}
          {/*
          <button 
            onClick={() => handleDeletePaper(paper.id)} 
            style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            🗑️ Delete Record
          </button>
          */}

              </div>

            ))}

          </div>

        </main>

      </div>

    </div>
  );
};

export default Dashboard;