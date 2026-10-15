import { Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import './App.css';
import Login from './pages/Login';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import Home from './pages/HomePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />
       <Route path="/home" element={<Home />} />
    </Routes>
  );
}

export default App
