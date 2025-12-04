import { useState, useEffect } from 'react';
import { Music, ArrowRight, Check, Loader2 } from 'lucide-react';

export default function PlaylistTransfer() {
  const [spotifyAuth, setSpotifyAuth] = useState(false);
  const [tidalAuth, setTidalAuth] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');

  const API_URL = 'http://localhost:5000';

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/status`);
      const data = await res.json();
      setSpotifyAuth(data.spotify);
      setTidalAuth(data.tidal);
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

  const loadPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists`);
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch (err) {
      setTransferStatus('Failed to load playlists');
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
        body: JSON.stringify({ playlist_id: selectedPlaylist.id })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTransferStatus(`✓ Successfully transferred "${selectedPlaylist.name}"!`);
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-10 h-10 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Playlist Transfer
            </h1>
          </div>
          <p className="text-gray-600">Transfer your playlists from Spotify to Tidal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">1. Connect Services</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-green-400 transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-700">Spotify</h3>
                {spotifyAuth && <Check className="w-6 h-6 text-green-600" />}
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
            </div>

            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-700">Tidal</h3>
                {tidalAuth && <Check className="w-6 h-6 text-blue-600" />}
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
            </div>
          </div>

          {spotifyAuth && tidalAuth && (
            <>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">2. Select Playlist</h2>
              
              <button
                onClick={loadPlaylists}
                className="mb-6 py-3 px-6 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
              >
                Load Spotify Playlists
              </button>

              {playlists.length > 0 && (
                <div className="mb-8">
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => setSelectedPlaylist(playlist)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedPlaylist?.id === playlist.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{playlist.name}</h4>
                            <p className="text-sm text-gray-600">{playlist.tracks} tracks</p>
                          </div>
                          {selectedPlaylist?.id === playlist.id && (
                            <Check className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlaylist && (
                <>
                  <h2 className="text-2xl font-semibold mb-6 text-gray-800">3. Transfer</h2>
                  
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
                        Transfer to Tidal
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
                </>
              )}
            </>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Note: Backend server must be running on localhost:5000</p>
        </div>
      </div>
    </div>
  );
}