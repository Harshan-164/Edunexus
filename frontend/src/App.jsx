import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Revise from './pages/Revise';
import Test from './pages/Test';

export default function App() {
  const [currentMode, setMode] = useState('home');
  const [studentId, setStudentId] = useState('student_1');
  const [learnerSummary, setLearnerSummary] = useState(null);

  useEffect(() => { fetchLearnerSummary(); }, [studentId]);

  const fetchLearnerSummary = async () => {
    try {
      const res = await fetch(`/api/learner/${studentId}`);
      if (res.ok) setLearnerSummary(await res.json());
    } catch (err) {
      console.error('Error fetching learner summary:', err);
    }
  };

  return (
    <div className="app-shell">
      <Navbar currentMode={currentMode} setMode={setMode} studentId={studentId} setStudentId={setStudentId} learnerSummary={learnerSummary} />
      <main className="app-main">
        <div className="page-transition" key={currentMode}>
          {currentMode === 'home' && <Home setMode={setMode} />}
          {currentMode === 'learn' && <Learn studentId={studentId} onRefreshProfile={fetchLearnerSummary} />}
          {currentMode === 'revise' && <Revise studentId={studentId} onRefreshProfile={fetchLearnerSummary} />}
          {currentMode === 'test' && <Test studentId={studentId} onRefreshProfile={fetchLearnerSummary} />}
        </div>
      </main>
      <footer className="site-footer"><strong>EduNexus</strong><span>Adaptive mastery engine</span><span>© 2026</span></footer>
    </div>
  );
}
