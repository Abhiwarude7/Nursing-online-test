import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState('Student');
  const [activeTests, setActiveTests] = useState([]);
  const [userCompletedTests, setUserCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mobile Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (user) {
      setUserName(user.displayName || user.email.split('@')[0]);
      fetchData();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch Tests
      const qTests = query(collection(db, "exam_papers"));
      const testSnap = await getDocs(qTests);

      const allPapersData = testSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const currentlyActive = allPapersData.filter(
        test => test.isActive === true
      );

      setActiveTests(currentlyActive);

      // Fetch User Results
      const qResults = query(
        collection(db, "exam_results"),
        where("studentEmail", "==", auth.currentUser.email)
      );

      const resultSnap = await getDocs(qResults);

      const allUserResults = resultSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUserCompletedTests(allUserResults.map(res => res.testId));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("डेटा लोड करताना त्रुटी आली.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (test) => {
    const now = new Date();

    const testStartTime = new Date(
      `${test.scheduledDate}T${test.startTime}`
    );

    if (now < testStartTime) {
      toast.warn(
        `हा पेपर अजून सुरू झाला नाही! हा ${test.startTime} वाजता सुरू होईल.`
      );
      return;
    }

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

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="close-btn" onClick={toggleSidebar}>
            ✕
          </span>

          <h3 className="menu-title">Menu</h3>
        </div>

        <div className="sidebar-item active">
          <span>🏠</span> Dashboard
        </div>

        <div
          className="sidebar-item logout-item"
          onClick={handleLogout}
        >
          <span>🚪</span> Logout
        </div>
      </div>

      {/* Main Content */}
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

          <h2 className="section-title">
            Available Tests
          </h2>

          {loading ? (
            <p>Loading tests...</p>
          ) : activeTests.length > 0 ? (
            <div className="cards-grid">
              {activeTests.map((test) => (
                <div key={test.id} className="test-card">
                  <h3>{test.paperName}</h3>

                  <p>
                    <strong>Total Marks:</strong>{" "}
                    {test.totalMarks}
                  </p>

                  <p>
                    <strong>Time:</strong>{" "}
                    {test.startTime} ({test.duration} Mins)
                  </p>

                  {userCompletedTests.includes(test.id) ? (
                    <button
                      className="start-btn submitted"
                      disabled
                    >
                      Already Submitted ✅
                    </button>
                  ) : (
                    <button
                      className="start-btn"
                      onClick={() => handleStartTest(test)}
                    >
                      Start Test
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-tests">
              <p>
                सध्या कोणतेही पेपर्स ॲक्टिव्ह नाहीत.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;