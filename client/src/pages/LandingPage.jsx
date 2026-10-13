import garbaImage from '../assets/hero.png';
import './LandingPage.css';

const features = [
  {
    icon: '♧',
    title: 'Meet Real Students',
    description: 'Connect with genuine IIT (BHU) peers, not strangers.',
    color: 'pink',
  },
  {
    icon: '♡',
    title: 'Match Your Vibe',
    description: 'Find people who share your dance style, interests & energy.',
    color: 'purple',
  },
  {
    icon: '♧',
    title: 'Individual or Group',
    description: 'Look for a dance partner or join a Garba crew.',
    color: 'orange',
  },
  {
    icon: '♢',
    title: 'Safe & Friendly',
    description: 'A trusted space with real profiles and campus community.',
    color: 'rose',
  },
]

const steps = [
  {
    number: '01',
    icon: '♙',
    title: '1. Create your profile',
    description:
      "Tell us about yourself — your interests, dance experience, and what you're looking for.",
  },
  {
    number: '02',
    icon: '⌕',
    title: '2. Discover matches',
    description:
      'Explore students from IIT (BHU) based on your preferences.',
  },
  {
    number: '03',
    icon: '♧',
    title: '3. Connect & dance',
    description:
      'Send a buddy request, chat, and plan your Garba night!',
  },
]

function Logo() {
  return (
    <a href="#home" className="brand">
      <span className="brand-symbol">✿</span>
      <span className="brand-copy">
        <span className="brand-name">
          garba <span>buddy</span>
        </span>
        <small>IIT (BHU)</small>
      </span>
    </a>
  )
}

function LandingPage() {
  return (
    <div className="app" id="home">
      <section className="hero-section">
        <div className="hero-decoration hero-decoration-top">
         
        </div>

        <nav className="navbar">
          <Logo />

          <div className="nav-links">
            <a className="active" href="#home">
              Home
            </a>
            <a href="#how">How It Works</a>
            <a href="#about">About</a>
            <a className="nav-cta" href="/signup">
              Get Started <span>→</span>
            </a>
          </div>
        </nav>

        <main className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span>⌁</span> THE IIT (BHU) GARBA COMMUNITY <span>⌁</span>
            </div>

            <h1>
              Your Garba Night.
              <br />
              Your Campus.
              <br />
              <span className="gradient-text">Your People.</span>
            </h1>

            <div className="headline-underline" />

            <p className="hero-description">
              Find your Garba partner or crew at IIT (BHU).
              Meet new friends, share the same vibe,
              and make this Navratri unforgettable.
            </p>

            <div className="hero-actions">
              <a href="/signup" className="primary-button">
                <span>♧</span> Find Your Buddy <span>→</span>
              </a>

              <a href="#how" className="secondary-button">
                <span className="play-icon">▷</span> How It Works
              </a>
            </div>

          </div>

          <div className="hero-visual">
            <div className="festival-glow" />

            <div className="festival-photo">
               <img
      src={garbaImage}
      alt="Group dancing Garba together"
    className="festival-image"
     />
              <div className="photo-overlay" />
              <div className="festival-caption">
                <span>✦ NAVRATRI NIGHTS ✦</span>
                <strong>Dance. Connect. Celebrate.</strong>
              </div>
            </div>

          </div>
        </main>

        <div className="hero-bottom-wave" />
      </section>

      <section className="features-section" id="about">
        <div className="section-eyebrow">
          <span>➜</span> WHY GARBA BUDDY? <span>➜</span>
        </div>

        <h2>
          Find your <span className="pink-text">vibe.</span> Find your{' '}
          <span className="orange-text">people.</span>
        </h2>

        <p className="section-description">
          Whether you're looking for a dance partner or a group,
          <br className="desktop-break" />
          Garba Buddy helps you connect with fellow IIT (BHU) students.
        </p>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className={`feature-icon ${feature.color}`}>
                <span>{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="dandiya-decoration left-decoration">╱</div>
        <div className="dandiya-decoration right-decoration">╲</div>

        <div className="section-eyebrow">
          <span>➜</span> SIMPLE STEPS <span>➜</span>
        </div>

        <h2>
          How it <span className="gradient-text">works?</span>
        </h2>

        <p className="how-subtitle">
          Just 3 easy steps to find your Garba buddy.
        </p>

        <div className="steps-grid">
          {steps.map((step, index) => (
            <div className="step-wrapper" key={step.number}>
              <article className="step-card">
                <div className={`step-icon step-icon-${index + 1}`}>
                  {step.icon}
                </div>

                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>

              {index < steps.length - 1 && (
                <div className="step-arrow">⟶</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="final-cta" id="find">
        <div className="cta-decoration cta-left">💃 🪷</div>

        <div className="cta-content">
          <div className="section-eyebrow">
            <span>➜</span> THIS NAVRATRI <span>➜</span>
          </div>

          <h2>Ready to find your Garba buddy?</h2>
          <p>Your people. Your rhythm. Your IIT (BHU).</p>

          <a href="/signup" className="cta-button">
            Get Started <span>→</span>
          </a>
        </div>

        <div className="cta-decoration cta-right">🪷 🕺</div>
      </section>

      <footer className="footer">
        <Logo />

        <p>
          Made with <span className="footer-heart">♥</span> for IIT (BHU)
          Garba lovers.
        </p>

        <div className="footer-art" aria-hidden="true">
          ✧  ✧
        </div>
      </footer>
    </div>
  )
}

export default LandingPage