import React, { useState } from 'react';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const searchVideos = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${searchTerm}&type=video&key=${process.env.REACT_APP_YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      setVideos(data.items);
      setSelectedVideo(data.items[0]);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">YouTube Viewer</h1>
      
      <form onSubmit={searchVideos} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="検索キーワードを入力..."
            className="flex-1 p-2 border rounded"
          />
          <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            検索
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {selectedVideo && (
            <div className="aspect-video mb-4">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${selectedVideo.id.videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <h2 className="text-xl font-bold mt-2">{selectedVideo.snippet.title}</h2>
              <p className="text-gray-600">{selectedVideo.snippet.description}</p>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-1">
          <div className="grid gap-4">
            {videos.map((video) => (
              <div
                key={video.id.videoId}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                onClick={() => setSelectedVideo(video)}
              >
                <img
                  src={video.snippet.thumbnails.medium.url}
                  alt={video.snippet.title}
                  className="w-full rounded"
                />
                <h3 className="font-semibold mt-2">{video.snippet.title}</h3>
                <p className="text-sm text-gray-600">{video.snippet.channelTitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
