import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SmartNotes from './pages/SmartNotes';
import MyNotes from './pages/MyNotes';
import Study from './pages/Study';
import History from './pages/History';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="smart-notes" element={<SmartNotes />} />
          <Route path="my-notes" element={<MyNotes />} />
          <Route path="study" element={<Study />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
