import { useState, useEffect, useCallback } from 'react';
import { Music, ArrowRight, Check, Loader2, CheckCircle, Heart, X, CheckSquare, Square } from 'lucide-react';
import Icon from "./res/icon.png";

// Service configurations
const TARGET_SERVICES = [
  { id: 'tidal', name: 'Tidal', color: 'blue', enabled: true },
  { id: 'qobuz', name: 'Qobuz', color: 'purple', enabled: true },
  { id: 'youtube_music', name: 'YouTube Music', color: 'red', enabled: false },
];

export default function PlaylistTransfer() {
  const [spotifyAuth, setSpotifyAuth] = useState(false);
  const [targetServicesAuth, setTargetServicesAuth] = useState({
    tidal: false,
    youtube_music: false,
    qobuz: false,
  });
  const [selectedTargetService, setSelectedTargetService] = useState('tidal');
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [targetPlaylists, setTargetPlaylists] = useState({});
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState([]);
  const [currentTransferIndex, setCurrentTransferIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [version, setVersion] = useState({ tag: 'loading...', hash: '' });
  
  // Qobuz login modal states
  const [qobuzLoginModal, setQobuzLoginModal] = useState(false);
  const [qobuzEmail, setQobuzEmail] = useState('');
  const [qobuzPassword, setQobuzPassword] = useState('');
  const [qobuzLoggingIn, setQobuzLoggingIn] = useState(false);
  const [qobuzLoginError, setQobuzLoginError] = useState('');

  const API_URL = '/api';

  // Get current target service config
  const currentTarget = TARGET_SERVICES.find(s => s.id === selectedTargetService);
  const isTargetAuth = targetServicesAuth[selectedTargetService];

  // Define all callback functions BEFORE useEffect
  const fetchVersion = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/version`, {
        credentials: 'include'
      });
      const data = await res.json();
      setVersion({
        tag: data.tag || 'dev',
        hash: data.hash ? data.hash.substring(0, 7) : ''
      });
    } catch (err) {
      console.error('Failed to fetch version:', err);
      setVersion({ tag: 'unknown', hash: '' });
    }
  }, []);

  const loadSpotifyPlaylists = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/spotify/playlists`, {
        credentials: 'include'
      });
      const data = await res.json();
      setSpotifyPlaylists(data.playlists || []);
    } catch (err) {
      console.error('Failed to load Spotify playlists:', err);
    }
  }, []);

  const loadTargetPlaylists = useCallback(async (serviceId) => {
    try {
      const res = await fetch(`${API_URL}/${serviceId}/playlists`, {
        credentials: 'include'
      });
      const data = await res.json();
      setTargetPlaylists(prev => ({
        ...prev,
        [serviceId]: data.playlists || []
      }));
    } catch (err) {
      console.error(`Failed to load ${serviceId} playlists:`, err);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      // Update Spotify auth
      setSpotifyAuth(prev => {
        if (prev !== data.spotify) {
          // Load playlists when newly authenticated
          if (data.spotify && !prev) {
            setTimeout(() => loadSpotifyPlaylists(), 0);
          }
          return data.spotify;
        }
        return prev;
      });
      
      // Update target services auth status
      setTargetServicesAuth(prev => {
        let hasChanges = false;
        const newAuth = { ...prev };
        
        TARGET_SERVICES.forEach(service => {
          if (data[service.id] !== undefined && data[service.id] !== prev[service.id]) {
            newAuth[service.id] = data[service.id];
            hasChanges = true;
            
            // Load playlists when newly authenticated
            if (data[service.id] && !prev[service.id]) {
              setTimeout(() => loadTargetPlaylists(service.id), 0);
            }
          }
        });
        
        return hasChanges ? newAuth : prev;
      });
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  }, [loadSpotifyPlaylists, loadTargetPlaylists]);

  // NOW the useEffect can safely use these functions
  useEffect(() => {
    document.title = "That's a wrap";
    checkAuthStatus();
    fetchVersion();
    
    // Set up polling interval
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(interval);
  }, [checkAuthStatus, fetchVersion]);

  const connectSpotify = () => {
    window.location.href = `${API_URL}/auth/spotify`;
  };

  const connectTargetService = (serviceId) => {
    if (serviceId === 'qobuz') {
      // Show login modal for Qobuz
      setQobuzLoginModal(true);
      setQobuzLoginError('');
    } else {
      // OAuth flow for other services
      window.location.href = `${API_URL}/auth/${serviceId}`;
    }
  };

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

  const disconnectSpotify = async () => {
    try {
      await fetch(`${API_URL}/disconnect/spotify`, {
        method: 'POST',
        credentials: 'include'
      });
      setSpotifyAuth(false);
      setSpotifyPlaylists([]);
      setSelectedPlaylists([]);
    } catch (err) {
      console.error('Failed to disconnect Spotify:', err);
    }
  };

  const disconnectTargetService = async (serviceId) => {
    try {
      await fetch(`${API_URL}/disconnect/${serviceId}`, {
        method: 'POST',
        credentials: 'include'
      });
      setTargetServicesAuth(prev => ({ ...prev, [serviceId]: false }));
      setTargetPlaylists(prev => ({ ...prev, [serviceId]: [] }));
    } catch (err) {
      console.error(`Failed to disconnect ${serviceId}:`, err);
    }
  };

  const togglePlaylistSelection = (playlist) => {
    setSelectedPlaylists(prev => {
      const isSelected = prev.some(p => p.id === playlist.id);
      if (isSelected) {
        return prev.filter(p => p.id !== playlist.id);
      } else {
        return [...prev, playlist];
      }
    });
  };

  const selectAllPlaylists = () => {
    if (selectedPlaylists.length === spotifyPlaylists.length) {
      setSelectedPlaylists([]);
    } else {
      setSelectedPlaylists([...spotifyPlaylists]);
    }
  };

  const transferSinglePlaylist = async (playlist, tracksProcessedSoFar, totalTracksAcrossAll) => {
    let lastProgress = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/transfer-progress`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.progress >= lastProgress) {
            lastProgress = data.progress;
            const currentPlaylistTracks = (data.progress / 100) * playlist.tracks;
            const totalProcessed = tracksProcessedSoFar + currentPlaylistTracks;
            const overallPercentage = (totalProcessed / totalTracksAcrossAll) * 100;
            setOverallProgress(overallPercentage);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 800);
    
    try {
      const res = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          playlist_id: playlist.id,
          playlist_type: playlist.type,
          target_service: selectedTargetService // Add target service
        })
      });
      
      const data = await res.json();
      clearInterval(pollInterval);
      
      if (res.ok) {
        return {
          success: true,
          name: playlist.name,
          tracksAdded: data.tracks_added,
          totalTracks: data.total_tracks,
          notFound: data.tracks_not_found || 0
        };
      } else {
        return {
          success: false,
          name: playlist.name,
          error: data.error
        };
      }
    } catch (err) {
      clearInterval(pollInterval);
      console.error('Transfer error:', err);
      return {
        success: false,
        name: playlist.name,
        error: 'Transfer failed'
      };
    }
  };

  const transferPlaylists = async () => {
    if (selectedPlaylists.length === 0) return;
    
    setTransferring(true);
    setTransferStatus([]);
    setOverallProgress(0);
    setCurrentTransferIndex(0);
    
    const totalTracks = selectedPlaylists.reduce((sum, pl) => sum + pl.tracks, 0);
    
    const results = [];
    let tracksProcessed = 0;
    
    for (let i = 0; i < selectedPlaylists.length; i++) {
      setCurrentTransferIndex(i + 1);
      const result = await transferSinglePlaylist(
        selectedPlaylists[i],
        tracksProcessed,
        totalTracks
      );
      results.push(result);
      setTransferStatus([...results]);
      
      tracksProcessed += selectedPlaylists[i].tracks;
    }
    
    setTransferring(false);
    setOverallProgress(100);
    loadTargetPlaylists(selectedTargetService);
    
    setTimeout(() => {
      setSelectedPlaylists([]);
      setTransferStatus([]);
      setOverallProgress(0);
    }, 5000);
  };

  // Get color classes based on service
  const getColorClasses = (color, variant = 'primary') => {
    const colors = {
      blue: {
        primary: 'bg-blue-600 hover:bg-blue-700',
        connected: 'bg-blue-900 text-blue-300',
        badge: 'text-blue-600',
        border: 'border-blue-700 text-blue-400 hover:bg-blue-950'
      },
      red: {
        primary: 'bg-red-600 hover:bg-red-700',
        connected: 'bg-red-900 text-red-300',
        badge: 'text-red-600',
        border: 'border-red-700 text-red-400 hover:bg-red-950'
      },
      purple: {
        primary: 'bg-purple-600 hover:bg-purple-700',
        connected: 'bg-purple-900 text-purple-300',
        badge: 'text-purple-600',
        border: 'border-purple-700 text-purple-400 hover:bg-purple-950'
      }
    };
    return colors[color]?.[variant] || colors.blue[variant];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={Icon} alt="Icon" className="w-10 h-10" />
            <h1 className="text-4xl font-bold text-white">
              That's a wrap
            </h1>
          </div>
          <p className="text-gray-400">Transfer your playlists from Spotify to any streaming service</p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-white">Connect Services</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Spotify Section (Source) */}
            <div className="border-2 border-gray-700 bg-gray-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-200">Spotify (Source)</h3>
                {spotifyAuth && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={connectSpotify}
                disabled={spotifyAuth}
                className={`w-full py-3 px-6 rounded-lg font-medium transition ${
                  spotifyAuth
                    ? 'bg-green-900 text-green-300 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {spotifyAuth ? 'Connected' : 'Connect Spotify'}
              </button>

              {spotifyAuth && (
                <button
                  onClick={disconnectSpotify}
                  className="w-full mt-2 py-2 px-4 border border-red-700 text-red-400 rounded-lg font-medium hover:bg-red-950 transition text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              )}

              {spotifyAuth && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-300">Your Playlists</h4>
                    <button
                      onClick={selectAllPlaylists}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded transition"
                    >
                      {selectedPlaylists.length === spotifyPlaylists.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {selectedPlaylists.length} of {spotifyPlaylists.length} selected
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {spotifyPlaylists.map((playlist) => {
                      const isSelected = selectedPlaylists.some(p => p.id === playlist.id);
                      return (
                        <div
                          key={playlist.id}
                          onClick={() => togglePlaylistSelection(playlist)}
                          className={`p-3 border rounded-lg cursor-pointer transition text-sm ${
                            isSelected
                              ? 'border-green-500 bg-green-950'
                              : 'border-gray-700 hover:border-green-600 bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {playlist.type === 'liked' && (
                                <Heart className="w-4 h-4 text-green-500 fill-green-500 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-gray-200">{playlist.name}</div>
                                <div className="text-xs text-gray-500">{playlist.tracks} tracks</div>
                              </div>
                            </div>
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Target Service Section */}
            <div className="border-2 border-gray-700 bg-gray-900 rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-200 mb-3">Target Service</h3>
                
                {/* Service Selector */}
                <div className="flex gap-2 mb-4">
                  {TARGET_SERVICES.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedTargetService(service.id)}
                      disabled={!service.enabled}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                        selectedTargetService === service.id
                          ? getColorClasses(service.color, 'primary') + ' text-white'
                          : service.enabled
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {service.name}
                      {!service.enabled && <span className="text-xs block">(Coming Soon)</span>}
                    </button>
                  ))}
                </div>

                {isTargetAuth && (
                  <div className={`flex items-center gap-2 mb-3 ${getColorClasses(currentTarget.color, 'badge')}`}>
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Connected to {currentTarget.name}</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => connectTargetService(selectedTargetService)}
                disabled={isTargetAuth || !currentTarget.enabled}
                className={`w-full py-3 px-6 rounded-lg font-medium transition ${
                  isTargetAuth
                    ? getColorClasses(currentTarget.color, 'connected') + ' cursor-not-allowed'
                    : !currentTarget.enabled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : getColorClasses(currentTarget.color, 'primary') + ' text-white'
                }`}
              >
                {isTargetAuth ? `Connected to ${currentTarget.name}` : `Connect ${currentTarget.name}`}
              </button>

              {isTargetAuth && (
                <button
                  onClick={() => disconnectTargetService(selectedTargetService)}
                  className="w-full mt-2 py-2 px-4 border border-red-700 text-red-400 rounded-lg font-medium hover:bg-red-950 transition text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              )}

              {isTargetAuth && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Your Playlists</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {targetPlaylists[selectedTargetService]?.length > 0 ? (
                      targetPlaylists[selectedTargetService].map((playlist) => (
                        <div
                          key={playlist.id}
                          className="p-3 border border-gray-700 bg-gray-800 rounded-lg text-sm"
                        >
                          <div className="font-medium text-gray-200">{playlist.name}</div>
                          <div className="text-xs text-gray-500">{playlist.tracks} tracks</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No playlists yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {spotifyAuth && isTargetAuth && selectedPlaylists.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 text-white">Transfer</h2>
              
              <button
                onClick={transferPlaylists}
                disabled={transferring}
                className="w-full py-4 px-8 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {transferring ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transferring {currentTransferIndex} of {selectedPlaylists.length}...
                  </>
                ) : (
                  <>
                    Transfer {selectedPlaylists.length} Playlist{selectedPlaylists.length !== 1 ? 's' : ''} to {currentTarget.name}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {transferring && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      Overall Progress ({currentTransferIndex}/{selectedPlaylists.length})
                    </span>
                    <span className="text-sm font-semibold text-gray-400">{Math.round(overallProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-300 ease-out shadow-lg"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Transfer Status */}
              {transferStatus.length > 0 && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {transferStatus.map((status, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm border ${
                        status.success
                          ? 'bg-green-950 text-green-300 border-green-800'
                          : 'bg-red-950 text-red-300 border-red-800'
                      }`}
                    >
                      {status.success ? (
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {status.name}
                          </div>
                          <div className="text-xs mt-1 text-green-400">
                            Added {status.tracksAdded}/{status.totalTracks} tracks
                            {status.notFound > 0 && ` • ${status.notFound} not found`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {status.name}
                          </div>
                          <div className="text-xs mt-1 text-red-400">Error: {status.error}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            <a href="https://github.com/bastreynard/thatsawrap" target="_blank">{version.tag}{version.hash && <span className="text-gray-600"> ({version.hash})</span>}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
