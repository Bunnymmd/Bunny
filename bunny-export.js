// bunny-export.js 完整代码
(function() {
    // 等待页面DOM加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        // 文件名格式化函数
        function formatBunnyExportFileName() {
            const padZero = (num) => String(num).padStart(2, '0');
            const now = new Date();
            const year = now.getFullYear();
            const month = padZero(now.getMonth() + 1);
            const day = padZero(now.getDate());
            const hour = padZero(now.getHours());
            const minute = padZero(now.getMinutes());
            return `Bunny_${year}${month}${day}_${hour}${minute}.json`;
        }

        // 等待导出按钮加载完成，替换点击事件
        const exportBtn = document.getElementById('btn-export-data');
        if (!exportBtn) return;

        // 移除原有的点击事件，替换为新逻辑
        exportBtn.replaceWith(exportBtn.cloneNode(true));
        const newExportBtn = document.getElementById('btn-export-data');

        // 绑定新的导出逻辑
        newExportBtn.addEventListener('click', async function() {
            if (this.hasAttribute('data-download-url')) return;
            const originalText = this.textContent;
            this.textContent = '数据打包中，请稍候...';
            this.disabled = true;
            this.style.opacity = '0.7';
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                const exportData = { dexie: {}, localforage: {}, localstorage: {}, customDB: [] };
                for (const table of bunnyDB.tables) {
                    exportData.dexie[table.name] = await table.toArray();
                }
                const lfKeys = await localforage.keys();
                for (const key of lfKeys) {
                    exportData.localforage[key] = await localforage.getItem(key);
                }
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    exportData.localstorage[key] = localStorage.getItem(key);
                }
                if (db) {
                    await new Promise((resolve, reject) => {
                        const tx = db.transaction(storeName, "readonly");
                        const store = tx.objectStore(storeName);
                        const req = store.getAll();
                        const keysReq = store.getAllKeys();
                        req.onsuccess = () => {
                            keysReq.onsuccess = () => {
                                exportData.customDB = keysReq.result.map((k, i) => ({ key: k, value: req.result[i] }));
                                resolve();
                            };
                        };
                        req.onerror = () => reject(req.error);
                    });
                }

                const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                this.textContent = '打包完成，点击此处下载';
                this.disabled = false;
                this.style.opacity = '1';
                this.style.background = '#ff9eaa';
                this.style.color = '#fff';

                const a = document.createElement('a');
                a.href = url;
                a.download = formatBunnyExportFileName();
                a.style.display = 'none';
                document.body.appendChild(a);

                a.click();
                this.setAttribute('data-download-url', url);
                const downloadHandler = () => { a.click(); };
                this.addEventListener('click', downloadHandler);

                setTimeout(() => {
                    this.textContent = originalText;
                    this.removeAttribute('data-download-url');
                    this.removeEventListener('click', downloadHandler);
                    this.style.background = '';
                    this.style.color = '';
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 10000);

            } catch (error) {
                console.error('导出失败', error);
                alert('导出失败: ' + error.message);
                this.textContent = originalText;
                this.disabled = false;
                this.style.opacity = '1';
            }
        });
    });
})();
