
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  

const handleLogin = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    // 1. Log in the user
    const response = await fetch(
      'https://garbabuddy.onrender.com/api/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Unable to log in.')
    }

    // 2. Save the login token and user details
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    // 3. Fetch the user's saved profile
    const profileResponse = await fetch(
      '/api/auth/profile',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      }
    )

    const profileData = await profileResponse.json()

    if (!profileResponse.ok) {
      throw new Error(
        profileData.message || 'Could not check your profile.'
      )
    }

    // 4. Navigate according to profile completion
    if (profileData.profileComplete) {
    
      navigate('/home')
    } else {
    
      navigate('/profile')
    }

  } catch (err) {
   
    setError(err.message || 'Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}



  return (
    <main className="gb-login">
      <header className="gb-header">
        <Link to="/" className="gb-logo">
          <span className="gb-logo-mark">🍀</span>
          <span>garbabuddy</span>
        </Link>

      
      </header>

      <section className="gb-login-layout">
        <div className="gb-welcome">
          <span className="gb-small-label">GARBA NIGHT  KA KUCH KARTE HAI</span>

          <h1>
            Find your people.
            <br />
            <span>Then hit the floor.</span>
          </h1>

          <p className="gb-welcome-text">
            Looking for someone to go to Garba with?
            You're in the right place. Sign in and find
            your crew for the next night.
          </p>

          <div className="gb-event-note">
            <span className="gb-event-dot"></span>
            Made for the IIT (BHU) community
          </div>
        </div>

        <div className="gb-form-card">
          <div className="gb-form-heading">
            <h2>Welcome back</h2>
            <p>Pick up where you left off.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="gb-field">
              <label htmlFor="gb-email">Email address</label>
              <input
                id="gb-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="gb-field">
              <label htmlFor="gb-password">Password</label>
              <input
                id="gb-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="gb-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="gb-login-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Log in'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="gb-form-bottom">
            Don't have an account?{' '}
            <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </section>

      <footer className="gb-footer">
        <span>GarbaBuddy © 2026</span>
        <span>Good people. Great Garba nights.</span>
      </footer>
    </main>
  )
}

export default Login
