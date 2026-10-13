let audioCtx;
let startTime = Date.now();
let destL, destR;

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
        // PC上の音声（タブや画面の音声）をキャプチャ
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { suppressLocalAudioPlayback: false }
        });

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
        splitter.connect(analyserL, 0);

        // Rチャンネル用アナライザー
        const analyserR = audioCtx.createAnalyser();
        analyserR.fftSize = 64;
        splitter.connect(analyserR, 1);

        // 左右それぞれの音声ストリームを作り出すノード
        destL = audioCtx.createMediaStreamDestination();
        destR = audioCtx.createMediaStreamDestination();

        // スプリッターから分けた音をそれぞれの出力先に送る
        splitter.connect(destL, 0); // Lチャンネル
        splitter.connect(destR, 1); // Rチャンネル

        // 隠しオーディオ要素を作って、別々のスピーカーに出力させる
        setupAudioElements(destL.stream, destR.stream);

        // ビジュアルライザーの描画ループ開始
        visualize(analyserL, 'visualizer-l');
        visualize(analyserR, 'visualizer-r');

        // 再生時間のカウント開始
        startTimer();

    } catch (err) {
        console.error('音声キャプチャエラー:', err);
        alert('音声のキャプチャが許可されませんでした。');
    }
});

// 3. 隠しオーディオ要素を使って、左右別々のBluetoothスピーカーに音を飛ばす処理
function setupAudioElements(streamL, streamR) {
    // L用オーディオ要素
    const audioL = document.createElement('audio');
    audioL.srcObject = streamL;
    audioL.autoplay = true;
    audioL.muted = false;

    // R用オーディオ要素
    const audioR = document.createElement('audio');
    audioR.srcObject = streamR;
    audioR.autoplay = true;
    audioR.muted = false;

    // Lスピーカー変更時の処理
    const selectL = document.getElementById('speaker-l');
    selectL.addEventListener('change', async () => {
        const deviceId = selectL.value;
        if (deviceId && typeof audioL.setSinkId === 'function') {
            try {
                await audioL.setSinkId(deviceId);
                console.log('L出力先変更成功:', deviceId);
            } catch (e) {
                console.error('L出力先変更失敗:', e);
            }
        }
    });

    // Rスピーカー変更時の処理
    const selectR = document.getElementById('speaker-r');
    selectR.addEventListener('change', async () => {
        const deviceId = selectR.value;
        if (deviceId && typeof audioR.setSinkId === 'function') {
            try {
                await audioR.setSinkId(deviceId);
                console.log('R出力先変更成功:', deviceId);
            } catch (e) {
                console.error('R出力先変更失敗:', e);
            }
        }
    });
}

// 4. ビジュアルライザーの描画処理
function visualize(analyser, elementId) {
    const container = document.getElementById(elementId);
    const bars = container.querySelectorAll('.bar');
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        bars.forEach((bar, index) => {
            const value = dataArray[index * 2] || 0;
            if (value > 50) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }
    draw();
}

// 5. 再生時間カウンター
function startTimer() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        document.getElementById('time-display').textContent = `${mins}:${secs}`;
    }, 1000);
}

navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);
updateDeviceList();
