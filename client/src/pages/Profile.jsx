

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    realName: '',
    year: '',
    branch: '',
    bio: '',
    gender: '',
    partnerPreference: 'Any',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Please log in before saving your profile.');
      }

      const response = await fetch(
        'https://garbabuddy.onrender.com/api/auth/profile',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned an unexpected response (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || 'Could not save profile.');
      }

      // Store only public profile information locally.
      localStorage.setItem(
        'profile',
        JSON.stringify({
          name: data.profile.name,
          year: data.profile.year,
          branch: data.profile.branch,
          bio: data.profile.bio,
          gender: data.profile.gender,
          partnerPreference: data.profile.partnerPreference,
        })
      );

      navigate('/home');
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the server. Check your backend.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Link to="/" className="profile-logo">
          garbabuddy<span>.</span>
        </Link>
      </header>

      <section className="profile-content">
        <p className="profile-label">YOUR PROFILE</p>

        <h1>Let's get to know you.</h1>

        <p className="profile-subtitle">
          Just a few details about you. Keep it simple.
        </p>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-field">
            <label htmlFor="realName">Name</label>
            <input
              id="realName"
              name="realName"
              type="text"
              placeholder="Your full name"
              value={form.realName}
              onChange={handleChange}
              maxLength={80}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="year">Year</label>
            <select
              id="year"
              name="year"
              value={form.year}
              onChange={handleChange}
              required
            >
              <option value="">Select your year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="5th Year">5th Year</option>
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="branch">Branch</label>
            <input
              id="branch"
              name="branch"
              type="text"
              placeholder="e.g. Materials Science"
              value={form.branch}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select your gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="partnerPreference">
              Preferred partner
            </label>
            <select
              id="partnerPreference"
              name="partnerPreference"
              value={form.partnerPreference}
              onChange={handleChange}
              required
            >
              <option value="Any">Anyone</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <span className="profile-hint">
              Used only to find eligible Garba partners.
            </span>
          </div>

          <div className="profile-field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              placeholder="A little about yourself..."
              value={form.bio}
              onChange={handleChange}
              maxLength={160}
              rows={4}
            />
            <span className="bio-count">
              {form.bio.length}/160
            </span>
          </div>

          {error && (
            <p className="profile-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="profile-save"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save profile'}
          </button>

          <p className="profile-note">
            You can update your details later.
          </p>
        </form>
      </section>
    </main>
  );
}

export default Profile;
