// 主程序代码

// 定义全局变量
let isFetching = false;      // 是否正在抓取JD详情
let jobQueue = [];           // 需要抓取的职位队列
let currentIndex = 0;        // 当前正在抓取的职位索引
let btn, loadingIcon;        // 按钮和加载图标元素

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    setupBannerClose();  // 添加这一行
    // 初始化Tab切换功能
    setupTabs();

    // 初始化运行模式切换
    setupRunModeToggle();

    // 加载设置
    loadSettings();

    // 初始化设置表单提交事件
    setupSettingsForm();

    // 初始化删除选中项按钮
    setupDeleteSelectedButton();

    // 初始化获取JD按钮
    setupGetJDButton();

    // 初始化数据导入、导出和重置按钮
    setupDataImportExportButtons();

    // 初始化全选功能
    setupSelectAll();

    // 初始化职位表格
    loadJobTable();

    // 初始化AI评分按钮
    setupProcessDataButton();

    // 初始化弹出层关闭按钮的事件监听器
    setupPopupCloseButton();
    //检查更新
    checkForUpdates()
    //加载隐藏岗位页面表格
    loadHiddenJobTable(); // 重新加载隐藏岗位页面表格
    //快捷隐藏
    setupHideClosedJobsButton(); // 添加这一行
    setupHideCommunicatedJobsButton(); // 添加这一行

    // 版本信息
    var manifestData = chrome.runtime.getManifest();
    var version = manifestData.version;
    document.getElementById('version-number').textContent = '版本号：' + version;


});

document.addEventListener('DOMContentLoaded', function() {
    var manifestData = chrome.runtime.getManifest();
    var version = manifestData.version;
    document.getElementById('version-number').textContent = '版本号：' + version;
});


// 添加关闭横幅的功能
function setupBannerClose() {
    const closeButton = document.getElementById('close-banner-btn');
    const banner = document.getElementById('announcement-banner');
    
    if (closeButton && banner) {
        // 页面加载时检查横幅状态
        chrome.storage.local.get('bannerClosed', function(data) {
            if (data.bannerClosed) {
                banner.style.display = 'none';
            }
        });

        // 点击关闭按钮时保存状态
        closeButton.addEventListener('click', function() {
            banner.style.display = 'none';
            chrome.storage.local.set({ bannerClosed: true });
        });
    }
}
// 定义检查更新的函数
function checkForUpdates() {
    fetch('https://100resume.aitoolhub.top/download/update-info.json')
      .then(response => response.json())
      .then(data => {
        const currentVersion = chrome.runtime.getManifest().version;
        const latestVersion = data.latestVersion;

        // 更新日志
        updateChangelog(data.logs);
  
        if (latestVersion > currentVersion) {
          console.log('有新版本可用:', latestVersion);
          // 可以在这里添加更新通知逻辑
          // 调用通知显示函数
        showUpdateNotification(latestVersion, data.Url);
        } else {
          console.log('当前已是最新版本.');
        }
      })
      .catch(error => console.error('更新检查失败:', error));
  }
  
// 更新日志
function updateChangelog(logs) {
    const changelogList = document.getElementById('changelog-list');
    changelogList.innerHTML = ''; // 清空当前的日志列表

    logs.forEach(log => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${log.version}</strong> - ${log.description}`;
        changelogList.appendChild(li);
    });
}

//通知更新
// 全局添加监听器
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
    if (notifId === 'updateNotification' && btnIdx === 0) {
        // 需要获取通知对应的 URL
        chrome.storage.local.get('updateUrl', function(data) {
            if (data.updateUrl) {
                window.open(data.updateUrl);
            }
        });
    }
});

function showUpdateNotification(version, url) {
    chrome.notifications.create('updateNotification', {
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: '更新可用',
        message: `有新的版本可用: ${version}！`,
        buttons: [{title: '下载更新'}],
        priority: 2 });
    // 将 URL 存储起来，供点击时使用
    chrome.storage.local.set({ updateUrl: url });
}

  
// 设置弹出层关闭按钮的事件监听器
function setupPopupCloseButton() {
    const closeButton = document.getElementById('closePopupButton');
    if (closeButton) {
        closeButton.addEventListener('click', hidePopup);
    } else {
        console.error('未找到关闭按钮元素，请检查HTML代码。');
    }
}

// 隐藏弹出层
function hidePopup() {
    document.getElementById('overlay').style.display = 'none';
}

// 显示弹出层
function showPopup() {
    document.getElementById('overlay').style.display = 'block';
}


// 设置Tab切换功能
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tablinks');
    const tabContents = document.querySelectorAll('.tabcontent');

    function openTab(tabName) {
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById(tabName).style.display = 'block';
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // 当切换到隐藏岗位标签时，自动加载隐藏岗位数据
        if (tabName === 'HiddenJobs') {
            loadHiddenJobTable();
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            openTab(this.getAttribute('data-tab'));
        });
    });

    // 默认打开"ResumeAnalysis"标签
    openTab('ResumeAnalysis');
}

// 加载设置
function loadSettings() {
    chrome.storage.local.get([
        'runMode', 
        'apiKey', 
        'model', 
        'apiUrl', 
        'greetingMessage', 
        'resume',
        'additionalRequirements'], function(data) {
        
        // 运行模式设置（在线/本地）
        if (data.runMode !== undefined) {
            // 如果是在线模式（true），选中runModeOnline，否则选中runModeLocal
            if (data.runMode) {
                document.getElementById('runModeOnline').checked = true;
                document.getElementById('apiSettings').style.display = 'none';
            } else {
                document.getElementById('runModeLocal').checked = true;
                document.getElementById('apiSettings').style.display = 'block';
            }
        }
        
        // API密钥
        if (data.apiKey) {
            document.getElementById('apiKey').value = data.apiKey;
        }
        
        // 模型设置
        if (data.model) {
            document.getElementById('model').value = data.model;
        }
        
        // API URL
        if (data.apiUrl) {
            document.getElementById('apiUrl').value = data.apiUrl;
        }
        
        // 打招呼语
        if (data.greetingMessage) {
            document.getElementById('greetingMessage').value = data.greetingMessage;
        }
        
        // 简历内容
        if (data.resume) {
            document.getElementById('resume').value = data.resume;
        }
        
        // 额外评分条件
        if (data.additionalRequirements) {
            document.getElementById('additionalRequirements').value = data.additionalRequirements;
        }
    });
}

// 设置运行模式切换的事件监听器
function setupRunModeToggle() {
    // 添加运行模式切换事件监听
    const localModeRadio = document.getElementById('runModeLocal');
    const onlineModeRadio = document.getElementById('runModeOnline');
    const apiSettings = document.getElementById('apiSettings');
    
    // 本地模式选中时显示API设置
    localModeRadio.addEventListener('change', function() {
        if (this.checked) {
            apiSettings.style.display = 'block';
        }
    });
    
    // 在线模式选中时隐藏API设置
    onlineModeRadio.addEventListener('change', function() {
        if (this.checked) {
            apiSettings.style.display = 'none';
            // 在线模式默认使用glm-4-flash
            document.getElementById('model').value = 'glm-4-flash';
        }
    });
}

// 设置表单提交事件监听器
function setupSettingsForm() {
    const settingsForm = document.getElementById('settingsForm');
    
    // 仍然保留表单提交事件，以防用户习惯点击保存按钮
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });
    
    // 为所有输入元素添加自动保存功能
    setupAutoSave();
}

// 设置自动保存功能
function setupAutoSave() {
    // 运行模式切换
    document.getElementById('runModeLocal').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('apiSettings').style.display = 'block';
            saveSettings();
        }
    });
    
    document.getElementById('runModeOnline').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('apiSettings').style.display = 'none';
            // 在线模式默认使用glm-4-flash
            document.getElementById('model').value = 'glm-4-flash';
            saveSettings();
        }
    });
    
    // 模型选择
    document.getElementById('model').addEventListener('change', saveSettings);
    
    // API Key输入框（使用input事件以实时保存）
    document.getElementById('apiKey').addEventListener('input', debounce(saveSettings, 500));
    
    // API URL输入框（使用input事件以实时保存）
    document.getElementById('apiUrl').addEventListener('input', debounce(saveSettings, 500));
    
    
    // 打招呼语文本框（使用input事件以实时保存）
    document.getElementById('greetingMessage').addEventListener('input', debounce(saveSettings, 500));
    
    // 简历文本框（使用input事件以实时保存）
    document.getElementById('resume').addEventListener('input', debounce(saveSettings, 1000));
    
    // 额外评分条件输入框（使用input事件以实时保存）
    document.getElementById('additionalRequirements').addEventListener('input', debounce(saveSettings, 500));
}

// 防抖函数，避免频繁保存
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// 保存设置
function saveSettings() {
    // 使用runModeOnline的checked状态确定runMode值
    const runMode = document.getElementById('runModeOnline').checked;
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const greetingMessage = document.getElementById('greetingMessage').value.trim();
    const resume = document.getElementById('resume').value.trim();
    const additionalRequirements = document.getElementById('additionalRequirements').value.trim();
    
    chrome.storage.local.set({
        runMode: runMode,
        apiKey: apiKey,
        model: model,
        apiUrl: apiUrl,
        greetingMessage: greetingMessage,
        resume: resume,
        additionalRequirements: additionalRequirements
    }, function() {
        showSaveNotification();
    });
}

// 显示保存成功的提示
function showSaveNotification() {
    // 获取或创建通知元素
    let notification = document.getElementById('saveNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'saveNotification';
        notification.className = 'save-notification';
        notification.textContent = '已自动保存';
        document.body.appendChild(notification);
    }
    
    // 显示通知
    notification.classList.add('show');
    
    // 设置超时以隐藏通知
    setTimeout(function() {
        notification.classList.remove('show');
    }, 2000);
}

// 设置删除选中项按钮
function setupDeleteSelectedButton() {
    // 为主表格和隐藏岗位表格分别添加删除功能
    const deleteButtons = document.querySelectorAll('#deleteSelected');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 判断当前在哪个标签页
            const currentTab = this.closest('.tabcontent');
            const isHiddenTab = currentTab.id === 'HiddenJobs';
            
            chrome.storage.local.get('jobData', function(data) {
                if (data.jobData) {
                    // 根据当前标签页选择对应的复选框
                    const selector = isHiddenTab ? '.row-checkbox-hidden:checked' : '.row-checkbox:checked';
                    const checkboxes = currentTab.querySelectorAll(selector);
                    const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-index')));
                    
                    if (indicesToDelete.length === 0) {
                        alert('请选择要删除的岗位');
                        return;
                    }

                    const updatedJobData = data.jobData.filter((_, index) => !indicesToDelete.includes(index));
                    
                    chrome.storage.local.set({ jobData: updatedJobData }, function() {
                        alert('选中项已删除');
                        loadJobTable(); // 重新加载主表格
                        loadHiddenJobTable(); // 重新加载隐藏岗位表格
                    });
                }
            });
        });
    });
}

// 在setupDeleteSelectedButton函数后添加新函数
function setupHideClosedJobsButton() {
    document.getElementById('hideClosedJobs').addEventListener('click', function() {
        chrome.storage.local.get('jobData', function(data) {
            if (data.jobData) {
                const updatedJobData = data.jobData.map(job => {
                    if (job.投递进度 === '职位已关闭') {
                        return { ...job, 是否隐藏: '是' };
                    }
                    return job;
                });

                chrome.storage.local.set({ jobData: updatedJobData }, function() {
                    loadJobTable(); // 重新加载表格
                    loadHiddenJobTable(); // 重新加载隐藏岗位表格
                });
            }
        });
    });
}

// 在setupHideClosedJobsButton函数后添加新函数

function setupHideCommunicatedJobsButton() {
    document.getElementById('hideCommunicatedJobs').addEventListener('click', function() {
        chrome.storage.local.get('jobData', function(data) {
            if (data.jobData) {
                // 更新jobData数组，只对"已沟通"的职位进行标记隐藏
                const updatedJobData = data.jobData.map(job => {
                    // 只有在投递进度不是"未沟通"和"未知"时才标记为隐藏
                    if (job.投递进度 === '已沟通' || job.投递进度 === '职位已关闭' || job.投递进度 === '沟通未回复') { 
                        return { ...job, 是否隐藏: '是' };
                    }
                    return job;
                });

                // 保存更新后的数据到本地存储，并重新加载表格
                chrome.storage.local.set({ jobData: updatedJobData }, function() {
                    loadJobTable(); // 重新加载所有工作项表格
                    loadHiddenJobTable(); // 重新加载隐藏的工作项表格
                });
            }
        });
    });
}
// function setupHideCommunicatedJobsButton() {
//     document.getElementById('hideCommunicatedJobs').addEventListener('click', function() {
//         chrome.storage.local.get('jobData', function(data) {
//             if (data.jobData) {
//                 const updatedJobData = data.jobData.map(job => {
//                     if (job.投递进度 !== '未沟通' && job.投递进度 !== '未知') {
//                         return { ...job, 是否隐藏: '是' };
//                     }
//                     return job;
//                 });

//                 chrome.storage.local.set({ jobData: updatedJobData }, function() {
//                     loadJobTable(); // 重新加载表格
//                     loadHiddenJobTable(); // 重新加载隐藏岗位表格
//                 });
//             }
//         });
//     });
// }


// 设置获取JD按钮
function setupGetJDButton() {
    btn = document.getElementById('getJD');
    loadingIcon = document.getElementById('loadingIcon');

    btn.addEventListener('click', function() {
        if (!isFetching) {
            startFetching();
        } else {
            stopFetching();
        }
    });
}

// 设置数据导入、导出和重置按钮
function setupDataImportExportButtons() {
    document.getElementById('importConfig').addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(event) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const config = JSON.parse(e.target.result);
                chrome.storage.local.set(config, function() {
                    alert('配置已导入');
                    loadSettings();
                });
            };
            reader.readAsText(file);
        };
        input.click();
    });

    document.getElementById('exportConfig').addEventListener('click', function() {
        chrome.storage.local.get(null, function(data) {
            const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.json';
            a.click();
        });
    });

    document.getElementById('resetSettings').addEventListener('click', function() {
        const defaultSettings = {
            pagesToScrape: 5,
            model: 'glm-4-flash',
            runMode: false,
            apiKey: '',
            resume: ''
        };
        chrome.storage.local.set(defaultSettings, function() {
            alert('设置已重置');
            loadSettings();
        });
    });
}

// 设置全选功能
function setupSelectAll() {
    document.getElementById('select-all').addEventListener('change', function(e) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
}

// 加载职位表格
function loadJobTable() {
    chrome.storage.local.get('jobData', function(data) {
        console.log('加载的全部职位数据:', data.jobData);
        const tbody = document.querySelector('#job-table tbody');
        tbody.innerHTML = '';
        if (data.jobData) {
            data.jobData.forEach((job, index) => {
                if (job.是否隐藏 === '是') {
                    return; // 跳过已隐藏的岗位
                }
                const row = tbody.insertRow();
                let rowClass = 'state-initial';
                
                if (job.activeTime) rowClass = 'state-described';
                if (job.AI评分结果 !== undefined) rowClass = 'state-scored';
                row.className = rowClass;
                
                // 在生成每一行时，添加数据属性
                row.dataset.index = index;  // 用来标记行的索引
                row.dataset.jobLink = job.详情链接 || '#';

                row.innerHTML = `
                    <td><input type="checkbox" class="row-checkbox" data-index="${index}"></td>
                    <td class="job-description">${job.职位名称 || 'N/A'}</td>
                    <td>${job.工作地点 || 'N/A'}</td>
                    <td class="job-salary">${job.薪资 || 'N/A'}</td>
                    <td>${job.公司名称 || 'N/A'}</td>
                    <td>${job.工作经验 || 'N/A'}</td>
                    <td>${job.学历要求 || 'N/A'}</td>
                    <td class="job-benefits-column" title="${job.职位福利 || 'N/A'}">${job.职位福利 || 'N/A'}</td>
                    <td class="job-active-time">${job.activeTime || 'N/A'}</td>
                    <td class="job-fetch-time">${job.抓取时间 || 'N/A'}</td>
                    <td class="job-progress">${job.投递进度 || '未知'}</td>
                    <td class="job-score">${job.AI评分结果 !== undefined ? job.AI评分结果 : 'N/A'}</td>
                    <td><button class="details-btn" data-index="${index}">详情</button></td>
                `;

                // 为所有详情按钮添加点击事件监听器
                const detailButtons = row.querySelectorAll('.details-btn');
                detailButtons.forEach(button => {
                    button.addEventListener('click', showJobDetails);
                });
            });
        }
    });
}

// function loadJobTable() {
//     chrome.storage.local.get('jobData', function(data) {
//         console.log('加载的全部职位数据:', data.jobData);
//         const tbody = document.querySelector('#job-table tbody');
//         tbody.innerHTML = '';
//         if (data.jobData) {
//             data.jobData.forEach((job, index) => {
//                 if (job.是否隐藏 === '是') {
//                     return; // 跳过已隐藏的岗位
//                 }
//                 const row = tbody.insertRow();
//                 let rowClass = 'state-initial';
                
//                 if (job.activeTime) rowClass = 'state-described';
//                 if (job.AI评分结果 !== undefined) rowClass = 'state-scored';
//                 row.className = rowClass;
//                 // 在生成每一行时，添加数据属性
//                 row.dataset.jobLink = job.详情链接 || '#';
//                 row.innerHTML = `
//                     <td><input type="checkbox" class="row-checkbox" data-index="${index}"></td>
//                     <td>${job.职位名称 || 'N/A'}</td>
//                     <td>${job.工作地点 || 'N/A'}</td>
//                     <td>${job.薪资 || 'N/A'}</td>
//                     <td>${job.公司名称 || 'N/A'}</td>
//                     <td>${job.工作经验 || 'N/A'}</td>
//                     <td>${job.学历要求 || 'N/A'}</td>
//                     <td class="job-benefits-column" title="${job.职位福利 || 'N/A'}">${job.职位福利 || 'N/A'}</td>
//                     <td>${job.activeTime || 'N/A'}</td>
//                     <td>${job.抓取时间 || 'N/A'}</td>
//                     <td>${job.投递进度 ||  '未知' }</td>
//                     <td>${job.AI评分结果 !== undefined ? job.AI评分结果 : 'N/A'}</td>
//                     <td><button class="details-btn" data-index="${index}">详情</button></td>
//                 `;
//             });
//             // 为所有详情按钮添加点击事件监听器
//             const detailButtons = document.querySelectorAll('.details-btn');
//             detailButtons.forEach(button => {
//                 button.addEventListener('click', showJobDetails);
//             });
//         }
//     });
// }


//AI评分排序
document.addEventListener('DOMContentLoaded', function() {
    const sortScoreHeader = document.getElementById('sortScore');

    sortScoreHeader.addEventListener('click', function() {
        sortTableByScore();
    });
});

function sortTableByScore() {
    let table = document.getElementById("job-table");
    let tbody = table.tBodies[0]; // 获取 tbody
    let rowsArray = Array.from(tbody.rows); // 获取所有行

    // 使用一个标志来切换排序方式：升序或降序
    let sortDescending = table.dataset.sortDescending === 'true';

    // 排序逻辑
    rowsArray.sort(function(rowA, rowB) {
        // 获取 AI 评分内容
        let scoreA = rowA.getElementsByTagName("TD")[11].textContent.trim();
        let scoreB = rowB.getElementsByTagName("TD")[11].textContent.trim();

        // 处理"未知"的情况
        if (scoreA === "未知" && scoreB === "未知") return 0;
        if (scoreA === "未知") return sortDescending ? -1 : 1;
        if (scoreB === "未知") return sortDescending ? 1 : -1;

        // 如果评分是 '未评分'，将其视为 0
        let valueA = scoreA === '未评分' ? 0 : Number(scoreA);
        let valueB = scoreB === '未评分' ? 0 : Number(scoreB);

        // 根据排序方向排序
        return sortDescending ? valueB - valueA : valueA - valueB;
    });

    // 清空 tbody 并重新插入排序后的行
    tbody.innerHTML = '';
    rowsArray.forEach(row => tbody.appendChild(row));

    // 切换排序方式
    sortDescending = !sortDescending;
    table.dataset.sortDescending = sortDescending;

    // 更新排序指示器
    updateSortIndicators('sortScore', sortDescending);
}



//抓取时间排序
document.addEventListener('DOMContentLoaded', function() {
    const sortFetchTimeHeader = document.getElementById('sortFetchTime');

    sortFetchTimeHeader.addEventListener('click', function() {
        sortTableByFetchTime();
    });
});

function sortTableByFetchTime() {
    let table = document.getElementById("job-table");
    let tbody = table.tBodies[0];
    let rowsArray = Array.from(tbody.rows);

    // Toggle sort direction
    let sortDescending = table.dataset.sortDescendingFetchTime === 'true';

    // Sort by date, assuming the date format is consistent (like "YYYY-MM-DD")
    rowsArray.sort(function(rowA, rowB) {
        let fetchTimeA = rowA.cells[9].textContent.trim();
        let fetchTimeB = rowB.cells[9].textContent.trim();

        return sortDescending
            ? new Date(fetchTimeB) - new Date(fetchTimeA)
            : new Date(fetchTimeA) - new Date(fetchTimeB);
    });

    // Update table rows with sorted rows
    tbody.innerHTML = '';
    rowsArray.forEach(row => tbody.appendChild(row));

    // Toggle sorting direction for next click
    sortDescending = !sortDescending;
    table.dataset.sortDescendingFetchTime = sortDescending;

    // Update the sort indicator on the header
    updateSortIndicators('sortFetchTime', sortDescending);
}



//活跃时间排序

document.addEventListener('DOMContentLoaded', function() {
    const sortActiveTimeHeader = document.getElementById('sortActiveTime');

    // 添加点击事件监听器，点击进行排序
    sortActiveTimeHeader.addEventListener('click', function() {
        console.log('排序活跃时间的列被点击');
        sortTableByActiveTime();
    });
});

// 根据活跃时间进行排序
function sortTableByActiveTime() {
    let table = document.getElementById("job-table");
    let tbody = table.tBodies[0];
    let rowsArray = Array.from(tbody.rows);

    let sortDescending = table.dataset.sortDescendingActiveTime === 'true';

    rowsArray.sort(function(rowA, rowB) {
        let x = rowA.getElementsByTagName("TD")[8].textContent.trim();
        let y = rowB.getElementsByTagName("TD")[8].textContent.trim();
        const xValue = convertActiveTimeToValue(x);
        const yValue = convertActiveTimeToValue(y);
        return sortDescending ? yValue - xValue : xValue - yValue;
    });

    tbody.innerHTML = '';
    rowsArray.forEach(row => tbody.appendChild(row));

    sortDescending = !sortDescending;
    table.dataset.sortDescendingActiveTime = sortDescending;

    updateSortIndicators('sortActiveTime', sortDescending);
}

function updateSortIndicators(columnId, isDescending) {
    // 移除所有表头的排序类
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });

    // 根据当前排序状态，添加相应的类
    const header = document.getElementById(columnId);
    if (isDescending) {
        header.classList.add('sort-desc');
    } else {
        header.classList.add('sort-asc');
    }
}



// 将活跃时间字符串转换为可比较的权重值
function convertActiveTimeToValue(activeTime) {
    // console.log(`正在转换活跃时间: ${activeTime}`);

    // 检查activeTime是否存在，如果为空，返回一个大值，以便排序时排在最后
    if (!activeTime) {
        // console.log('活跃时间为空，返回最大值');
        return 201;
    }
    
    // 处理 "在线" 优先
    if (activeTime.includes("在线")) {
        // console.log('活跃时间为在线，优先处理');
        return 0; // "在线" 权重最小
    }

    // 处理 "在线" 优先
    if (activeTime.includes("刚刚")) {
        // console.log('活跃时间为"刚刚，优先处理');
        return 1; // "在线" 权重最小
    }

    if (activeTime.includes("今日活跃")) {
        // console.log('活跃时间为今日，优先处理');
        return 2; 
    }

    if (activeTime.includes("日内活跃")) {
        const days = parseInt(activeTime.match(/\d+/)[0], 10);
        return days+1;
    }
    if (activeTime.includes("本周活跃")) {
        
        return 6; // 将周转换为天
    }

    if (activeTime.includes("周内活跃")) {
        const weeks = parseInt(activeTime.match(/\d+/)[0], 10);
        return weeks * 7; // 将周转换为天
    }

    if (activeTime.includes("本月活跃")) {
        
        return 29; // 将周转换为天
    }

    if (activeTime.includes("月内活跃")) {
        const weeks = parseInt(activeTime.match(/\d+/)[0], 10);
        return weeks * 30; // 将周转换为天
    }

    if (activeTime.includes("近半年活跃")) {
        return 170; // 半年按180天计算
    }

    if (activeTime.includes("半年前活跃")) {
        return 180; // 半年按180天计算
    }

    // 如果匹配不上，则返回默认最大值
    return 200;
}

//沟通与否排序
document.addEventListener('DOMContentLoaded', function() {
    const sortHasCommunicatedHeader = document.getElementById('sortHasCommunicated');

    sortHasCommunicatedHeader.addEventListener('click', function() {
        sortTableByHasCommunicated();
    });
});

function sortTableByHasCommunicated() {
    let table = document.getElementById("job-table");
    let tbody = table.tBodies[0]; // 获取 tbody
    let rowsArray = Array.from(tbody.rows); // 获取所有行

    // 使用一个标志来切换排序方式：升序或降序
    let sortDescending = table.dataset.sortDescendingHasCommunicated === 'true';

    // 定义映射，将文本值映射为数值
    const valueMapping = {
        '未沟通': 1,
        '沟通未回复': 2,
        '职位已关闭': 3,
        '未知': 4,
        '': 5
    };

    // 排序逻辑
    rowsArray.sort(function(rowA, rowB) {
        let valueA = rowA.getElementsByTagName("TD")[10].textContent.trim(); // 第11列，索引为10
        let valueB = rowB.getElementsByTagName("TD")[10].textContent.trim();

        let mappedA = valueMapping[valueA] || 5; // 如果未找到，默认5
        let mappedB = valueMapping[valueB] || 5;

        return sortDescending ? mappedB - mappedA : mappedA - mappedB;
    });

    // 清空 tbody 并重新插入排序后的行
    tbody.innerHTML = '';
    rowsArray.forEach(row => tbody.appendChild(row));

    // 切换排序方式
    sortDescending = !sortDescending;
    table.dataset.sortDescendingHasCommunicated = sortDescending;

    // 更新排序指示器
    updateSortIndicators('sortHasCommunicated', sortDescending);
}



// 显示职位详情
function showJobDetails(event) {
    const index = event.target.getAttribute('data-index');
    chrome.storage.local.get('jobData', function(data) {
        if (data.jobData && data.jobData[index]) {
            const job = data.jobData[index];
            showPopup();
            updatePopupContent(job);
        }
    });
}

// 更新弹出层内容
function updatePopupContent(job) {
    // 更新匹配得分
    const score = job.AI评分结果 || 0;
    const progressBar = document.querySelector('.progress');
    const scoreText = document.getElementById('scoreText');
    progressBar.style.width = `${score}%`;
    scoreText.textContent = `${score}/100`;

    // 创建一个Showdown转换器
    var converter = new showdown.Converter(),
        aiAnalysisMarkdown = job.AI分析 || 'N/A';

    // 将Markdown转换为HTML
    var aiAnalysisHtml = converter.makeHtml(aiAnalysisMarkdown);

    // 更新AI分析部分的HTML
    document.getElementById('aiAnalysis').innerHTML = aiAnalysisHtml;

    // 更新职位详情
    document.getElementById('jobTitle').textContent = job.职位名称 || 'N/A';
    document.getElementById('companyName').textContent = job.公司名称 || 'N/A';
    document.getElementById('salary').textContent = job.薪资 || 'N/A';
    document.getElementById('benefits').textContent = job.职位福利 || 'N/A';
    document.getElementById('jobDescription').textContent = job.jobDescription || 'N/A';

    // 更新前往投递按钮链接
    const applyButton = document.querySelector('.apply-button');
    applyButton.href = job.详情链接 || '#'; // 若没有提供有效链接则默认不跳转
    // 更新简历摘要
    // 从存储中获取简历数据
    chrome.storage.local.get('resume', function(data) {
        document.getElementById('resumeSummary').value = data.resume || '';
    });


}

// 显示弹出层
function showPopup() {
    document.getElementById('overlay').style.display = 'block';
}

// 隐藏弹出层
function hidePopup() {
    document.getElementById('overlay').style.display = 'none';
}

// 设置AI评分按钮
function setupProcessDataButton() {
    const processDataButton = document.getElementById('processDataButton');
    const processResultDiv = document.getElementById('processResult');
    const resume = document.getElementById('resume');

    processResultDiv.style.backgroundColor = '#ffe6e6';
    processResultDiv.style.color = '#ff0000';
    processResultDiv.style.fontWeight = 'bold';
    processResultDiv.style.fontSize = '1.5em';

    processDataButton.addEventListener('click', async function() {
        const resumeContent = resume.value;

        if (!resumeContent.trim()) {
            processResultDiv.textContent = '错误: 请输入简历内容';
            return;
        }

        processResultDiv.textContent = '正在评价...';
        processDataButton.disabled = true;

        try {
            await processJobData(resumeContent);
            processResultDiv.textContent = '处理完成';
            loadJobTable(); // 重新加载表格
        } catch (error) {
            processResultDiv.textContent = `错误: ${error.message}`;
        } finally {
            processDataButton.disabled = false;
        }
    });
}

// 处理职位数据，调用AI进行评分
async function processJobData(resumeContent) {
    const result = await chrome.storage.local.get('jobData');
    const jobDataArray = result.jobData;

    if (!jobDataArray || !Array.isArray(jobDataArray)) {
        throw new Error('无效的jobData');
    }

    const selectedIndexes = Array.from(document.querySelectorAll('.row-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.getAttribute('data-index')));

    if (selectedIndexes.length === 0) {
        throw new Error('请至少选择一个职位');
    }
    // 检查选中的职位是否都有jobDescription
    const missingDescriptionJobs = selectedIndexes.filter(index => {
        const job = jobDataArray[index];
        return !job['jobDescription'] || job['jobDescription'].length <= 10;
    });

    if (missingDescriptionJobs.length > 0) {
        throw new Error(`有${missingDescriptionJobs.length}个职位缺少有效的职位描述，请先获取岗位介绍再进行评分`);
    }

    let processedJobs = 0;
    let totalJobs = selectedIndexes.length;

    const updatedJobData = await Promise.all(jobDataArray.map(async (job, index) => {
        if (selectedIndexes.includes(index) && job['jobDescription']) {
            try {
                const jobTitle = job['职位名称'];
                const jobDescription = job['jobDescription'];
                const aiAnalysis = await requestAIScore(jobTitle, jobDescription, resumeContent);

                job['AI分析'] = aiAnalysis;
                job['AI评分结果'] = getScoreFromAI(aiAnalysis);
                processedJobs++;
                updateProgress(processedJobs, totalJobs, "评分");
            } catch (error) {
                console.error(`处理职位 ${job['职位名称']} 时出错:`, error);
            }
        }
        return job;
    }));

    await chrome.storage.local.set({ jobData: updatedJobData });
    console.log('已更新jobData');
    loadJobTable(); // 全部评分完成后再更新表格
    return updatedJobData;
}

// 从AI响应中提取评分
function getScoreFromAI(text) {
    // 首先尝试匹配"总分：XX分"格式
    const totalScoreRegex = /总分[：:]\s*(\d+)\s*分/;
    const totalMatch = text.match(totalScoreRegex);
    
    if (totalMatch && totalMatch[1]) {
        const score = parseInt(totalMatch[1], 10);
        if (score <= 100) {
            console.log(`从总分中提取的分数是: ${score}`);
            return score;
        }
    }
    
    // 匹配各维度分数，但最多只计算前5个
    const scoreRegex = /：(\d+)\/\d+/g;
    let sum = 0;
    let count = 0;
    let match;
    let matchResults = [];

    // 先收集所有匹配结果
    while ((match = scoreRegex.exec(text)) !== null) {
        matchResults.push(parseInt(match[1], 10));
    }

    // 只处理前5个匹配结果
    for (let i = 0; i < Math.min(5, matchResults.length); i++) {
        sum += matchResults[i];
        count++;
    }

    if (count > 0) {
        console.log(`从各维度分数中计算的总分是: ${sum}，使用了 ${count} 个维度的分数`);
        return sum;
    }
    
    // 最后尝试匹配旧格式"XX/100"
    const oldFormatRegex = /(\d+)\/100(?!\d)/g;
    let lastValidScore = null;
    
    while ((match = oldFormatRegex.exec(text)) !== null) {
        const score = parseInt(match[1], 10);
        if (score <= 100) {
            lastValidScore = score;
        }
    }
    
    if (lastValidScore !== null) {
        console.log(`从旧格式中提取的分数是: ${lastValidScore}`);
        return lastValidScore;
    }
    
    console.log("未找到评分，返回未知");
    return "未知";
}


// 请求AI评分
function requestAIScore(jobTitle, jobDescription, resumeContent) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([
            'runMode', 
            'apiKey', 
            'model', 
            'apiUrl',
            'additionalRequirements'], function(data) {
            const isOnline = data.runMode;
            const apiKey = data.apiKey;
            const modelname = data.model || 'glm-4-flash';
            const apiUrl = data.apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            const additionalRequirements = data.additionalRequirements || '';

            const prompt = `
你现在是一位严格的招聘评估专家。请对比求职者简历与职位JD，严格按照以下维度评分(0-100分)：
- 技能匹配度(25分)：核心技能完全匹配得25分，部分匹配按比例得分
- 经验相关性(25分)：工作年限符合且行业经验相关得25分，缺一项扣分
- 教育背景(20分)：学历达标得10分，专业相关得10分
- 成就与项目(20分)：有相关成功项目经验得高分，无相关项目得低分
- 软技能与文化(10分)：软技能与公司文化匹配度

###总分低于60分表示不建议申请，60-75分为基本符合，75-90分为较好匹配，90分以上为极佳匹配。###

无论评分结果如何，你必须列出至少3个简历与职位不匹配的地方。如果找不到明显不匹配点，也要指出潜在风险点。

请参考以下标准：
- 90分以上：应聘者绝对是该职位最理想的前5%候选人
- 80-89分：比大多数候选人更合适，但仍有改进空间
- 70-79分：达到基本要求，属于普通合格候选人
- 60-69分：勉强达到最低要求，有明显短板
- 60分以下：不建议申请，成功概率极低

###注意：一般情况下，大多数候选人应该落在60-80分区间，请谨慎给出80分以上的高分。###

评分前，请先考虑：
1. 如果是完美匹配的候选人会是什么样子？
2. 如果是完全不匹配的候选人会是什么样子？
3. 当前候选人处于哪个位置？

记住，你的目标是给出准确评分，而非鼓励应聘者。过高评分会导致求职者浪费时间申请不适合的职位。###因此你必须狠狠的给用户扣分###

最后的打分格式为：
维度：20/25分

###不必输出总分###

评分后，请给出3个具体改进建议，帮助候选人提高与该职位的匹配度。这些建议必须具体明确，例如"需要学习X技术"而非"需要提升技术能力"。
`;

            // 构建用户内容，如果存在额外评分条件则添加到内容后面
            let userContent = `这是JD内容--职位名称: ${jobTitle}, 岗位描述: ${jobDescription},这是个人简历内容--${resumeContent}`;
            
            // 如果存在额外评分条件，添加到用户内容后面
            if (additionalRequirements) {
                userContent += `\n\n额外评分条件：${additionalRequirements}`;
            }

            if (isOnline) {
                // 在线模式
                const url = 'https://resume-matching-api.aitoolhub.top';
                const requestData = {
                    jobTitle: jobTitle,
                    jobDescription: jobDescription,
                    resumeContent: resumeContent,
                    modelname: modelname
                };

                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                })
                .then(async response => {
                    const text = await response.text();
                    if (!response.ok) {
                        console.error('请求失败，状态码:', response.status);
                        console.error('错误信息:', text);
                        reject(new Error(`请求失败，状态码: ${response.status}`));
                        return;
                    }
                    try {
                        const result = JSON.parse(text);
                        if (result && result.response) {
                            resolve(result.response);
                        } else {
                            console.warn('未找到 result.response，直接返回文本内容');
                            resolve(text);
                        }
                    } catch (error) {
                        console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
                        resolve(text);
                    }
                })
                .catch(error => reject(error));
            } else {
                // 本地模式 - 使用AIService类实现
                // 首先确定适配器类型
                let adapter;
                if (apiUrl.includes('api.openai.com') || apiUrl.includes('openai.azure.com')) {
                    adapter = 'openai';
                } else if (apiUrl.includes('open.bigmodel.cn')) {
                    adapter = 'zhipuai';
                } else if (apiUrl.includes('api.deepseek.com')) {
                    adapter = 'deepseek';
                } else if (apiUrl.includes('aliyuncs.com')) {
                    adapter = 'qwen';
                } else if (apiUrl.includes('generativelanguage.googleapis.com')) {
                    adapter = 'gemini';
                } else if (apiUrl.includes('api.anthropic.com')) {
                    adapter = 'claude';
                } else {
                    adapter = 'zhipuai'; // 默认使用智谱AI
                }
                
                console.log(`使用适配器: ${adapter}，API地址: ${apiUrl}，模型: ${modelname}`);
                
                // 准备请求参数
                let headers = {
                    'Content-Type': 'application/json'
                };
                
                // 根据适配器类型设置不同的认证头
                if (adapter === 'claude') {
                    headers['x-api-key'] = apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                } else {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
                
                let body;
                
                // 根据不同的适配器类型设置不同的请求体
                if (adapter === 'deepseek') {
                    // Deepseek专用请求格式
                    body = {
                        messages: [
                            { role: 'system', content: prompt },
                            { role: 'user', content: userContent }
                        ],
                        model: modelname,
                        frequency_penalty: 0,
                        max_tokens: 4095,
                        presence_penalty: 0,
                        response_format: {
                            type: "text"
                        },
                        stop: null,
                        stream: false,
                        stream_options: null,
                        temperature: 0,
                        top_p: 1,
                        tools: null,
                        tool_choice: "none",
                        logprobs: false,
                        top_logprobs: null
                    };
                } else if (adapter === 'claude') {
                    // Claude专用请求格式
                    // 将system prompt和user content合并为单个消息
                    const combinedContent = `${prompt}\n\n${userContent}`;
                    body = {
                        model: modelname,
                        max_tokens: 4095,
                        messages: [
                            { role: 'user', content: combinedContent }
                        ],
                        temperature: 0
                    };
                } else if (adapter === 'openai') {
                    // OpenAI专用请求格式
                    // 检查是否是新版的GPT-4.1模型
                    const isGpt41 = modelname.includes('gpt-4.1');
                    
                    body = {
                        model: modelname,
                        messages: [
                            // 对于GPT-4.1使用developer角色，否则使用system角色
                            { role: isGpt41 ? 'developer' : 'system', content: prompt },
                            { role: 'user', content: userContent }
                        ],
                        temperature: 0,
                        max_tokens: 4095
                    };
                } else if (adapter === 'gemini') {
                    // Gemini专用请求格式
                    // 注意：将system prompt和user content合并
                    const combinedContent = `${prompt}\n\n${userContent}`;
                    body = {
                        model: modelname,
                        messages: [
                            { role: 'user', content: combinedContent }
                        ],
                        // 其他可选参数
                        temperature: 0,
                        max_tokens: 4095
                    };
                } else {
                    // 其他模型的默认请求格式
                    body = {
                        model: modelname,
                        messages: [
                            { role: 'system', content: prompt },
                            { role: 'user', content: userContent }
                        ],
                        temperature: 0,
                        max_tokens: 4095
                    };
                }
                
                // 发送请求
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30分钟超时

                fetch(apiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(body),
                    signal: controller.signal
                })
                .then(async response => {
                    clearTimeout(timeoutId);
                    
                    // 创建一个ReadableStream来处理响应
                    const reader = response.body.getReader();
                    let responseText = '';
                    
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            
                            // 将Uint8Array转换为字符串
                            const chunk = new TextDecoder().decode(value);
                            
                            // 处理可能的空行和SSE keep-alive注释
                            const lines = chunk.split('\n');
                            for (const line of lines) {
                                if (line.trim() === '' || line.startsWith(': keep-alive')) {
                                    continue;
                                }
                                responseText += line + '\n';
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }
                    
                    if (!response.ok) {
                        console.error('请求失败，状态码:', response.status);
                        console.error('错误信息:', responseText);
                        reject(new Error(`请求失败，状态码: ${response.status}`));
                        return;
                    }
                    
                    try {
                        const result = JSON.parse(responseText);
                        
                        // 根据不同的模型适配器解析响应
                        if (adapter === 'deepseek') {
                            // Deepseek专用响应解析
                            if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
                                resolve(result.choices[0].message.content);
                            } else {
                                console.warn('未找到Deepseek标准响应格式，直接返回文本内容');
                                resolve(responseText);
                            }
                        } else if (adapter === 'claude') {
                            // Claude专用响应解析
                            if (result.content && result.content[0] && result.content[0].text) {
                                resolve(result.content[0].text);
                            } else {
                                console.warn('未找到Claude标准响应格式，直接返回文本内容');
                                resolve(responseText);
                            }
                        } else if (adapter === 'openai' || adapter === 'gemini') {
                            // OpenAI和Gemini共用响应解析逻辑
                            if (result.choices && result.choices[0] && result.choices[0].message) {
                                // 处理带有潜在annotations的内容
                                const content = result.choices[0].message.content;
                                resolve(content);
                            } else {
                                console.warn('未找到OpenAI/Gemini标准响应格式，直接返回文本内容');
                                resolve(responseText);
                            }
                        } else {
                            // 其他模型的默认响应解析
                            if (result.choices && result.choices[0] && result.choices[0].message) {
                                resolve(result.choices[0].message.content);
                            } else {
                                console.warn('未找到标准响应格式，直接返回文本内容');
                                resolve(responseText);
                            }
                        }
                    } catch (error) {
                        console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
                        resolve(responseText);
                    }
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        reject(new Error('请求超时（30分钟）'));
                    } else {
                        reject(error);
                    }
                });
            }
        });
    });
}



// // 请求AI评分
// function requestAIScore(jobTitle, jobDescription, resumeContent) {
//     return new Promise((resolve, reject) => {
//         chrome.storage.local.get(['runMode', 'apiKey', 'model'], function(data) {
//             const isOnline = data.runMode;
//             const apiKey = data.apiKey;
//             const modelname = data.model || 'glm-4-flash';

//             const prompt = `
// 你现在是一位严格的招聘评估专家。请对比求职者简历与职位JD，严格按照以下维度评分(0-100分)：
// - 技能匹配度(25分)：核心技能完全匹配得25分，部分匹配按比例得分
// - 经验相关性(25分)：工作年限符合且行业经验相关得25分，缺一项扣分
// - 教育背景(20分)：学历达标得10分，专业相关得10分
// - 成就与项目(20分)：有相关成功项目经验得高分，无相关项目得低分
// - 软技能与文化(10分)：软技能与公司文化匹配度

// ###总分低于60分表示不建议申请，60-75分为基本符合，75-90分为较好匹配，90分以上为极佳匹配。###

// 无论评分结果如何，你必须列出至少3个简历与职位不匹配的地方。如果找不到明显不匹配点，也要指出潜在风险点。

// 请参考以下标准：
// - 90分以上：应聘者绝对是该职位最理想的前5%候选人
// - 80-89分：比大多数候选人更合适，但仍有改进空间
// - 70-79分：达到基本要求，属于普通合格候选人
// - 60-69分：勉强达到最低要求，有明显短板
// - 60分以下：不建议申请，成功概率极低

// ###注意：一般情况下，大多数候选人应该落在60-80分区间，请谨慎给出80分以上的高分。###

// 评分前，请先考虑：
// 1. 如果是完美匹配的候选人会是什么样子？
// 2. 如果是完全不匹配的候选人会是什么样子？
// 3. 当前候选人处于哪个位置？

// 记住，你的目标是给出准确评分，而非鼓励应聘者。过高评分会导致求职者浪费时间申请不适合的职位。###因此你必须狠狠的给用户扣分###

// 最后的打分格式为：
// 总分：72/100

// 评分后，请给出3个具体改进建议，帮助候选人提高与该职位的匹配度。这些建议必须具体明确，例如"需要学习X技术"而非"需要提升技术能力"。

// `;

//             if (isOnline) {
//                 // 在线模式
//                 const url = 'https://resume-matching-api.aitoolhub.top';
//                 const requestData = {
//                     jobTitle: jobTitle,
//                     jobDescription: jobDescription,
//                     resumeContent: resumeContent,
//                     modelname: modelname
//                 };

//                 fetch(url, {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify(requestData)
//                 })
//                 .then(async response => {
//                     const text = await response.text();
//                     if (!response.ok) {
//                         console.error('请求失败，状态码:', response.status);
//                         console.error('错误信息:', text);
//                         reject(new Error(`请求失败，状态码: ${response.status}`));
//                         return;
//                     }
//                     try {
//                         const result = JSON.parse(text);
//                         if (result && result.response) {
//                             resolve(result.response);
//                         } else {
//                             console.warn('未找到 result.response，直接返回文本内容');
//                             resolve(text);
//                         }
//                     } catch (error) {
//                         console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
//                         resolve(text);
//                     }
//                 })
//                 .catch(error => reject(error));
//             } else {
//                 // 本地模式
//                 const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
//                 const data = {
//                     model: modelname,
//                     messages: [
//                         {
//                             role: "system",
//                             content: prompt
//                         },
//                         {
//                             role: "user",
//                             content: `这是JD内容--职位名称: ${jobTitle}, 岗位描述: ${jobDescription},这是个人简历内容--${resumeContent}`
//                         }
//                     ],
//                     temperature: 0,
//                     max_tokens : 4095
//                 };

//                 fetch(url, {
//                     method: 'POST',
//                     headers: {
//                         'Authorization': `Bearer ${apiKey}`,
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify(data)
//                 })
//                 .then(async response => {
//                     const text = await response.text();
//                     if (!response.ok) {
//                         console.error('请求失败，状态码:', response.status);
//                         console.error('错误信息:', text);
//                         reject(new Error(`请求失败，状态码: ${response.status}`));
//                         return;
//                     }
//                     try {
//                         const result = JSON.parse(text);
//                         if (result.choices && result.choices[0] && result.choices[0].message) {
//                             resolve(result.choices[0].message.content);
//                         } else {
//                             console.warn('未找到 result.choices[0].message，直接返回文本内容');
//                             resolve(text);
//                         }
//                     } catch (error) {
//                         console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
//                         resolve(text);
//                     }
//                 })
//                 .catch(error => reject(error));
//             }
//         });
//     });
// }

// 开始抓取JD详情
function startFetching() {
    chrome.storage.local.get(['jobData'], function(result) {
        console.log('加载的全部职位数据:', result.jobData);

        if (result.jobData) {
            const selectedIndexes = Array.from(document.querySelectorAll('.row-checkbox:checked'))
                .map(checkbox => parseInt(checkbox.getAttribute('data-index')));

            jobQueue = result.jobData.filter((job, index) =>
                selectedIndexes.includes(index) &&
                job.详情链接 &&
                job.详情链接 !== 'N/A'
            );

            console.log('需要抓取详情的职位数量:', jobQueue.length);

            if (jobQueue.length > 0) {
                isFetching = true;
                btn.textContent = "停止加载";
                loadingIcon.style.display = 'inline-block';
                fetchAllJobs();  // 开始批量抓取
            } else {
                alert("没有选中需要抓取的职位详情");
            }
        } else {
            console.log('没有找到已保存的职位数据');
            alert("没有找到已保存的职位数据");
        }
    });
}

// // 批量抓取所有职位详情
// function fetchAllJobs() {
//     let totalJobs = jobQueue.length;
//     let processedJobs = 0;

//     jobQueue.forEach((job, index) => {
//         if (!isFetching) return; // 在每次循环时检查是否停止抓取
//         setTimeout(() => {
//             if (!isFetching) return; // 在每次setTimeout执行时检查
//             fetchJobDetails(job, () => {
//                 processedJobs++;
//                 updateProgress(processedJobs, totalJobs, "JD");

//                 if (processedJobs === totalJobs) {
//                     stopFetching();  // 所有抓取完成后停止
//                     // loadJobTable();  // 一次性更新表格
//                 }
//             });
//         }, index * 1000);
//     });
// }

// 批量抓取所有职位详情
function fetchAllJobs() {
    let totalJobs = jobQueue.length;
    let processedJobs = 0;
    const baseDelay = 1000; // 每个请求的最小延迟（1秒）
    const maxRandomDelay = 1000; // 最大随机延迟（1秒）
    const stepSize = 50; // 阶梯步长，每50个请求为一个阶梯

    jobQueue.forEach((job, index) => {
        if (!isFetching) return;

        // 计算当前所在的阶梯
        const step = Math.floor(index / stepSize);
        // 根据阶梯设置额外延迟，阶梯0对应1秒延迟，阶梯1对应2秒，阶梯2对应3秒，阶梯3对应5秒
        let additionalDelay = 0;
        if (step === 0) {
            additionalDelay = 1 * baseDelay; // 1秒
        } else if (step === 1) {
            additionalDelay = 2 * baseDelay; // 2秒
        } else if (step === 2) {
            additionalDelay = 3 * baseDelay; // 3秒
        } else  {
            additionalDelay = 4 * baseDelay; // 4秒
        }

        // 计算随机延迟
        const randomDelay = Math.floor(Math.random() * maxRandomDelay);
        // 计算总延迟时间
        const delay = additionalDelay + randomDelay;
        // Log 具体的延迟时间
        console.log(`Job ${index + 1}: Total Delay = ${delay * index} ms`);

        setTimeout(() => {
            if (!isFetching) return;
            fetchJobDetails(job, () => {
                processedJobs++;
                updateProgress(processedJobs, totalJobs, "JD");

                if (processedJobs === totalJobs) {
                    stopFetching();
                }
            });
        }, delay * index);
    });
}

// 抓取职位详情
function fetchJobDetails(job, callback) {
    if (job.详情链接) {
        chrome.runtime.sendMessage({ action: "fetchJobDetails", url: job.详情链接 }, function(response) {
            console.log('抓取职位详情响应:', response);
            callback(); // 回调表示处理完成
        });
    } else {
        callback(); // 没有有效链接时直接调用回调
    }
}

// 更新抓取和评分进度
function updateProgress(processed, total, type = '') {
    let task = '';
    if (type === "JD") {
        task = "抓取JD";
    } else if (type === "评分") {
        task = "评分";
    } else if (type === "打招呼") {
        task = "打招呼";
    } else {
        task = "处理";
    }
    processResultDiv.textContent = `已处理 ${processed} / ${total} 个${task}项`;
}


// 停止抓取JD详情
function stopFetching() {
    isFetching = false;
    btn.textContent = "获取岗位介绍";
    loadingIcon.style.display = 'none';
    console.log('停止抓取');
}

// 监听从后台发送的消息，处理JD抓取结果并保存数据
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "jobDetailsFetched") {
        if (message.success) {
            console.log('JD获取成功:', message.data);

            chrome.storage.local.get(['jobData'], function(result) {
                let updatedJobData = result.jobData.map(job => {
                    // 根据 URL 匹配职位，更新职位详情
                    if (job.详情链接 === message.url) {
                        // 仅在投递进度为 '未沟通' 或 投递进度为空时更新投递进度
                        let updatedJob = { ...job, ...message.data };
                        if (updatedJob.投递进度 === '未沟通' || updatedJob.投递进度 === '' || updatedJob.投递进度 === undefined) {
                            updatedJob.投递进度 = message.data.投递进度 || '未沟通';
                        }
                        return updatedJob;
                    }
                    return job;
                });

                chrome.storage.local.set({ jobData: updatedJobData }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('保存 jobData 时发生错误:', chrome.runtime.lastError);
                    } else {
                        console.log('职位详情已更新并保存');
                        // 在这里更新对应的 DOM 元素
                        updatedJobData.forEach((job, index) => {
                            const jobRow = document.querySelector(`[data-index="${index}"]`);
                            if (jobRow) {
                                // 更新职位描述
                                const descriptionElement = jobRow.querySelector('.job-description');
                                if (descriptionElement) {
                                    descriptionElement.textContent = job.职位名称 || '未知';
                                    console.log('职位名称更新');
                                }

                                // 更新投递进度
                                const progressElement = jobRow.querySelector('.job-progress');
                                if (progressElement) {
                                    progressElement.textContent = job.投递进度 || '未知';
                                    // console.log('投递进度更新');
                                }

                                // 更新薪资
                                const salaryElement = jobRow.querySelector('.job-salary');
                                if (salaryElement) {
                                    salaryElement.textContent = job.薪资 || '未知';
                                    // console.log('薪资更新');
                                }

                                // 更新福利待遇
                                const benefitsElement = jobRow.querySelector('.job-benefits-column');
                                if (benefitsElement) {
                                    benefitsElement.textContent = job.职位福利 || '未知';
                                    // console.log('福利更新');
                                }

                                // 更新活跃时间
                                const activeTimeElement = jobRow.querySelector('.job-active-time');
                                if (activeTimeElement) {
                                    activeTimeElement.textContent = job.activeTime || '未知';
                                }

                                // 更新抓取时间
                                const fetchTimeElement = jobRow.querySelector('.job-fetch-time');
                                if (fetchTimeElement) {
                                    fetchTimeElement.textContent = job.抓取时间 || '未知';
                                }

                                // 更新 AI 评分结果
                                const scoreElement = jobRow.querySelector('.job-score');
                                if (scoreElement) {
                                    scoreElement.textContent = job.AI评分结果 !== undefined ? job.AI评分结果 : 'N/A';
                                }
                            }
                        });
                    }
                });
            });
        } else {
            console.error('JD获取失败:', message.error);
        }
    }
});


// 选中行的处理，添加或移除选中状态的样式
document.addEventListener('change', function(e) {
    if (e.target && e.target.classList.contains('row-checkbox')) {
        const row = e.target.closest('tr');
        if (e.target.checked) {
            row.classList.add('state-selected');
        } else {
            row.classList.remove('state-selected');
        }
    }
});


//导出岗位数据
document.getElementById('exportJobData').addEventListener('click', function() {
    // 获取chrome.storage.local中的岗位数据
    chrome.storage.local.get('jobData', function(result) {
        const jobData = result.jobData || [];
        
        if (jobData.length === 0) {
            alert('没有岗位数据可以导出');
            return;
        }
        
        // 使用xlsx库创建一个工作簿
        const worksheet = XLSX.utils.json_to_sheet(jobData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '岗位数据');

        // 将数据导出为xlsx文件
        XLSX.writeFile(workbook, 'job_data.xlsx');
    });
});


//表格选择逻辑
document.addEventListener('DOMContentLoaded', function () {
    const jobTable = document.getElementById('job-table');
    const selectAllCheckbox = document.getElementById('select-all');
    let lastSelectedIndex = null;

    // 单击选择行
    jobTable.addEventListener('click', function (event) {
        const targetRow = event.target.closest('tr');
        
        // 如果点击的是复选框，则不执行行的点击事件
        if (event.target.type === 'checkbox') {
            // 复选框点击时，手动处理选中状态的样式
            const checkbox = event.target;
            if (checkbox.checked) {
                targetRow.classList.add('selected'); // 添加选中样式
            } else {
                targetRow.classList.remove('selected'); // 移除选中样式
            }
            return;
        }

        if (targetRow && targetRow.rowIndex > 0) { // 确保点击的是数据行而不是标题行
            const checkbox = targetRow.querySelector('input[type="checkbox"]');
            if (event.shiftKey && lastSelectedIndex !== null) {
                // Shift 多选逻辑
                const currentIndex = targetRow.rowIndex;
                const start = Math.min(lastSelectedIndex, currentIndex);
                const end = Math.max(lastSelectedIndex, currentIndex);

                for (let i = start; i <= end; i++) {
                    const row = jobTable.rows[i];
                    const rowCheckbox = row.querySelector('input[type="checkbox"]');
                    rowCheckbox.checked = true;
                    row.classList.add('selected'); // 添加选中样式
                }
            } else {
                // 单击选中当前行
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    targetRow.classList.add('selected'); // 添加选中样式
                } else {
                    targetRow.classList.remove('selected'); // 移除选中样式
                }
                lastSelectedIndex = targetRow.rowIndex;
            }
        }
    });

    // 选中所有行
    selectAllCheckbox.addEventListener('change', function () {
        const allCheckboxes = jobTable.querySelectorAll('tbody input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
            const row = checkbox.closest('tr');
            if (selectAllCheckbox.checked) {
                row.classList.add('selected'); // 添加选中样式
            } else {
                row.classList.remove('selected'); // 移除选中样式
            }
        });
    });
});

//隐藏岗位
document.getElementById('hideSelectedResumes').addEventListener('click', function () {
    chrome.storage.local.get('jobData', function (data) {
        const jobData = data.jobData || [];
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');

        // 更新选中项的是否隐藏字段
        checkboxes.forEach(cb => {
            const index = parseInt(cb.getAttribute('data-index'));
            jobData[index].是否隐藏 = '是'; // 标记为已隐藏
        });

        // 保存更新后的 jobData
        chrome.storage.local.set({ jobData: jobData }, function () {
            // alert('选中的简历已隐藏');
            loadJobTable(); // 重新加载简历分析页面表格
        });
    });
});

function loadHiddenJobTable() {
    console.log('加载隐藏岗位表格...');
    chrome.storage.local.get('jobData', function (data) {
        const jobData = data.jobData || [];
        const tbody = document.querySelector('#hidden-job-table tbody');
        tbody.innerHTML = '';

        // 添加全选功能
        const selectAllHidden = document.getElementById('select-all-hidden');
        selectAllHidden.addEventListener('change', function() {
            const allHiddenCheckboxes = document.querySelectorAll('.row-checkbox-hidden');
            allHiddenCheckboxes.forEach(checkbox => {
                checkbox.checked = selectAllHidden.checked;
                const row = checkbox.closest('tr');
                if (selectAllHidden.checked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
            });
        });

        // 只显示标记为"是否隐藏: 是"的岗位
        let hasHiddenJobs = false;
        jobData.forEach((job, index) => {
            if (job.是否隐藏 === '是') {
                hasHiddenJobs = true;
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td><input type="checkbox" class="row-checkbox-hidden" data-index="${index}"></td>
                    <td>${job.职位名称 || 'N/A'}</td>
                    <td>${job.工作地点 || 'N/A'}</td>
                    <td>${job.薪资 || 'N/A'}</td>
                    <td>${job.公司名称 || 'N/A'}</td>
                    <td>${job.工作经验 || 'N/A'}</td>
                    <td>${job.学历要求 || 'N/A'}</td>
                    <td class="job-benefits-column" title="${job.职位福利 || 'N/A'}">${job.职位福利 || 'N/A'}</td>
                    <td>${job.activeTime || 'N/A'}</td>
                    <td>${job.抓取时间 || 'N/A'}</td>
                    <td>${job.投递进度 ||  '未知' }</td>
                    <td>${job.AI评分结果 !== undefined ? job.AI评分结果 : 'N/A'}</td>
                    <td><button class="details-btn" data-index="${index}">详情</button></td>
                `;
            }
        });

        if (!hasHiddenJobs) {
            // 如果没有隐藏的岗位，显示提示信息
            const emptyRow = tbody.insertRow();
            emptyRow.innerHTML = `<td colspan="13" style="text-align: center; padding: 20px;">没有隐藏的岗位</td>`;
        }

        // 为所有详情按钮添加点击事件监听器
        const detailButtons = document.querySelectorAll('#hidden-job-table .details-btn');
        detailButtons.forEach(button => {
            button.addEventListener('click', showJobDetails);
        });

        // 为隐藏岗位表格中的复选框添加事件监听
        const hiddenCheckboxes = document.querySelectorAll('.row-checkbox-hidden');
        hiddenCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const row = this.closest('tr');
                if (this.checked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                    // 如果取消选中某个复选框，也要取消全选框的选中状态
                    document.getElementById('select-all-hidden').checked = false;
                }
            });
        });
    });
}


document.getElementById('restoreSelectedJobs').addEventListener('click', function () {
    chrome.storage.local.get('jobData', function (data) {
        const jobData = data.jobData || [];
        const checkboxes = document.querySelectorAll('.row-checkbox-hidden:checked');

        // 更新选中项的是否隐藏字段为"否"
        checkboxes.forEach(cb => {
            const index = parseInt(cb.getAttribute('data-index'));
            jobData[index].是否隐藏 = '否'; // 恢复显示
        });

        // 保存更新后的 jobData
        chrome.storage.local.set({ jobData: jobData }, function () {
            // alert('选中的简历已恢复');
            loadHiddenJobTable(); // 重新加载隐藏岗位页面表格
            loadJobTable(); // 重新加载简历分析页面表格
        });
    });
});


// 批量打招呼功能
// 获取 processResultDiv 元素
const processResultDiv = document.getElementById('processResult');


// 在文件开头添加新的函数来获取和更新每日打招呼次数
async function getDailyGreetCount() {
    return new Promise((resolve) => {
        const today = new Date().toLocaleDateString();
        chrome.storage.local.get(['greetCount', 'greetDate'], function(data) {
            if (data.greetDate === today) {
                resolve(data.greetCount || 0);
            } else {
                // 如果是新的一天，重置计数
                chrome.storage.local.set({
                    greetCount: 0,
                    greetDate: today
                }, () => resolve(0));
            }
        });
    });
}

async function incrementGreetCount(increment) {
    const today = new Date().toLocaleDateString();
    return new Promise((resolve) => {
        chrome.storage.local.get(['greetCount', 'greetDate'], function(data) {
            let newCount = 0;
            if (data.greetDate === today) {
                newCount = (data.greetCount || 0) + increment;
            } else {
                newCount = increment;
            }
            chrome.storage.local.set({
                greetCount: newCount,
                greetDate: today
            }, () => resolve(newCount));
        });
    });
}

// 修改批量打招呼功能
document.addEventListener('DOMContentLoaded', async function() {
    const greetButton = document.getElementById('greetSelectedJobs');

    // 绑定批量打招呼功能
    greetButton.addEventListener('click', async function() {
        console.log("批量打招呼按钮被点击，开始处理选中的岗位...");
        const selectedJobs = getSelectedJobs();
        console.log(`已选择的岗位数量: ${selectedJobs.length}`);

        // 获取今日已打招呼次数
        const currentGreetCount = await getDailyGreetCount();

        // 如果超过150次，只做提示但允许继续
        if (currentGreetCount >= 150) {
            alert('超出boss直聘每日招呼上限150次！');
        }

        // 初始化进度显示
        processResultDiv.textContent = `开始处理 ${selectedJobs.length} 个岗位...`;

        // 更新打招呼次数并执行打招呼操作
        await incrementGreetCount(selectedJobs.length);
        batchGreetJobs(selectedJobs);
    });
});

function getSelectedJobs() {
    const selectedJobs = [];
    const checkboxes = document.querySelectorAll('.row-checkbox:checked'); 
    console.log(`发现 ${checkboxes.length} 个选中的复选框`);

    checkboxes.forEach(checkbox => {
        const jobRow = checkbox.closest('tr');
        const jobLink = jobRow.dataset.jobLink || '#';
        console.log(`岗位详情链接: ${jobLink}`);
        selectedJobs.push({ link: jobLink });
    });
    return selectedJobs;
}


// 修改 batchGreetJobs 函数，添加当前打招呼次数显示
function batchGreetJobs(jobs) {
    let totalJobs = jobs.length;
    let processedJobs = 0;

    if (totalJobs === 0) {
        processResultDiv.textContent = '未选择任何岗位';
        return;
    }

    // 显示当前进度和今日剩余次数
    getDailyGreetCount().then(currentCount => {
        const remainingToday = 100 - currentCount;
        processResultDiv.textContent = `今日已打招呼${currentCount}次，剩余${remainingToday}次`;
    });

    jobs.forEach((job, index) => {
        console.log(`开始处理第 ${index + 1} 个岗位，链接: ${job.link}`);

        setTimeout(() => {
            openJobAndGreet(job, () => {
                processedJobs++;
                updateProgress(processedJobs, totalJobs);

                // 如果所有岗位都已处理完成，显示最终状态
                if (processedJobs === totalJobs) {
                    getDailyGreetCount().then(currentCount => {
                        const remainingToday = 100 - currentCount;
                        processResultDiv.textContent = `所有 ${totalJobs} 个岗位已处理完成。今日已打招呼${currentCount}次，剩余${remainingToday}次`;
                    });
                }
            });
        }, index * 5000); // 每隔5秒处理一个岗位
    });
}

function openJobAndGreet(job, callback) {
    if (job.link !== '#') {
        chrome.tabs.create({ url: job.link, active: false }, function(tab) {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['contentScript.js']
                    }, function() {
                        console.log(`已在标签页 ${tab.id} 中执行内容脚本`);

                        // 调用回调函数，表示处理完成
                        if (typeof callback === 'function') {
                            callback();
                        }
                    });
                }
            });
        });
    } else {
        console.log(`无有效链接，跳过该岗位`);

        // 调用回调函数，表示处理完成
        if (typeof callback === 'function') {
            callback();
        }
    }
}

// 修改 updateProgress 函数，添加当前打招呼次数显示
async function updateProgress(processed, total) {
    const currentCount = await getDailyGreetCount();
    const remainingToday = 100 - currentCount;
    processResultDiv.textContent = `已处理 ${processed} / ${total} 个岗位。今日已打招呼${currentCount}次，剩余${remainingToday}次`;
}


// 更新表格行的函数
function updateTableRowHasCommunicated(updatedUrl) {
    const rows = document.querySelectorAll('#job-table tbody tr');
    let targetRow = null;

    rows.forEach(row => {
        if (row.dataset.jobLink === updatedUrl) {
            targetRow = row;
        }
    });

    if (targetRow) {
        // 假设 hasCommunicated 是表格的第 11 列（索引为 10）
        const hasCommunicatedCell = targetRow.cells[10];
        hasCommunicatedCell.textContent = '是';

        // 添加高亮效果
        targetRow.classList.add('updated-row');
        setTimeout(() => {
            targetRow.classList.remove('updated-row');
        }, 2000); // 2秒后移除高亮效果

        console.log(`已更新表格中对应行的 hasCommunicated 状态`);
    } else {
        console.log(`未找到匹配的表格行，无法更新`);
    }
}

//识别投递进度

// document.getElementById('scrapeConversationButton').addEventListener('click', function() {
//     const jobUrls = [
//         'https://www.zhipin.com/job_detail/cf7fa9fbfdbb66d71Hx_3tm-EFFW.html', // 示例职位1
//         'https://www.zhipin.com/job_detail/0d80b9800649a1661H1_0tS8E1VV.html', // 示例职位2
//         'https://www.zhipin.com/job_detail/579cb7658d8a1c2d1H172t-7GFNS.html', // 示例职位2
//         'https://www.zhipin.com/job_detail/8290edd20ea780fa1HN73dy0FFRQ.html', // 示例职位2
//         // 你可以继续在这个数组中添加更多的 URL
//     ];
//     // const jobUrls = [
//     //     'https://www.zhipin.com/job_detail/cf7fa9fbfdbb66d71Hx_3tm-EFFW.html', // 示例职位1
//     // ];

//     // 遍历所有职位页面 URL
//     jobUrls.forEach(jobUrl => {
//         console.log(`正在处理 URL: ${jobUrl}`);
//         chrome.runtime.sendMessage({ action: 'processConversationUrl', url: jobUrl }, function(response) {
//             if (response.status === 'error') {
//                 console.error(`处理对话内容时出错，URL: ${jobUrl}`);
//             } else if (response.status === 'no_communication_needed') {
//                 console.log(`无需点击沟通按钮，URL: ${jobUrl}`);
//             } else {
//                 console.log(`已成功处理对话内容，URL: ${jobUrl}`);
//             }
//         });
//     });
// });
// 监听 "识别投递进度" 按钮点击事件
document.getElementById('scrapeConversationButton').addEventListener('click', function() {
    // 获取选中的行
    const selectedRows = document.querySelectorAll('.row-checkbox:checked');

    if (selectedRows.length === 0) {
        alert('请至少选择一个职位!');
        return;
    }

    selectedRows.forEach(row => {
        const index = parseInt(row.getAttribute('data-index'));
        chrome.storage.local.get('jobData', async function(data) {
            if (data.jobData && data.jobData[index]) {
                const jobUrl = data.jobData[index].详情链接;
                if (jobUrl) {
                    chrome.runtime.sendMessage({ action: 'processConversationUrl', url: jobUrl }, async function(response) {
                        console.log('response.status:', response.status);
                        console.log('response.conversation:', response.conversation);
                        
                        if (response.status === 'error') {
                            console.error('处理对话内容时出错');
                            data.jobData[index].投递进度 = '未知';
                        } else if (response.status === 'no_communication_needed') {
                            console.log('未沟通');
                            data.jobData[index].投递进度 = '未沟通';
                        } else {
                            console.log('已成功处理对话内容');
                            if (response.conversation) {
                                const conversation = response.conversation;
                                let isFriend = false;
                                let hasUserReply = true;
                                for (const message of conversation) {
                                    const textContent = message.textContent;
                                    if (textContent) {
                                        const sender = isFriend ? '招聘方' : '用户';
                                        if (sender === '招聘方') {
                                            hasUserReply = false;
                                            break;
                                        }
                                        isFriend = !isFriend;
                                    }
                                }
                                if (hasUserReply) {
                                    data.jobData[index].投递进度 = '沟通未回复';
                                } else {
                                     // 在这里调用大模型处理对话内容
                                     processConversationAI(conversation).then(aiResponse => {
                                        data.jobData[index].投递进度 = aiResponse;
                                        // 更新jobData
                                        chrome.storage.local.set({ jobData: data.jobData }, function() {
                                            if (chrome.runtime.lastError) {
                                                console.error('保存 jobData 时发生错误:', chrome.runtime.lastError);
                                            } else {
                                                console.log('职位数据已更新');
                                            }
                                        });
                                    }).catch(error => {
                                        console.error('AI 处理对话内容时出错:', error);
                                        data.jobData[index].投递进度 = '未知';
                                        // 更新jobData
                                        chrome.storage.local.set({ jobData: data.jobData }, function() {
                                            if (chrome.runtime.lastError) {
                                                console.error('保存 jobData 时发生错误:', chrome.runtime.lastError);
                                            } else {
                                                console.log('职位数据已更新');
                                            }
                                        });
                                    });
                                }
                            } else {
                                data.jobData[index].投递进度 = '未知';
                            }
                        }
                        // 更新jobData
                        chrome.storage.local.set({ jobData: data.jobData }, function() {
                            if (chrome.runtime.lastError) {
                                console.error('保存 jobData 时发生错误:', chrome.runtime.lastError);
                            } else {
                                console.log('职位数据已更新');
                            }
                        });
                    });
                } else {
                    console.log(`第 ${index + 1} 个职位的详情链接为空,无法处理。`);
                    data.jobData[index].投递进度 = '未知';
                    // 更新jobData
                    chrome.storage.local.set({ jobData: data.jobData }, function() {
                        if (chrome.runtime.lastError) {
                            console.error('保存 jobData 时发生错误:', chrome.runtime.lastError);
                        } else {
                            console.log('职位数据已更新');
                        }
                    });
                }
            } else {
                console.error(`无法获取第 ${index + 1} 个职位的数据。`);
                data.jobData[index].投递进度 = '未知';
                // 更新jobData
                chrome.storage.local.set({ jobData: data.jobData }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('保存 jobData 时发生错误:', chrome.runtime.lastError);
                    } else {
                        console.log('职位数据已更新');
                    }
                });
            }
        });
    });
});


// 定义处理对话内容的函数
function processConversationAI(conversation) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['runMode', 'apiKey', 'model'], function(data) {
            const isOnline = data.runMode;
            const apiKey = data.apiKey;
            const modelname = data.model || 'glm-4-flash';

            const prompt = `
# 角色
你是一位招聘专员，擅长分析用户与招聘方的沟通记录，并判断投递进度。

## 技能
1. 能够理解对话内容，判断用户是否回复了招聘方的消息。
2. 根据对话内容判断投递进度。

## 工作流
1. 阅读用户与招聘方的对话记录。
2. 根据对话的最后部分，判断当前的投递进度
3. 将投递进度状态进行格式化输出。

## 要求
1. 在这些选项中选择符合的进度：1-邀请投简历 2-待回复招聘方 3-用户已投招聘方未回 4-招聘方进行筛选与评估 5-招聘方邀请面试/笔试  6-不合适（结束）7-发放offer。
2. 返回最符合用户投递进度的序号。
## 任务
请对以下对话内容进行分析，判断投递进度状态：

`;

            // 将 conversation 转换为文本
            const conversationText = conversation.map(msg => msg.textContent).join('\n');

            if (isOnline) {
                // 在线模式
                const url = 'https://your-online-api-url.com'; // 请替换为您的在线API地址
                const requestData = {
                    prompt: prompt + conversationText,
                    modelname: modelname
                };

                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                })
                .then(async response => {
                    const text = await response.text();
                    if (!response.ok) {
                        console.error('请求失败，状态码:', response.status);
                        console.error('错误信息:', text);
                        reject(new Error(`请求失败，状态码: ${response.status}`));
                        return;
                    }
                    try {
                        const result = JSON.parse(text);
                        if (result && result.response) {
                            resolve(result.response.trim());
                        } else {
                            console.warn('未找到 result.response，直接返回文本内容');
                            resolve(text.trim());
                        }
                    } catch (error) {
                        console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
                        resolve(text.trim());
                    }
                })
                .catch(error => reject(error));
            } else {
                // 本地模式
                const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                const requestData = {
                    model: modelname,
                    messages: [
                        {
                            role: "system",
                            content: prompt
                        },
                        {
                            role: "user",
                            content: conversationText
                        }
                    ]
                };

                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                })
                .then(async response => {
                    const text = await response.text();
                    if (!response.ok) {
                        console.error('请求失败，状态码:', response.status);
                        console.error('错误信息:', text);
                        reject(new Error(`请求失败，状态码: ${response.status}`));
                        return;
                    }
                    try {
                        const result = JSON.parse(text);
                        if (result.choices && result.choices[0] && result.choices[0].message) {
                            resolve(result.choices[0].message.content.trim());
                        } else {
                            console.warn('未找到 result.choices[0].message，直接返回文本内容');
                            resolve(text.trim());
                        }
                    } catch (error) {
                        console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
                        resolve(text.trim());
                    }
                })
                .catch(error => reject(error));
            }
        });
    });
}