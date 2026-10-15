import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const API = 'https://garbabuddy.onrender.com/api';

function getStoredUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user._id || user.id || '');
  } catch {
    return '';
  }
}

function Home() {
  const navigate = useNavigate();

  const [currentProfile, setCurrentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [sentRequests, setSentRequests] = useState([]);
  const [connectedIds, setConnectedIds] = useState([]);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [respondingToId, setRespondingToId] = useState(null);

  // Chat state
  const [chatPartners, setChatPartners] = useState([]);
  const [activeChatPartnerId, setActiveChatPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [chatError, setChatError] = useState('');

  const [notice, setNotice] = useState('');
  const [showConnectionPopup, setShowConnectionPopup] = useState(false);
  const [connectedPartnerName, setConnectedPartnerName] = useState('');
  const loggedInUserId = getStoredUserId();

  const currentProfileId = currentProfile
    ? String(currentProfile._id || currentProfile.id || '')
    : '';

  const requestSent = currentProfileId
    ? sentRequests.includes(currentProfileId)
    : false;

  const isConnected = currentProfileId
    ? connectedIds.includes(currentProfileId)
    : false;

  // Load a student profile
  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setCurrentProfile(null);
      setProfileError('Please log in again.');
      navigate('/login', { replace: true });
      return;
    }

    setLoadingProfile(true);
    setProfileError('');

    try {
      const response = await fetch(`${API}/auth/discover`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load a profile.');
      }

      if (!data.profile) {
        setCurrentProfile(null);
        setProfileError(data.message || 'No eligible students found.');
        return;
      }

      const profile = data.profile;
      const name = profile.name || profile.realName || 'Student';

      setCurrentProfile({
        ...profile,
        name,
        initials: name
          .trim()
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      });
    } catch (error) {
      setCurrentProfile(null);
      setProfileError(error.message);
    } finally {
      setLoadingProfile(false);
    }
  }, [navigate]);

  // Load incoming partner requests
  const loadIncomingRequests = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingRequests(true);
    setRequestsError('');

    try {
      const response = await fetch(`${API}/requests/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load requests.');
      }

      setRequests(data.requests || []);
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Load sent requests
  const loadSentRequests = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setSentRequests([]);
      return;
    }

    try {
      const response = await fetch(`${API}/requests/sent`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load sent requests.');
      }

      setSentRequests((data.recipientIds || []).map(String));
    } catch (error) {
      console.error('Load sent requests error:', error);
    }
  }, []);

  // Load accepted connections
  const loadConnections = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setConnectedIds([]);
      return;
    }

    try {
      const response = await fetch(`${API}/requests/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load connections.');
      }

      setConnectedIds((data.connectedIds || []).map(String));
    } catch (error) {
      console.error('Load connections error:', error);
    }
  }, []);

  // Load confirmed chat partners
  const loadChatPartners = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setChatPartners([]);
      return;
    }

    try {
      const response = await fetch(`${API}/chat/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load chat partners.');
      }

      setChatPartners(data.partners || []);
    } catch (error) {
      console.error('Load chat partners error:', error);
    }
  }, []);

  // Initial loading
  useEffect(() => {
    loadProfile();
    loadIncomingRequests();
    loadSentRequests();
    loadConnections();
    loadChatPartners();
  }, [
    loadProfile,
    loadIncomingRequests,
    loadSentRequests,
    loadConnections,
    loadChatPartners,
  ]);

  // Refresh requests and connections periodically
  useEffect(() => {
    const timer = setInterval(() => {
      loadIncomingRequests();
      loadSentRequests();
      loadConnections();
      loadChatPartners();
    }, 10000);

    return () => clearInterval(timer);
  }, [
    loadIncomingRequests,
    loadSentRequests,
    loadConnections,
    loadChatPartners,
  ]);

  const handleShuffle = () => {
    if (!loadingProfile && !sendingRequest) {
      loadProfile();
    }
  };

  // Send a partner request
  const handleSendRequest = async () => {
    if (!currentProfile || requestSent || isConnected || sendingRequest) {
      return;
    }

    const token = localStorage.getItem('token');
    const recipientId = currentProfile._id || currentProfile.id;

    if (!token) {
      setNotice('Please log in again.');
      navigate('/login', { replace: true });
      return;
    }

    if (!recipientId) {
      setNotice('Could not identify this student. Please try again.');
      return;
    }

    setSendingRequest(true);
    setNotice('');

    try {
      const response = await fetch(`${API}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: String(recipientId) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not send the request.');
      }

      await loadSentRequests();
      setNotice(data.message || `Request sent to ${currentProfile.name}!`);
    } catch (error) {
      setNotice(error.message || 'Something went wrong.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Accept or decline an incoming request
  const handleRequestResponse = async (id, accepted) => {
    if (respondingToId !== null) return;

    const token = localStorage.getItem('token');

    if (!token) {
      setNotice('Please log in again.');
      navigate('/login', { replace: true });
      return;
    }

    const selectedRequest = requests.find(
      (request) => String(request.id) === String(id)
    );

    if (!selectedRequest) return;

    setRespondingToId(String(id));
    setNotice('');

    try {
      const response = await fetch(
        `${API}/requests/${encodeURIComponent(id)}/respond`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: accepted ? 'accepted' : 'declined',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not update the request.');
      }

      if (accepted) {
        setConnectedPartnerName(selectedRequest.name || 'your new Garba partner');
        setShowConnectionPopup(true);
      }

      setNotice(
        data.message ||
          (accepted
            ? `You accepted ${selectedRequest.name}'s request.`
            : `You declined ${selectedRequest.name}'s request.`)
      );

      await Promise.all([
        loadIncomingRequests(),
        loadSentRequests(),
        loadConnections(),
        loadChatPartners(),
      ]);
    } catch (error) {
      setNotice(error.message || 'Something went wrong.');

      await Promise.all([
        loadIncomingRequests(),
        loadConnections(),
        loadChatPartners(),
      ]);
    } finally {
      setRespondingToId(null);
    }
  };

  // Open a conversation
  const handleOpenChat = async (partnerId) => {
    setActiveChatPartnerId(String(partnerId));
    setMessages([]);
    setMessageText('');
    setChatError('');
    setLoadingMessages(true);

    const token = localStorage.getItem('token');

    if (!token) {
      setChatError('Please log in again.');
      setLoadingMessages(false);
      return;
    }

    try {
      const response = await fetch(
        `${API}/chat/${encodeURIComponent(partnerId)}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load messages.');
      }

      setMessages(data.messages || []);
    } catch (error) {
      setChatError(error.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Refresh the open conversation
  const loadMessages = useCallback(async (partnerId) => {
    const token = localStorage.getItem('token');

    if (!token || !partnerId) return;

    try {
      const response = await fetch(
        `${API}/chat/${encodeURIComponent(partnerId)}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
        setChatError('');
      } else {
        setChatError(data.message || 'Could not refresh messages.');
      }
    } catch {
      setChatError('Could not refresh messages. Check your connection.');
    }
  }, []);

  // Poll for new messages every four seconds
  useEffect(() => {
    if (!activeChatPartnerId) return;

    const timer = setInterval(() => {
      loadMessages(activeChatPartnerId);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeChatPartnerId, loadMessages]);

  // Send a chat message
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = messageText.trim();

    if (!text || !activeChatPartnerId || sendingMessage) return;

    const token = localStorage.getItem('token');

    if (!token) {
      setChatError('Please log in again.');
      return;
    }

    setSendingMessage(true);
    setChatError('');

    try {
      const response = await fetch(
        `${API}/chat/${encodeURIComponent(activeChatPartnerId)}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not send your message.');
      }

      setMessageText('');
      await loadMessages(activeChatPartnerId);
    } catch (error) {
      setChatError(error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // Delete the conversation for both partners
  const handleDeleteChat = async (partnerId) => {
    if (deletingChat) return;

    const confirmed = window.confirm(
      'Delete this entire conversation for both partners? This cannot be undone.'
    );

    if (!confirmed) return;

    const token = localStorage.getItem('token');

    if (!token) {
      setChatError('Please log in again.');
      return;
    }

    setDeletingChat(true);
    setChatError('');
    setNotice('');

    try {
      const response = await fetch(
        `${API}/chat/${encodeURIComponent(partnerId)}/messages`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not delete the chat.');
      }

      // Clear the local conversation immediately.
      if (activeChatPartnerId === String(partnerId)) {
        setMessages([]);
        setMessageText('');
      }

      setNotice('Chat messages deleted for both partners.');
    } catch (error) {
      setChatError(error.message || 'Could not delete the chat.');
    } finally {
      setDeletingChat(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    navigate('/', { replace: true });
  };

  const pendingRequests = requests.filter(
    (request) => request.status === 'pending'
  );

  return (
    <main className="home-page">
      <header className="home-topbar">
        <button
          className="brand"
          onClick={() => navigate('/')}
          aria-label="Go to landing page"
        >
          garbabuddy<span>.</span>
        </button>
        <p className="topbar-tagline">Find your Garba vibe.</p>
      </header>

      <div className="home-layout">
        <aside className="home-sidebar">
          <button
            className="sidebar-action"
            onClick={() => navigate('/profile')}
          >
            <span className="sidebar-icon">♙</span>
            <span>Profile</span>
          </button>

          <div className="sidebar-spacer" />

          <button
            className="sidebar-action logout-action"
            onClick={handleLogout}
          >
            <span className="sidebar-icon">↪</span>
            <span>Logout</span>
          </button>
        </aside>

        {/* Discovery section */}
        <section className="discovery-section">
          <div className="section-heading">
            <p className="eyebrow">YOUR NEXT GARBA PARTNER</p>
            <h1>Someone new, every shuffle.</h1>
            <p className="section-subtitle">
              Meet students and find your Garba vibe.
            </p>
          </div>

          {loadingProfile ? (
            <article className="partner-card">
              <div className="partner-details">
                <p role="status">Finding your next Garba partner...</p>
              </div>
            </article>
          ) : currentProfile ? (
            <article className="partner-card">
              <div className="partner-cover">
                <div className="partner-avatar">
                  {currentProfile.initials}
                </div>
                <span className="student-badge">IIT (BHU) STUDENT</span>
              </div>

              <div className="partner-details">
                <p className="profile-number">YOUR NEXT GARBA PARTNER</p>
                <h2>{currentProfile.name}</h2>
                <p className="partner-academic">
                  {currentProfile.year} · {currentProfile.branch}
                </p>

                <div className="profile-divider" />

                <p className="partner-bio">
                  {currentProfile.bio || 'Ready to find a Garba partner!'}
                </p>

                <div className="partner-actions">
                  <button
                    className="shuffle-button"
                    onClick={handleShuffle}
                    disabled={loadingProfile || sendingRequest}
                  >
                    <span>⟳</span> Shuffle
                  </button>

                  <button
                    className="request-button"
                    onClick={handleSendRequest}
                    disabled={
                      isConnected ||
                      requestSent ||
                      sendingRequest ||
                      !currentProfileId
                    }
                  >
                    <span>{isConnected || requestSent ? '✓' : '♡'}</span>
                    {sendingRequest
                      ? 'Sending...'
                      : isConnected
                        ? 'Connected'
                        : requestSent
                          ? 'Request Sent'
                          : 'Send Request'}
                  </button>
                </div>

                {profileError && (
                  <p className="chat-error" role="alert">{profileError}</p>
                )}
              </div>
            </article>
          ) : (
            <article className="partner-card">
              <div className="partner-details">
                <h2>No profile available</h2>
                <p className="partner-bio">
                  {profileError || 'Try again in a moment.'}
                </p>
                <button
                  className="shuffle-button"
                  onClick={handleShuffle}
                  disabled={loadingProfile}
                >
                  Try Again
                </button>
              </div>
            </article>
          )}

          <p className="discovery-footnote">
            Every great Garba night starts with a hello.
          </p>
        </section>

        {/* Requests, connected partners, and inline chat */}
        <aside className="requests-section">
          <div className="requests-heading">
            <div>
              <p className="eyebrow">YOUR CONNECTIONS</p>
              <h2>Requests</h2>
            </div>
            <span className="request-count">{pendingRequests.length}</span>
          </div>

          <p className="requests-subtitle">
            Students who want to be your Garba partner.
          </p>

          <div className="incoming-list">
            {/* Confirmed partners */}
            {chatPartners.map((partner) => {
              const partnerId = String(partner._id);
              const partnerName =
                partner.realName || partner.name || 'Garba Partner';

              const initials = partnerName
                .trim()
                .split(/\s+/)
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const isChatOpen = activeChatPartnerId === partnerId;

              return (
                <article
                  className="incoming-card connected-card"
                  key={partnerId}
                >
                  <div className="incoming-person">
                    <div className="incoming-avatar">{initials}</div>
                    <div className="incoming-info">
                      <h3>{partnerName}</h3>
                      <p>{partner.year || 'Year not provided'}</p>
                      <p>{partner.branch || 'Branch not provided'}</p>
                      <p className="connection-status">✓ Connected</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="chat-toggle-button"
                    onClick={() => {
                      if (isChatOpen) {
                        setActiveChatPartnerId(null);
                        setMessages([]);
                        setMessageText('');
                        setChatError('');
                      } else {
                        handleOpenChat(partnerId);
                      }
                    }}
                  >
                    {isChatOpen ? 'Close Chat' : 'Chat'}
                  </button>

                  {isChatOpen && (
                    <div className="inline-chat">
                      <div className="inline-chat-heading">
                        <h3>Chat with {partnerName}</h3>
                        <span>GarbaBuddy</span>

                        <button
                          type="button"
                          className="delete-chat-button"
                          onClick={() => handleDeleteChat(partnerId)}
                          disabled={deletingChat}
                        >
                          {deletingChat ? 'Deleting...' : 'Delete Chat'}
                        </button>
                      </div>

                      <div
                        className="chat-messages"
                        aria-live="polite"
                        aria-label="Chat messages"
                      >
                        {loadingMessages ? (
                          <p className="chat-placeholder">
                            Loading messages...
                          </p>
                        ) : messages.length === 0 ? (
                          <p className="chat-placeholder">
                            Say hello to your Garba partner!
                          </p>
                        ) : (
                          messages.map((message) => {
                            const senderId = String(
                              message.sender?._id || message.sender || ''
                            );

                            const isMine =
                              loggedInUserId && senderId === loggedInUserId;

                            return (
                              <div
                                className={`chat-message ${
                                  isMine ? 'my-message' : 'their-message'
                                }`}
                                key={message._id}
                              >
                                <p>{message.text}</p>
                                <time>
                                  {message.createdAt
                                    ? new Date(
                                        message.createdAt
                                      ).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </time>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {chatError && (
                        <p className="chat-error" role="alert">
                          {chatError}
                        </p>
                      )}

                      <form
                        className="chat-compose"
                        onSubmit={handleSendMessage}
                      >
                        <input
                          type="text"
                          value={messageText}
                          onChange={(event) =>
                            setMessageText(event.target.value)
                          }
                          placeholder="Write a message..."
                          aria-label="Write a message"
                          maxLength={2000}
                          disabled={sendingMessage || loadingMessages}
                        />

                        <button
                          type="submit"
                          disabled={
                            sendingMessage ||
                            loadingMessages ||
                            !messageText.trim()
                          }
                        >
                          {sendingMessage ? '...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}

            {/* Incoming requests */}
            {loadingRequests ? (
              <div className="empty-requests">
                <p role="status">Loading requests...</p>
              </div>
            ) : requestsError ? (
              <div className="empty-requests">
                <h3>Couldn't load requests</h3>
                <p>{requestsError}</p>
                <button
                  className="shuffle-button"
                  onClick={loadIncomingRequests}
                  disabled={loadingRequests}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {pendingRequests.map((request) => (
                  <article className="incoming-card" key={request.id}>
                    <div className="incoming-person">
                      <div className="incoming-avatar">
                        {request.initials}
                      </div>
                      <div className="incoming-info">
                        <h3>{request.name}</h3>
                        <p>{request.year || 'Year not provided'}</p>
                        <p>{request.branch || 'Branch not provided'}</p>
                      </div>
                    </div>

                    <div className="incoming-actions">
                      <button
                        className="accept-button"
                        onClick={() =>
                          handleRequestResponse(request.id, true)
                        }
                        disabled={respondingToId !== null}
                      >
                        {respondingToId === String(request.id)
                          ? 'Saving...'
                          : 'Accept'}
                      </button>

                      <button
                        className="decline-button"
                        onClick={() =>
                          handleRequestResponse(request.id, false)
                        }
                        disabled={respondingToId !== null}
                      >
                        {respondingToId === String(request.id)
                          ? 'Saving...'
                          : 'Decline'}
                      </button>
                    </div>
                  </article>
                ))}

                {pendingRequests.length === 0 &&
                  chatPartners.length === 0 && (
                    <div className="empty-requests">
                      <span className="empty-icon">♡</span>
                      <h3>All caught up!</h3>
                      <p>New requests will show up here.</p>
                    </div>
                  )}
              </>
            )}
          </div>

          {notice && (
            <p className="home-notice" role="status">{notice}</p>
          )}
        </aside>
      </div>

      {showConnectionPopup && (
        <div
          className="connection-popup-overlay"
          onClick={() => setShowConnectionPopup(false)}
        >
          <div
            className="connection-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connection-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="connection-popup-close"
              onClick={() => setShowConnectionPopup(false)}
              aria-label="Close popup"
            >
              ×
            </button>

          

            <h2 id="connection-popup-title">
              You found your Garba partner!
            </h2>

            <p className="connection-popup-name">
              You and {connectedPartnerName} are connected!
            </p>

            <p>
               You’ve got a chance! so treat them well and have fun! ✨
            </p>

            <button
              type="button"
              className="connection-popup-button"
              onClick={() => setShowConnectionPopup(false)}
            >
              Let's Go! 
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
