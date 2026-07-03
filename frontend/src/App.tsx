import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import SurveyDetail from './pages/SurveyDetail';
import Agent from './pages/Agent';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-content">
            <Link to="/" className="logo">
              📊 Survey Analytics
            </Link>
            <div className="nav-links">
              <Link to="/">Dashboard</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/survey/:runId" element={<SurveyDetail />} />
          <Route path="/survey/:runId/agent" element={<Agent />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
