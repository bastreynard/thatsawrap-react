import { useState, useEffect } from 'react';
import { Music, ArrowRight, Check, Loader2, CheckCircle, Heart, X } from 'lucide-react';

export default function PlaylistTransfer() {
  const [spotifyAuth, setSpotifyAuth] = useState(false);
  const [tidalAuth, setTidalAuth] = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [tidalPlaylists, setTidalPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');

  const API_URL = 'http://127.0.0.1:8080/api';

  useEffect(() => {
    document.title = "That's a wrap";
    checkAuthStatus();
    
    // Check auth status every 2 seconds, but stop once we have playlists
    const interval = setInterval(() => {
      // Stop polling if both services are connected and have playlists loaded
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
        credentials: 'include'  // Important: include cookies
      });
      const data = await res.json();
      setSpotifyAuth(data.spotify);
      setTidalAuth(data.tidal);
      
      // Auto-load playlists if authenticated
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
      setSelectedPlaylist(null);
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
      setSpotifyPlaylists(data.playlists || []);
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

  const transferPlaylist = async () => {
    if (!selectedPlaylist) return;
    
    setTransferring(true);
    setTransferStatus('Transferring playlist...');
    
    try {
      const res = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          playlist_id: selectedPlaylist.id,
          playlist_type: selectedPlaylist.type
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTransferStatus(
          `✓ Successfully transferred "${selectedPlaylist.name}"!\n` +
          `Added ${data.tracks_added}/${data.total_tracks} tracks.` +
          (data.tracks_not_found > 0 ? ` ${data.tracks_not_found} tracks not found on Tidal.` : '')
        );
        loadTidalPlaylists(); // Refresh Tidal playlists
      } else {
        setTransferStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setTransferStatus('Transfer failed. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-10 h-10 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              That's a wrap
            </h1>
          </div>
          <p className="text-gray-600">Transfer your playlists from Spotify to Tidal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Connect Services</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Spotify Section */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-700">Spotify</h3>
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
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {spotifyAuth ? 'Connected' : 'Connect Spotify'}
              </button>

              {spotifyAuth && (
                <button
                  onClick={disconnectSpotify}
                  className="w-full mt-2 py-2 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              )}

              {spotifyAuth && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Playlists</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {spotifyPlaylists.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => setSelectedPlaylist(playlist)}
                        className={`p-3 border rounded-lg cursor-pointer transition text-sm ${
                          selectedPlaylist?.id === playlist.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {playlist.type === 'liked' && (
                              <Heart className="w-4 h-4 text-green-600 fill-green-600 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-medium text-gray-800">{playlist.name}</div>
                              <div className="text-xs text-gray-500">{playlist.tracks} tracks</div>
                            </div>
                          </div>
                          {selectedPlaylist?.id === playlist.id && (
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tidal Section */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-700">Tidal</h3>
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
                    ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {tidalAuth ? 'Connected' : 'Connect Tidal'}
              </button>

              {tidalAuth && (
                <button
                  onClick={disconnectTidal}
                  className="w-full mt-2 py-2 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              )}

              {tidalAuth && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Playlists</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {tidalPlaylists.length > 0 ? (
                      tidalPlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="p-3 border border-gray-200 rounded-lg text-sm"
                        >
                          <div className="font-medium text-gray-800">{playlist.name}</div>
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

          {spotifyAuth && tidalAuth && selectedPlaylist && (
            <div className="mt-8 pt-8 border-t">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">Transfer</h2>
              
              <button
                onClick={transferPlaylist}
                disabled={transferring}
                className="w-full py-4 px-8 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {transferring ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    Transfer "{selectedPlaylist.name}" to Tidal
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {transferStatus && (
                <div className={`mt-4 p-4 rounded-lg ${
                  transferStatus.includes('✓') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {transferStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}