// bunny-export.js 修正版 彻底解决事件冲突
(function() {
    // 文件名格式化函数（固定格式）
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

    // 核心：等页面所有资源、所有JS执行完成后再运行，彻底规避时序问题
    window.addEventListener('load', function() {
        // 1. 找到原导出按钮
        const oldExportBtn = document.getElementById('btn-export-data');
        if (!oldExportBtn) return;

        // 2. 彻底删除原按钮，销毁所有绑定的原事件
        const btnParent = oldExportBtn.parentNode;
        oldExportBtn.remove();

        // 3. 新建一个一模一样的按钮，插入到原来的位置
        const newExportBtn = document.createElement('button');
        newExportBtn.id = 'btn-export-data';
        newExportBtn.className = 'settings-btn';
        newExportBtn.textContent = '导出数据';
        btnParent.appendChild(newExportBtn);

        // 4. 给新按钮绑定我们的专属导出逻辑
        newExportBtn.addEventListener('click', async function() {
            // 重复点击拦截
            if (this.hasAttribute('data-download-url')) return;
            
            const originalText = this.textContent;
            this.textContent = '数据打包中，请稍候...';
            this.disabled = true;
            this.style.opacity = '0.7';
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                // 全量数据打包（和原代码100%一致，导入完全兼容）
                const exportData = { dexie: {}, localforage: {}, localstorage: {}, customDB: [] };
                
                // 读取Dexie(IndexedDB)核心数据
                for (const table of bunnyDB.tables) {
                    exportData.dexie[table.name] = await table.toArray();
                }

                // 读取localforage配置数据
                const lfKeys = await localforage.keys();
                for (const key of lfKeys) {
                    exportData.localforage[key] = await localforage.getItem(key);
                }

                // 读取localStorage兜底数据
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    exportData.localstorage[key] = localStorage.getItem(key);
                }

                // 读取自定义主题/图片数据库
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

                // 生成下载文件流
                const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // 按钮状态更新
                this.textContent = '打包完成，点击此处下载';
                this.disabled = false;
                this.style.opacity = '1';
                this.style.background = '#ff9eaa';
                this.style.color = '#fff';

                // 核心：触发下载，使用我们的自定义文件名
                const a = document.createElement('a');
                a.href = url;
                a.download = formatBunnyExportFileName();
                a.style.display = 'none';
                document.body.appendChild(a);

                a.click();
                this.setAttribute('data-download-url', url);
                const downloadHandler = () => { a.click(); };
                this.addEventListener('click', downloadHandler);

                // 10秒后重置按钮，清理临时资源
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
