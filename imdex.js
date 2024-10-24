import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());



// Invidiousインスタンスの完全なリスト
const INVIDIOUS_INSTANCES = [
    'https://invidious.snopyta.org',
    'https://yewtu.be',
    'https://invidious.tube',
    'https://invidious.xyz',
    'https://invidious.kavin.rocks',
    'https://tube.connect.cafe',
    'https://invidious.zapashcanon.fr',
    'https://invidious.fdn.fr',
    'https://invidiou.site',
    'https://vid.mint.lgbt',
    'https://invidious.site',
    'https://invidious.048596.xyz',
    'https://vid.puffyan.us',
    'https://invidious.tiekoetter.com',
    'https://inv.riverside.rocks',
    'https://yt.artemislena.eu',
    'https://invidious.flokinet.to',
    'https://invidious.projectsegfau.lt',
    'https://y.com.sb'
];

// インスタンスの健全性チェックのタイムアウト値を調整
async function checkInstanceHealth(instance) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3秒でタイムアウト

        const response = await fetch(`${instance}/api/v1/stats`, {
            signal: controller.signal
        });

        clearTimeout(timeout);
        return response.ok;
    } catch {
        return false;
    }
}

// より積極的なインスタンスの健全性チェック（3分ごと）
const HEALTH_CHECK_INTERVAL = 3 * 60 * 1000;

// インスタンスのヘルスチェック時のログを改善
async function updateAvailableInstances() {
    console.log('Checking Invidious instances availability...');
    const startTime = Date.now();
    
    const healthChecks = await Promise.all(
        INVIDIOUS_INSTANCES.map(async (instance) => {
            const isHealthy = await checkInstanceHealth(instance);
            console.log(`Instance ${instance}: ${isHealthy ? 'OK' : 'Failed'}`);
            return { instance, isHealthy };
        })
    );

    availableInstances = healthChecks
        .filter(({ isHealthy }) => isHealthy)
        .map(({ instance }) => instance);

    const checkDuration = Date.now() - startTime;
    console.log(`Health check completed in ${checkDuration}ms`);
    console.log(`Available instances (${availableInstances.length}):`, availableInstances);
    
    return availableInstances.length > 0;
}

// 初期化時のログを追加
console.log(`Initialized with ${INVIDIOUS_INSTANCES.length} potential instances`);

// 利用可能なインスタンスを更新する関数
async function updateAvailableInstances() {
    console.log('Checking Invidious instances availability...');
    const healthChecks = await Promise.all(
        INVIDIOUS_INSTANCES.map(async (instance) => {
            const isHealthy = await checkInstanceHealth(instance);
            return { instance, isHealthy };
        })
    );

    availableInstances = healthChecks
        .filter(({ isHealthy }) => isHealthy)
        .map(({ instance }) => instance);

    console.log(`Found ${availableInstances.length} available instances:`, availableInstances);
    return availableInstances.length > 0;
}

// 次の利用可能なインスタンスを取得する関数
function getNextInstance() {
    if (availableInstances.length === 0) return null;
    currentInstanceIndex = (currentInstanceIndex + 1) % availableInstances.length;
    return availableInstances[currentInstanceIndex];
}

// 現在のインスタンスを取得する関数
function getCurrentInstance() {
    return availableInstances[currentInstanceIndex] || null;
}

// APIリクエストを行う関数（リトライ機能付き）
async function fetchWithRetry(endpoint, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        const instance = getCurrentInstance();
        if (!instance) {
            const hasAvailable = await updateAvailableInstances();
            if (!hasAvailable) {
                throw new Error('利用可能なインスタンスが見つかりません');
            }
            continue;
        }

        try {
            const url = `${instance}${endpoint}`;
            console.log(`Trying request to: ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error with instance ${getCurrentInstance()}:`, error);
            lastError = error;
            // 次のインスタンスを試す
            getNextInstance();
        }
    }
    throw lastError;
}

// インスタンス情報を取得するエンドポイント
app.get('/api/instances', (req, res) => {
    res.json({
        current: getCurrentInstance(),
        available: availableInstances,
        total: availableInstances.length
    });
});

// 検索エンドポイント
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: '検索キーワードが必要です' });
        }

        const data = await fetchWithRetry(`/api/v1/search?q=${encodeURIComponent(q)}`);
        
        const formattedData = data.map(video => ({
            videoId: video.videoId,
            title: video.title,
            author: video.author,
            thumbnailUrl: `${getCurrentInstance()}/vi/${video.videoId}/maxres.jpg`,
            duration: video.lengthSeconds,
            viewCount: video.viewCount,
            publishedAt: video.publishedAt
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: '検索中にエラーが発生しました', 
            details: error.message 
        });
    }
});

// 動画詳細取得エンドポイント
app.get('/api/videos/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).json({ error: '動画IDが必要です' });
        }

        const data = await fetchWithRetry(`/api/v1/videos/${videoId}`);
        const currentInstance = getCurrentInstance();
        
        const formattedData = {
            videoId: data.videoId,
            title: data.title,
            author: data.author,
            description: data.description,
            embedUrl: `${currentInstance}/embed/${videoId}`,
            thumbnailUrl: `${currentInstance}/vi/${videoId}/maxres.jpg`,
        };

        res.json(formattedData);
    } catch (error) {
        console.error('Video fetch error:', error);
        res.status(500).json({ 
            error: '動画の取得中にエラーが発生しました', 
            details: error.message 
        });
    }
});

// 定期的なインスタンスの健全性チェック（5分ごと）
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

// 初期化時にインスタンスをチェック
updateAvailableInstances().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
    
    // 定期的なヘルスチェックを開始
    setInterval(updateAvailableInstances, HEALTH_CHECK_INTERVAL);
});
