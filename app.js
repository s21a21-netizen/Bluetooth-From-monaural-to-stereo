// オーディオデバイス（Bluetoothスピーカーなど）のリストを取得してセレクトボックスに反映する処理
async function updateDeviceList() {
    try {
        // デバイス権限のリクエスト
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

        const selectL = document.getElementById('speaker-l');
        const selectR = document.getElementById('speaker-r');

        // 一旦クリア
        selectL.innerHTML = '<option value="">スピーカー名</option>';
        selectR.innerHTML = '<option value="">スピーカー名</option>';

        audioOutputs.forEach(device => {
            const optionL = document.createElement('option');
            optionL.value = device.deviceId;
            optionL.textContent = device.label || `スピーカー ${selectL.options.length}`;
            selectL.appendChild(optionL);

            const optionR = optionL.cloneNode(true);
            selectR.appendChild(optionR);
        });
    } catch (err) {
        console.error('オーディオデバイスの取得に失敗しました:', err);
    }
}

// 初期化時にデバイス一覧を取得
updateDeviceList();
