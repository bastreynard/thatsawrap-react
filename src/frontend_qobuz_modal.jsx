// Add this Qobuz login modal component to your PlaylistTransfer.jsx

// Add this state near the top with other states:
const [qobuzLoginModal, setQobuzLoginModal] = useState(false);
const [qobuzEmail, setQobuzEmail] = useState('');
const [qobuzPassword, setQobuzPassword] = useState('');
const [qobuzLoggingIn, setQobuzLoggingIn] = useState(false);
const [qobuzLoginError, setQobuzLoginError] = useState('');

// Add this function with other functions:
const handleQobuzLogin = async (e) => {
  e.preventDefault();
  setQobuzLoggingIn(true);
  setQobuzLoginError('');
  
  try {
    const res = await fetch(`${API_URL}/auth/qobuz/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: qobuzEmail,
        password: qobuzPassword
      })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      setQobuzLoginModal(false);
      setQobuzEmail('');
      setQobuzPassword('');
      // Check auth status to update UI
      checkAuthStatus();
    } else {
      setQobuzLoginError(data.error || 'Login failed');
    }
  } catch (err) {
    console.error('Qobuz login error:', err);
    setQobuzLoginError('Connection error. Please try again.');
  } finally {
    setQobuzLoggingIn(false);
  }
};

// Update the connectTargetService function:
const connectTargetService = (serviceId) => {
  if (serviceId === 'qobuz') {
    // Show login modal for Qobuz
    setQobuzLoginModal(true);
  } else {
    // OAuth flow for other services
    window.location.href = `${API_URL}/auth/${serviceId}`;
  }
};

// Add this modal JSX before the closing </div> of the main container (before Footer):

{/* Qobuz Login Modal */}
{qobuzLoginModal && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Login to Qobuz</h2>
        <button
          onClick={() => {
            setQobuzLoginModal(false);
            setQobuzLoginError('');
          }}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <form onSubmit={handleQobuzLogin}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={qobuzEmail}
              onChange={(e) => setQobuzEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="your@email.com"
              required
              disabled={qobuzLoggingIn}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={qobuzPassword}
              onChange={(e) => setQobuzPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
              disabled={qobuzLoggingIn}
            />
          </div>
          
          {qobuzLoginError && (
            <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
              {qobuzLoginError}
            </div>
          )}
          
          <button
            type="submit"
            disabled={qobuzLoggingIn}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {qobuzLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </div>
      </form>
      
      <p className="text-sm text-gray-400 mt-4 text-center">
        Your credentials are used only to authenticate with Qobuz and are not stored.
      </p>
    </div>
  </div>
)}
