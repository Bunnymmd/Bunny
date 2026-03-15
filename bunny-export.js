(function() {
    // 文件名格式化函数：固定 Bunny_年-月-日 格式
    function formatBunnyFileName() {
        const padZero = (num) => String(num).padStart(2, '0');
        const now = new Date();
        const year = now.getFullYear();
        const month = padZero(now.getMonth() + 1);
        const day = padZero(now.getDate());
        return `Bunny_${year}-${month}-${day}.json`;
    }

    // 核心：替换导出按钮逻辑，修复顺序问题
    function replaceExportLogic() {
        const oldBtn = document.getElementById('btn-export-data');
        if (!oldBtn) return false;

        // 新建和原按钮完全一致的新按钮
        const newBtn = document.createElement('button');
        newBtn.id = 'btn-export-data';
        newBtn.className = 'settings-btn';
        newBtn.textContent = '导出数据';

        // 关键修复：把新按钮插入到原按钮的前面，再删除原按钮，保持顺序完全不变
        oldBtn.parentNode.insertBefore(newBtn, oldBtn);
        oldBtn.remove();

        // 给新按钮绑定完整的导出逻辑
        newBtn.addEventListener('click', async function() {
            if (this.hasAttribute('data-download-url')) return;
            
            const originalText = this.textContent;
            this.textContent = '数据打包中，请稍候...';
            this.disabled = true;
            this.style.opacity = '0.7';
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                // 全量数据打包，和原代码100%一致，导入完全兼容
                const exportData = { dexie: {}, localforage: {}, localstorage: {}, customDB: [] };
                
                // 读取Dexie核心数据
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

                // 触发下载，使用自定义文件名
                const a = document.createElement('a');
                a.href = url;
                a.download = formatBunnyFileName();
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
        return true;
    }

    // 双重兜底：页面加载完成后执行，同时开启DOM监听
    const observer = new MutationObserver(() => {
        if (replaceExportLogic()) {
            observer.disconnect();
        }
    });

    // 等页面所有资源加载完成后运行，彻底规避时序问题
    window.addEventListener('load', () => {
        if (!replaceExportLogic()) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });
})();
