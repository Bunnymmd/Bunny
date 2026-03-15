(function() {
    // 文件名格式化函数
    function formatBunnyExportFileName() {
        const padZero = (num) => String(num).padStart(2, '0');
        const now = new Date();
        const year = now.getFullYear();
        const month = padZero(now.getMonth() + 1);
        const day = padZero(now.getDate());
        return `Bunny_${year}-${month}-${day}.json`;
    }

    // 核心：替换导出按钮逻辑的函数
    function replaceExportLogic() {
        const oldBtn = document.getElementById('btn-export-data');
        if (!oldBtn) return false;

        // 彻底删除原按钮，销毁所有原生事件
        const parent = oldBtn.parentElement;
        oldBtn.remove();

        // 新建完全一致的按钮，插入原位置
        const newBtn = document.createElement('button');
        newBtn.id = 'btn-export-data';
        newBtn.className = 'settings-btn';
        newBtn.textContent = '导出数据';
        parent.appendChild(newBtn);

        // 绑定新的导出逻辑
        newBtn.addEventListener('click', async function() {
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
        return true;
    }

    // 监听DOM加载，确保按钮出现后立即替换，彻底解决时序问题
    const observer = new MutationObserver(() => {
        if (replaceExportLogic()) {
            observer.disconnect(); // 替换成功后停止监听
        }
    });

    // 页面加载完成后立即执行，同时开启监听兜底
    window.addEventListener('DOMContentLoaded', () => {
        if (!replaceExportLogic()) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });
})();
