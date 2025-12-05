import { useState, useEffect } from 'react';
import { Music, ArrowRight, Check, Loader2, CheckCircle, Heart, X, CheckSquare, Square } from 'lucide-react';
import Icon from "./res/icon.png";

export default function PlaylistTransfer() {
  const [spotifyAuth, setSpotifyAuth] = useState(false);
  const [tidalAuth, setTidalAuth] = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [tidalPlaylists, setTidalPlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState([]);
  const [currentTransferIndex, setCurrentTransferIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [version, setVersion] = useState({ tag: 'loading...', hash: '' });

  const API_URL = '/api';

  useEffect(() => {
    document.title = "That's a wrap";
    checkAuthStatus();
    fetchVersion();
    
    const interval = setInterval(() => {
      if ((spotifyAuth && spotifyPlaylists.length > 0) || 
          (!spotifyAuth && !tidalAuth)) {
        return;
      }
      checkAuthStatus();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [spotifyAuth, tidalAuth, spotifyPlaylists.length]);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include'
      });
      const data = await res.json();
      setSpotifyAuth(data.spotify);
      setTidalAuth(data.tidal);
      
      if (data.spotify) {
        loadSpotifyPlaylists();
      }
      if (data.tidal) {
        loadTidalPlaylists();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const fetchVersion = async () => {
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
  };

  const connectSpotify = () => {
    window.location.href = `${API_URL}/auth/spotify`;
  };

  const connectTidal = () => {
    window.location.href = `${API_URL}/auth/tidal`;
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

  const disconnectTidal = async () => {
    try {
      await fetch(`${API_URL}/disconnect/tidal`, {
        method: 'POST',
        credentials: 'include'
      });
      setTidalAuth(false);
      setTidalPlaylists([]);
    } catch (err) {
      console.error('Failed to disconnect Tidal:', err);
    }
  };

  const loadSpotifyPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/spotify/playlists`, {
        credentials: 'include'
      });
      const data = await res.json();
      // Only update if different to prevent UI resets
      const newPlaylists = data.playlists || [];
      if (JSON.stringify(newPlaylists) !== JSON.stringify(spotifyPlaylists)) {
        setSpotifyPlaylists(newPlaylists);
      }
    } catch (err) {
      console.error('Failed to load Spotify playlists:', err);
    }
  };

  const loadTidalPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/tidal/playlists`, {
        credentials: 'include'
      });
      const data = await res.json();
      setTidalPlaylists(data.playlists || []);
    } catch (err) {
      console.error('Failed to load Tidal playlists:', err);
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

  const transferSinglePlaylist = async (playlist, index, total) => {
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
            const playlistProgress = data.progress / total;
            const baseProgress = (index / total) * 100;
            setOverallProgress(baseProgress + playlistProgress);
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
          playlist_type: playlist.type
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
    
    const results = [];
    
    for (let i = 0; i < selectedPlaylists.length; i++) {
      setCurrentTransferIndex(i + 1);
      const result = await transferSinglePlaylist(
        selectedPlaylists[i], 
        i, 
        selectedPlaylists.length
      );
      results.push(result);
      setTransferStatus([...results]);
    }
    
    setTransferring(false);
    setOverallProgress(100);
    loadTidalPlaylists();
    
    // Clear selections after successful transfer
    setTimeout(() => {
      setSelectedPlaylists([]);
      setTransferStatus([]);
      setOverallProgress(0);
    }, 5000);
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
          <p className="text-gray-400">Transfer your playlists from Spotify to Tidal</p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-white">Connect Services</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Spotify Section */}
            <div className="border-2 border-gray-700 bg-gray-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-200">Spotify</h3>
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

            {/* Tidal Section */}
            <div className="border-2 border-gray-700 bg-gray-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-200">Tidal</h3>
                {tidalAuth && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={connectTidal}
                disabled={tidalAuth}
                className={`w-full py-3 px-6 rounded-lg font-medium transition ${
                  tidalAuth
                    ? 'bg-blue-900 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {tidalAuth ? 'Connected' : 'Connect Tidal'}
              </button>

              {tidalAuth && (
                <button
                  onClick={disconnectTidal}
                  className="w-full mt-2 py-2 px-4 border border-red-700 text-red-400 rounded-lg font-medium hover:bg-red-950 transition text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              )}

              {tidalAuth && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Your Playlists</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {tidalPlaylists.length > 0 ? (
                      tidalPlaylists.map((playlist) => (
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

          {spotifyAuth && tidalAuth && selectedPlaylists.length > 0 && (
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
                    Transfer {selectedPlaylists.length} Playlist{selectedPlaylists.length !== 1 ? 's' : ''} to Tidal
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

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            {version.tag}{version.hash && <span className="text-gray-600"> ({version.hash})</span>}
          </p>
        </div>
      </div>
    </div>
  );
}