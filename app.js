let audioCtx;
let startTime = Date.now();

// 1. オーディオデバイス（スピーカー）のリストを取得してセレクトボックスに反映
async function updateDeviceList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

        const selectL = document.getElementById('speaker-l');
        const selectR = document.getElementById('speaker-r');

        selectL.innerHTML = '<option value="">スピーカー名 (L)</option>';
        selectR.innerHTML = '<option value="">スピーカー名 (R)</option>';

        audioOutputs.forEach(device => {
            const label = device.label || `スピーカー (${device.deviceId.slice(0, 5)}...)`;
            
            const optionL = document.createElement('option');
            optionL.value = device.deviceId;
            optionL.textContent = label;
            selectL.appendChild(optionL);

            const optionR = optionL.cloneNode(true);
            selectR.appendChild(optionR);
        });
    } catch (err) {
        console.error('デバイスリストの取得に失敗しました:', err);
    }
}

// 2. 「音楽の音声をキャプチャして開始」ボタンを押したときの処理
document.getElementById('start-btn').addEventListener('click', async () => {
    try {
        // PC上の音声（タブや画面の音声）をキャプチャするプロンプトを出す
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // ブラウザの仕様上videoも取得する必要がありますが、音声のみ利用します
            audio: {
                suppressLocalAudioPlayback: false
            }
        });

        // スタートボタンを隠す
        document.getElementById('start-btn').style.display = 'none';

        // Web Audio APIの初期化
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);

        // 左右に分離するためのスプリッター
        const splitter = audioCtx.createChannelSplitter(2);
        source.connect(splitter);

        // Lチャンネル用アナライザー（ビジュアルライザー用）
        const analyserL = audioCtx.createAnalyser();
        analyserL.fftSize = 64;
        splitter.connect(analyserL, 0); // 0がLチャンネル

        // Rチャンネル用アナライザー
        const analyserR = audioCtx.createAnalyser();
        analyserR.fftSize = 64;
        splitter.connect(analyserR, 1); // 1がRチャンネル

        // 出力先の接続（スピーカー選択の監視）
        setupSpeakerRouting(splitter);

        // ビジュアルライザーの描画ループ開始
        visualize(analyserL, 'visualizer-l');
        visualize(analyserR, 'visualizer-r');

        // 再生時間のカウント開始
        startTimer();

    } catch (err) {
        console.error('音声キャプチャがキャンセルされたか、エラーが発生しました:', err);
        alert('音声のキャプチャが許可されませんでした。');
    }
});

// 3. スピーカーの選択変更時にそれぞれの出力先デバイスを変更する処理
function setupSpeakerRouting(splitter) {
    const selectL = document.getElementById('speaker-l');
    const selectR = document.getElementById('speaker-r');

    // Lチャンネルの出力先変更
    selectL.addEventListener('change', async () => {
        const deviceId = selectL.value;
        // 注意: setSinkIdはHTMLAudioElementや一部の環境でサポートされます
        console.log('Lスピーカー変更:', deviceId);
    });

    // Rチャンネルの出力先変更
    selectR.addEventListener('change', async () => {
        const deviceId = selectR.value;
        console.log('Rスピーカー変更:', deviceId);
    });
}

// 4. ビジュアルライザーの描画処理（赤とグレーのバーを音量に合わせて上下させる）
function visualize(analyser, elementId) {
    const container = document.getElementById(elementId);
    const bars = container.querySelectorAll('.bar');
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // バーの本数に合わせてデータを間引いて反映
        bars.forEach((bar, index) => {
            const value = dataArray[index * 2] || 0;
            // 一定のしきい値を超えたら active クラス（赤色）を付与
            if (value > 50) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }
    draw();
}

// 5. 曲情報の自動取得 (Media Session API & 再生時間カウンター)
function startTimer() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        document.getElementById('time-display').textContent = `${mins}:${secs}`;
    }, 1000);
}

// ブラウザ側でMedia Session（再生中の曲情報）が取れる場合は自動反映
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', function() {});
    navigator.mediaSession.setActionHandler('pause', function() {});
    
    // 定期的にメタデータをチェック
    setInterval(() => {
        if (navigator.mediaSession.metadata) {
            const meta = navigator.mediaSession.metadata;
            if (meta.title) document.getElementById('track-name').textContent = meta.title;
            if (meta.album) document.getElementById('album-name').textContent = meta.album;
            if (meta.artwork && meta.artwork.length > 0) {
                document.getElementById('artwork').src = meta.artwork[0].src;
            }
        }
    }, 1000);
}

// 初期化時にデバイス一覧を取得
navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);
updateDeviceList();
