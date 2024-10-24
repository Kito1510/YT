const { useState, useEffect } = React;

const VideoPlayer = ({ instance, videoId, onClose }) => {
    if (!videoId) return null;

    return (
        <div className="player-container">
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                    src={`${instance}/embed/${videoId}?autoplay=1`}
                    frameBorder="0"
                    allowFullScreen
                ></iframe>
            </div>
            <button 
                onClick={onClose}
                style={{ margin: '10px 0' }}
            >
                プレーヤーを閉じる
            </button>
        </div>
    );
};

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function App() {
    const [instances, setInstances] = useState([]);
    const [selectedInstance, setSelectedInstance] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        fetchInstances();
    }, []);

    const fetchInstances = async () => {
        try {
            const response = await fetch('https://api.invidious.io/instances.json');
            const data = await response.json();
            const activeInstances = data
                .filter(([, info]) => info.api && !info.monitor.monitor.error)
                .map(([url]) => url);
            setInstances(activeInstances);
            if (activeInstances.length > 0) {
                setSelectedInstance(activeInstances[0]);
            }
        } catch (error) {
            console.error('Failed to fetch instances:', error);
        }
    };

    const searchVideos = async (e) => {
        e.preventDefault();
        if (!selectedInstance || !searchQuery) return;

        setLoading(true);
        try {
            const response = await fetch(`${selectedInstance}/api/v1/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            setVideos(data);
        } catch (error) {
            console.error('Failed to search videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoSelect = (video) => {
        setSelectedVideo(video.videoId);
    };

    return (
        <div className="container">
            <h1 style={{ textAlign: 'center' }}>Invidious Video Viewer</h1>
            
            <div className="instance-selector">
                <label>インスタンスを選択: </label>
                <select 
                    value={selectedInstance} 
                    onChange={(e) => setSelectedInstance(e.target.value)}
                >
                    {instances.map((instance) => (
                        <option key={instance} value={instance}>
                            {instance}
                        </option>
                    ))}
                </select>
            </div>

            <div className="search-container">
                <form onSubmit={searchVideos}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="検索キーワードを入力"
                        style={{ padding: '5px', marginRight: '5px' }}
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ padding: '5px 10px' }}
                    >
                        {loading ? '検索中...' : '検索'}
                    </button>
                </form>
            </div>

            {selectedVideo && (
                <VideoPlayer 
                    instance={selectedInstance}
                    videoId={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                />
            )}

            <div className="video-grid">
                {videos.map((video) => (
                    <div 
                        key={video.videoId} 
                        className="video-item"
                        onClick={() => handleVideoSelect(video)}
                    >
                        <div className="thumbnail-container">
                            <img 
                                src={video.videoThumbnails?.[0]?.url} 
                                alt={video.title}
                            />
                            <div 
                                style={{
                                    position: 'absolute',
                                    bottom: 5,
                                    right: 5,
                                    background: 'rgba(0, 0, 0, 0.8)',
                                    color: 'white',
                                    padding: '2px 4px',
                                    borderRadius: '2px',
                                    fontSize: '0.8em'
                                }}
                            >
                                {formatDuration(video.lengthSeconds)}
                            </div>
                        </div>
                        <div className="video-details">
                            <div className="video-title">{video.title}</div>
                            <div className="video-meta">
                                <div>{video.author}</div>
                                <div>{video.viewCount.toLocaleString()} 回視聴</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
