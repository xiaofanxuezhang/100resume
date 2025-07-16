// 删除或注释掉与总页数相关的函数和代码
/*
function updateTotalPagesDisplay() {
    chrome.storage.local.get(['pagesToScrape'], function(data) {
        const totalPages = data.pagesToScrape || 5;
        document.getElementById('totalPagesInput').value = totalPages;
    });
}

document.getElementById('totalPagesInput').addEventListener('input', function() {
    const newTotalPages = parseInt(this.value) || 5;
    chrome.storage.local.set({pagesToScrape: newTotalPages}, function() {
        console.log(`总页数已更新为: ${newTotalPages}`);
    });
});


// 当弹窗加载时，更新 totalPages 显示
document.addEventListener('DOMContentLoaded', function() {
    updateTotalPagesDisplay();
});

// 当弹窗获得焦点时，更新 totalPages 显示
window.addEventListener('focus', function() {
    updateTotalPagesDisplay();
});
*/

// 保留其他必要的初始化代码
document.addEventListener('DOMContentLoaded', function() {
    // 任何其他需要在页面加载时执行的初始化代码
});

document.getElementById('scrapeData').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tabUrl = tabs[0].url;

        // 检查URL是否为BOSS直聘网站
        if (tabUrl.includes('zhipin.com')) {
            console.log('正在执行抓取数据逻辑');
            
            // 抓取当前页面数据
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                func: scrapeRecommendPageData,
            }, function(results) {
                if (chrome.runtime.lastError) {
                    console.error('执行脚本时出错:', chrome.runtime.lastError);
                    alert('数据抓取失败，请查看控制台获取详细信息');
                } else if (results && results[0] && results[0].result) {
                    const jobData = results[0].result;
                    console.log('抓取到的当前页面数据:', jobData);
                    
                    // 存储抓取的数据
                    console.log('发送数据到background.js');
                    chrome.runtime.sendMessage({type: 'SAVE_JOB_DATA', data: jobData}, function(response) {
                        console.log('收到background.js的响应:', response);
                        if (response && response.success) {
                            console.log(`成功保存数据，新增${response.addedCount}条，总共${response.total}条`);
                        } else {
                            console.error('保存数据失败:', response);
                        }
                    });
                    
                    // 提示用户手动下拉页面加载更多内容
                    alert('已抓取当前页面数据。如需抓取更多数据，请下拉页面加载更多内容后再次点击"抓取数据"按钮。');
                } else {
                    console.error('抓取结果无效:', results);
                    alert('数据抓取失败，返回结果无效');
                }
            });
        } else {
            console.log('页面错误: 当前页面不是BOSS直聘网站');
            alert('请在BOSS直聘网站使用本插件');
        }
    });
});

// function scrapeRecommendPageData() {
//     const jobData = [];
    
//     const jobCards = document.querySelectorAll('.job-card-wrap');
//     jobCards.forEach(job => {
//         const jobName = job.querySelector('.job-name') ? job.querySelector('.job-name').innerText.trim() : 'N/A';
//         const experience = job.querySelectorAll('.tag-list li')[0] ? job.querySelectorAll('.tag-list li')[0].innerText.trim() : 'N/A';
//         const education = job.querySelectorAll('.tag-list li')[1] ? job.querySelectorAll('.tag-list li')[1].innerText.trim() : 'N/A';
//         const jobTag = job.querySelectorAll('.tag-list li')[2] ? job.querySelectorAll('.tag-list li')[2].innerText.trim() : 'N/A';
//         const companyName = job.querySelector('.boss-name') ? job.querySelector('.boss-name').innerText.trim() : 'N/A';
//         const location = job.querySelector('.company-location') ? job.querySelector('.company-location').innerText.trim() : 'N/A';
//         const jobLink = job.querySelector('.job-name') ? job.querySelector('.job-name').href : 'N/A';
        
//         jobData.push({
//             职位名称: jobName,
//             工作经验: experience,
//             学历要求: education,
//             职位标签: jobTag,
//             公司名称: companyName,
//             工作地点: location,
//             详情链接: jobLink,
//             AI评分结果: '未评分',
//             抓取时间: new Date().toLocaleString(),
//         });
//     });

//     console.log('当前页面抓取的数据:', jobData);
//     return jobData;
// }

function scrapeRecommendPageData() {
    const jobData = [];
    console.log('开始抓取职位数据...');
    
    // 同时查找新旧两种样式的职位卡片
    const jobCards = document.querySelectorAll('.job-card-box, .job-card-wrapper');
    console.log(`找到 ${jobCards.length} 个职位卡片`);
    
    jobCards.forEach((job, index) => {
        console.log(`处理第 ${index + 1} 个职位卡片，类名: ${job.className}`);
        
        // 打印出每个职位卡片的HTML结构，以便调试
        console.log(`职位卡片HTML:`, job.outerHTML.substring(0, 200) + '...');
        
        // 提取DOM元素 - 查找整个子树而不仅仅是直接子元素
        const jobNameElement = job.querySelector('.job-name');
        const jobName = jobNameElement ? jobNameElement.innerText.trim() : 'N/A';
        
        // 获取详情链接 - 需要兼容不同的层级结构
        let jobLink = 'N/A';
        if (jobNameElement) {
            // 尝试直接从jobName元素获取
            if (jobNameElement.href) {
                jobLink = jobNameElement.href;
            } 
            // 尝试从父元素获取
            else if (jobNameElement.parentElement && jobNameElement.parentElement.href) {
                jobLink = jobNameElement.parentElement.href;
            }
            // 尝试从祖父元素获取
            else if (jobNameElement.parentElement && jobNameElement.parentElement.parentElement && 
                    jobNameElement.parentElement.parentElement.href) {
                jobLink = jobNameElement.parentElement.parentElement.href;
            }
            // 尝试查找附近的a标签
            else {
                const nearbyLink = job.querySelector('a[href*="job_detail"]');
                if (nearbyLink) {
                    jobLink = nearbyLink.href;
                }
            }
        } else {
            // 如果没有找到jobName元素，尝试找任何指向职位详情的链接
            const anyJobLink = job.querySelector('a[href*="job_detail"]');
            if (anyJobLink) {
                jobLink = anyJobLink.href;
            }
        }
        
        // 清理链接，去除.html后的参数
        if (jobLink && jobLink.includes('.html')) {
            jobLink = jobLink.split('.html')[0] + '.html';
            console.log(`清理后的链接: ${jobLink}`);
        }
        
        console.log(`职位名称: ${jobName}, 链接: ${jobLink}`);
        
        // 获取标签列表（两种样式都有.tag-list）
        const tagLists = job.querySelectorAll('.tag-list');
        console.log(`找到 ${tagLists.length} 个标签列表`);
        
        // 整合所有标签
        let allTags = [];
        tagLists.forEach(list => {
            const tags = list.querySelectorAll('li');
            tags.forEach(tag => allTags.push(tag.innerText.trim()));
        });
        
        console.log(`所有标签: ${allTags.join(', ')}`);
        
        // 通常第一个tag是工作经验，第二个是学历
        const experience = allTags.length > 0 ? allTags[0] : 'N/A';
        const education = allTags.length > 1 ? allTags[1] : 'N/A';
        // 其余的作为职位标签
        const jobTags = allTags.slice(2).join(', ') || 'N/A';
        
        // 处理公司名称（两种样式不同）
        let companyName = 'N/A';
        const companyNameElement = job.querySelector('.company-name') || job.querySelector('.boss-name');
        if (companyNameElement) {
            companyName = companyNameElement.innerText.trim();
            console.log(`找到公司名称: ${companyName}`);
        } else {
            console.log('未找到公司名称元素，尝试查找招聘者信息');
            // 尝试查找招聘者信息作为备选
            const recruiterElement = job.querySelector('.info-public');
            if (recruiterElement) {
                companyName = recruiterElement.innerText.trim();
                console.log(`找到招聘者信息: ${companyName}`);
            }
        }
        
        // 处理工作地点（两种样式不同）
        let location = 'N/A';
        const locationElement = 
            job.querySelector('.company-location') || 
            job.querySelector('.job-area') ||
            job.querySelector('.job-area-wrapper');
        
        if (locationElement) {
            location = locationElement.innerText.trim();
            console.log(`找到工作地点: ${location}`);
        }
        

        
        const jobInfo = {
            职位名称: jobName,
            工作经验: experience,
            学历要求: education,
            职位标签: jobTags,
            公司名称: companyName,
            工作地点: location,
            详情链接: jobLink,
            AI评分结果: '未评分',
            抓取时间: new Date().toLocaleString(),
        };
        
        console.log('抓取到的职位信息:', jobInfo);
        jobData.push(jobInfo);
    });

    console.log(`当前页面抓取的数据: ${jobData.length} 条记录`);
    return jobData;
}


// 不再需要的翻页函数，保留但注释掉，以便将来可能需要时恢复
/*
function startScraping(currentPage, totalPages, allJobData) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;

        // 更新标签页到目标页码的URL
        const nextPageUrl = updatePageUrl(tabUrl, currentPage);
        chrome.tabs.update(tabId, {url: nextPageUrl}, function() {
            // 等待标签页加载完成
            chrome.tabs.onUpdated.addListener(function listener(tabIdUpdated, changeInfo, tab) {
                if (tabIdUpdated === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);

                    // 在新页面上注入抓取脚本
                    chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        func: scrapeCurrentPageData,
                        args: [currentPage],
                    }, function(results) {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                            alert('数据抓取失败，请查看控制台获取详细信息');
                        } else {
                            const jobData = results[0].result;
                            allJobData.push(...jobData);
                            console.log(`成功抓取第 ${currentPage} 页数据:`, jobData);

                            if (currentPage < totalPages) {
                                // 继续抓取下一页
                                startScraping(currentPage + 1, totalPages, allJobData);
                            } else {
                                // 完成所有抓取
                                finishScraping(allJobData);
                            }
                        }
                    });
                }
            });
        });
    });
}

function updatePageUrl(currentUrl, pageNumber) {
    let url = new URL(currentUrl);
    url.searchParams.set('page', pageNumber);
    return url.toString();
}

function finishScraping(allJobData) {
    console.log('所有页面的工作数据收集完成:', allJobData);
    // 发送数据到后台脚本进行存储
    chrome.runtime.sendMessage({type: 'SAVE_JOB_DATA', data: allJobData});
    // 打开设置页面
    chrome.runtime.openOptionsPage();
}
*/

function scrapeCurrentPageData(currentPage) {
    return new Promise(async (resolve, reject) => {
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async function waitForPageLoad() {
            let retries = 0;
            const maxRetries = 10;
            while (retries < maxRetries) {
                // 同时查找新旧两种样式的职位卡片
                const jobs = document.querySelectorAll('.job-card-box, .job-card-wrapper');
                if (jobs.length > 0) {
                    console.log(`页面加载完成，找到 ${jobs.length} 个工作卡片`);
                    return;
                }
                console.log(`等待页面加载，尝试次数: ${retries + 1}`);
                await delay(1000); // 等待1秒
                retries++;
            }
            console.error('页面加载超时');
            reject('页面加载超时');
        }

        try {
            await waitForPageLoad();

            const jobData = [];
            // 同时查找新旧两种样式的职位卡片
            const jobs = document.querySelectorAll('.job-card-box, .job-card-wrapper');
            console.log(`开始处理 ${jobs.length} 个职位卡片...`);
            
            jobs.forEach((job, index) => {
                console.log(`处理第 ${index + 1}/${jobs.length} 个职位卡片，类名: ${job.className}`);
                
                const jobNameElement = job.querySelector('.job-name');
                if (jobNameElement) {
                    console.log(`找到职位名称元素: ${jobNameElement.innerText.trim()}`);
                } else {
                    console.log('未找到职位名称元素');
                }
                
                // 尝试多种方式获取薪资
                let salary = '薪资未找到';
                const salaryElement = job.querySelector('.salary') || job.querySelector('.job-salary');
                if (salaryElement) {
                    console.log(`找到薪资元素: ${salaryElement.outerHTML}`);
                    // 尝试获取文本内容
                    salary = salaryElement.innerText.trim();
                    console.log(`薪资文本: ${salary}`);
                    
                    // 如果获取到的是空值或异常值，尝试其他方法
                    if (!salary || salary === '-K' || salary === 'K') {
                        // 尝试获取data属性
                        salary = salaryElement.getAttribute('data-salary') || 
                                 salaryElement.getAttribute('data-value') || 
                                 salaryElement.getAttribute('data-original') || 
                                 '薪资未找到';
                        
                        // 尝试获取子元素的内容
                        if (salary === '薪资未找到' && salaryElement.children.length > 0) {
                            Array.from(salaryElement.children).forEach(child => {
                                const childText = child.innerText.trim();
                                if (childText) salary = childText;
                            });
                        }
                        
                        // 如果仍然没有找到有效信息，记录元素的完整HTML以便调试
                        if (salary === '薪资未找到' || salary === '-K' || salary === 'K') {
                            console.log('无法获取薪资，元素HTML:', salaryElement.outerHTML);
                            salary = '需要登录查看';
                        }
                    }
                } else {
                    console.log('未找到薪资元素');
                }
                
                // 获取标签列表
                const tagList = job.querySelectorAll('.tag-list li');
                console.log(`找到 ${tagList.length} 个标签元素`);
                const experience = tagList[0] ? tagList[0].innerText.trim() : 'N/A';
                const education = tagList[1] ? tagList[1].innerText.trim() : 'N/A';
                
                // 处理公司名称（两种样式不同）
                let companyName = 'N/A';
                if (job.querySelector('.boss-name')) {
                    companyName = job.querySelector('.boss-name').innerText.trim();
                    console.log(`从.boss-name找到公司名称: ${companyName}`);
                } else if (job.querySelector('.company-name')) {
                    companyName = job.querySelector('.company-name').innerText.trim();
                    console.log(`从.company-name找到公司名称: ${companyName}`);
                } else {
                    console.log('未找到公司名称元素');
                }
                
                // 处理工作地点（两种样式不同）
                let location = 'N/A';
                if (job.querySelector('.company-location')) {
                    location = job.querySelector('.company-location').innerText.trim();
                    console.log(`从.company-location找到工作地点: ${location}`);
                } else if (job.querySelector('.job-area')) {
                    location = job.querySelector('.job-area').innerText.trim();
                    console.log(`从.job-area找到工作地点: ${location}`);
                } else {
                    console.log('未找到工作地点元素');
                }
                
                // 获取职位福利信息
                const benefits = job.querySelector('.job-card-footer') ? 
                    job.querySelector('.job-card-footer').innerText.trim() : 'N/A';
                
                // 获取详情链接并清理
                let detailLink = jobNameElement ? jobNameElement.href : 'N/A';
                // 清理链接，去除.html后的参数
                if (detailLink && detailLink.includes('.html')) {
                    detailLink = detailLink.split('.html')[0] + '.html';
                    console.log(`清理后的链接: ${detailLink}`);
                }
                
                let jobInfo = {
                    职位名称: jobNameElement ? jobNameElement.innerText.trim() : 'N/A',
                    工作地点: location,
                    薪资: salary,
                    公司名称: companyName,
                    职位福利: benefits,
                    工作经验: experience,
                    学历要求: education,
                    详情链接: detailLink,
                    抓取时间: new Date().toLocaleString(),
                    AI评分结果: '未评分',
                    页码: currentPage
                };

                console.log(`职位卡片#${index + 1}处理完成:`, jobInfo);
                jobData.push(jobInfo);
            });

            console.log(`成功处理 ${jobData.length} 个职位数据`);
            resolve(jobData);
        } catch (error) {
            console.error('处理职位数据时出错:', error);
            reject(error);
        }
    });
}

document.getElementById('settings').addEventListener('click', () => {

        window.open(chrome.runtime.getURL('options.html'));

});

// 添加初始化代码，确保消息监听器被正确注册
console.log('popup.js 加载完成，注册消息监听器');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log('popup.js 收到消息:', message);
    if (message.action === 'dataFetched') {
        console.log('数据抓取成功:', message.data);
        alert(`爬取完成，新增 ${message.addedCount} 条数据，总共 ${message.data.length} 条数据`);
        // 在提示用户后打开选项页面
        setTimeout(function() {
            window.open(chrome.runtime.getURL('options.html'));
        }, 500);
    } else if (message.action === 'dataFetchFailed') {
        console.error('数据抓取失败:', message.error);
        alert('数据抓取失败，请查看控制台获取详细信息');
    }
});



// 获取职位描述的函数
function getJobDescription() {
    return new Promise((resolve, reject) => {
        function checkJobDescription() {
            console.log('正在检查职位描述是否加载完成...');
            
            // 检查页面是否存在 "您访问的页面不存在～"
            const pageNotFound = document.querySelector('h3.gray');
            if (pageNotFound) {
                console.log('职位页面已关闭或不存在');
                return { jobDescription: '职位已关闭', jobTitle: '职位已关闭' };
            }
            
            // 尝试多种选择器获取职位描述
            const jobDescriptionElement = document.querySelector('.job-sec-text') || 
                                        document.querySelector('.job-detail-section') || 
                                        document.querySelector('.text');
            
            const jobDescription = jobDescriptionElement ? jobDescriptionElement.textContent.trim() : '';
            
            // 尝试多种选择器获取职位名称
            const jobTitleElement = document.querySelector('.name h1') || 
                                  document.querySelector('.job-title') || 
                                  document.querySelector('.job-name');
            
            const jobTitle = jobTitleElement ? jobTitleElement.textContent.trim() : '';
            
            // 检查是否找到有效的职位描述和标题
            if (jobDescription && jobDescription.length > 10 && jobTitle && jobTitle.length > 0) {
                console.log('职位描述加载完成，长度:', jobDescription.length);
                return { jobDescription, jobTitle };
            }
            
            return null; // 表示内容尚未加载完成
        }
        
        // 开始尝试获取内容，最多等待10秒
        let attempts = 0;
        const maxAttempts = 20; // 20次尝试，每次间隔500ms，总共最多等待10秒
        
        function tryGetContent() {
            const result = checkJobDescription();
            if (result) {
                // 已找到内容，返回结果
                resolve(result);
            } else if (attempts < maxAttempts) {
                // 继续等待并再次尝试
                attempts++;
                console.log(`等待职位描述加载，尝试次数: ${attempts}/${maxAttempts}`);
                setTimeout(tryGetContent, 500);
            } else {
                // 达到最大尝试次数，返回未找到
                console.warn('职位描述加载超时');
                resolve({ 
                    jobDescription: '未找到职位描述 (可能需要登录或页面加载问题)', 
                    jobTitle: document.title || '未找到职位名称' 
                });
            }
        }
        
        // 开始第一次尝试
        tryGetContent();
    });
}

// 添加打招呼语的事件监听器
document.getElementById('generateGreeting').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentUrl = tabs[0].url;

        // 检查URL格式
        if (!currentUrl.includes('zhipin.com/job_detail')) {
            alert('错误: 不在岗位详情页面');
            return;
        }

        // 显示加载提示
        document.getElementById('greetingResult').textContent = '正在获取职位描述，请稍候...';

        // 在当前标签页执行脚本以获取职位描述
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: getJobDescription
        }, async function(results) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                alert('获取职位描述失败');
                return;
            }
        
            if (!results || results.length === 0) {
                alert('错误: 未能获取职位信息');
                return;
            }
            
            // 结果可能是Promise或直接的值
            let jobDescResult = results[0].result;
            
            // 如果返回的是Promise，需要等待其解析
            if (jobDescResult instanceof Promise) {
                try {
                    jobDescResult = await jobDescResult;
                } catch (error) {
                    console.error('获取职位描述时出错:', error);
                    alert('获取职位描述失败');
                    return;
                }
            }
            
            const { jobDescription, jobTitle } = jobDescResult;
            console.log('获取到的职位描述:', jobDescription);
            console.log('获取到的职位名称:', jobTitle);
            
            if (jobDescription === '职位已关闭') {
                alert('错误: 职位已关闭');
                return;
            }
            
            if (jobDescription === '未找到职位描述 (可能需要登录或页面加载问题)') {
                alert('错误: ' + jobDescription);
                return;
            }

            // 获取简历内容
            chrome.storage.local.get(['resume'], function(data) {
                const resume = data.resume || '';
                if (!resume) {
                    alert('错误: 请输入简历内容');
                    return;
                }

                // 显示更新加载提示
                document.getElementById('greetingResult').textContent = '正在生成打招呼语，请稍候...';

                // 调用生成打招呼语的函数
                generateGreetingMessage(jobDescription, jobTitle, resume);
            });
        });
    });
});

// 生成打招呼语的函数（占位函数，需要后续实现）
function generateGreetingMessage(jobDescription,jobTitle, resume) {
    // 这里是生成打招呼语的逻辑
    console.log('职位描述:', jobDescription);
    console.log('简历内容:', resume);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentUrl = tabs[0].url;
        
        // 显示加载提示
        document.getElementById('greetingResult').textContent = '正在生成打招呼语，请稍候...';

        requestAIGreetingMessage(jobTitle, jobDescription, resume)
            .then(greeting => {
                // 显示生成的打招呼语
                document.getElementById('greetingResult').textContent = greeting;
                
                // 复制到剪贴板
                navigator.clipboard.writeText(greeting).then(() => {
                    console.log('打招呼语已复制到剪贴板');
                }).catch(err => {
                    console.error('复制到剪贴板失败:', err);
                });
            })
            .catch(error => {
                console.error('生成打招呼语失败:', error);
                document.getElementById('greetingResult').textContent = '生成打招呼语失败，请重试';
            });
    });
}


// 打招呼助手
function requestAIGreetingMessage(jobTitle, jobDescription, resumeContent) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['runMode', 'apiKey', 'model'], function(data) {
            const isOnline = data.runMode;
            const apiKey = data.apiKey;
            const modelname = data.model || 'glm-4-flash';

            const GreetingMessageprompt = `
# 角色
# Role: 招聘助手

## Profile

- Language: 中文
- Description: 招聘助手是一个专门设计用于帮助求职者根据特定岗位描述和个人简历，生成吸引招聘方的打招呼语的角色。

## Knowledges

- 招聘流程和求职技巧
- 常见岗位描述的理解
- 个人简历的亮点分析

## Skills

- 文本生成能力
- 对岗位描述和个人简历的分析能力
- 创造吸引人的打招呼语的能力

## Rules

- 必须基于提供的岗位描述和个人简历信息生成文本
- 文本需要符合正式且礼貌的商务沟通风格
- 文本应突出求职者的个人优势与岗位匹配度
- 描述最符合岗位需求的3个点
- 口语化

## Constraints

- 生成的文本长度精炼而突出重点
- 文本内容需积极正面，体现求职者的热情和诚意
- 格式类似—您好，注意到贵公司正在招聘{岗位名称}，我对这个职位非常感兴趣，我{个人优势，只有三句话}，如果觉得合适，我们可以进一步沟通，其期待您的回复!

## Workflow

1. 用户提供岗位描述和个人简历信息
2. AI分析岗位描述，提取关键要求
3. AI分析个人简历，找出与岗位匹配的优势
4. AI根据以上信息生成打招呼语
5. 输出最终文本

## Initialization

作为招聘助手，我的任务是帮助求职者制作专业的自我介绍。请提供您想要申请的岗位描述和个人简历，我将为您生成一句吸引人的打招呼语。

`;

            if (isOnline) {
                // 在线模式
                const url = 'https://resume-matching-api.aitoolhub.top/greeting';
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
                // 本地模式
                const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                const data = {
                    model: modelname,
                    messages: [
                        {
                            role: "system",
                            content: GreetingMessageprompt
                        },
                        {
                            role: "user",
                            content: `这是JD内容--职位名称: ${jobTitle}, 岗位描述: ${jobDescription},这是个人简历内容--${resumeContent}`
                        }
                    ]
                };

                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
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
                            resolve(result.choices[0].message.content);
                        } else {
                            console.warn('未找到 result.choices[0].message，直接返回文本内容');
                            resolve(text);
                        }
                    } catch (error) {
                        console.warn('解析 JSON 时出错，假设响应为纯文本:', error);
                        resolve(text);
                    }
                })
                .catch(error => reject(error));
            }
        });
    });
}

document.getElementById('copyGreeting').addEventListener('click', function() {
    const greetingText = document.getElementById('greetingResult').textContent;
    navigator.clipboard.writeText(greetingText).then(() => {
        alert('打招呼语已复制到剪贴板');
    }).catch(err => {
        console.error('复制到剪贴板失败:', err);
        alert('复制失败，请手动复制');
    });
});