chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('background.js 收到消息:', request.type);
    if (request.type === 'SAVE_JOB_DATA') {
        console.log('处理 SAVE_JOB_DATA 消息');
        chrome.storage.local.get(['jobData'], function(result) {
            let existingData = result.jobData || [];
            console.log('加载现有数据成功，数据数量:', existingData.length);
            
            let newData = request.data;
            console.log('收到新数据，数量:', newData.length);

            if (newData.length === 0) {
                console.log('没有新数据需要添加。');
                sendResponse({success: false, message: '没有新数据需要添加'});
                return; // 如果没有新数据，则直接返回
            }

            // 使用 Map 来存储现有数据，键为详情链接
            let dataMap = new Map(existingData.map(item => [item.详情链接, item]));
            console.log('现有数据已映射到 Map 中');

            let addedCount = 0;

            // 遍历新数据，检查是否已存在
            newData.forEach(job => {
                if (!dataMap.has(job.详情链接)) {
                    dataMap.set(job.详情链接, job);
                    addedCount++;
                    console.log(`添加新数据：${job.职位名称}, 链接: ${job.详情链接}`);
                } else {
                    console.log(`重复数据未添加：${job.职位名称}, 链接: ${job.详情链接}`);
                }
            });

            // 将 Map 转换回数组
            let updatedData = Array.from(dataMap.values());
            console.log('合并后的数据数量:', updatedData.length, '新增数据数量:', addedCount);

            chrome.storage.local.set({ jobData: updatedData }, function() {
                if (chrome.runtime.lastError) {
                    console.error('保存数据时出错:', chrome.runtime.lastError);
                    chrome.runtime.sendMessage({
                        action: 'dataFetchFailed',
                        error: chrome.runtime.lastError.message
                    });
                    console.log('发送失败响应到popup');
                    sendResponse({success: false, error: chrome.runtime.lastError.message});
                } else {
                    console.log('数据已成功保存');
                    const response = {
                        action: 'dataFetched',
                        data: updatedData,
                        addedCount: addedCount
                    };
                    console.log('发送成功消息到popup:', response);
                    chrome.runtime.sendMessage(response);
                    console.log('发送成功响应到发送方');
                    sendResponse({success: true, addedCount: addedCount, total: updatedData.length});
                }
            });
        });
        return true; // 表示异步响应
    }
});

 

//获取JD详情
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchJobDetails") {
        fetchJobDetailsAsync(request.url, sender.tab.id);
        sendResponse({ status: "started" }); // 立即回复，表示任务已开始
        return false; // 不需要保持消息通道开放
    }
});

function scrapeJobDetails() {
    return new Promise((resolve, reject) => {
        // 检查页面是否存在 "您访问的页面不存在～"
        const pageNotFound = document.querySelector('h3.gray');
        if (pageNotFound) {
            console.log('职位页面已关闭或不存在');
            // 如果页面不存在，直接返回"职位已关闭"的数据
            resolve({ 
                jobDescription: '职位已关闭', 
                投递进度: '职位已关闭', 
                activeTime: '职位已关闭', 
                薪资: '职位已关闭',
                jobTags: '职位已关闭'
            });
            return;
        }
        
        // 添加等待职位描述加载的函数
        function checkJobContent() {
            console.log('检查职位详情内容...');
            
            const jobDescription = document.querySelector('.job-sec-text')?.textContent.trim() 
                || document.querySelector('.job-detail-section')?.textContent.trim() 
                || '';
            
            // 检查职位状态和沟通按钮
            const jobStatus = document.querySelector('.job-status span')?.textContent.trim();
            const communicationButton = document.querySelector('.btn-startchat');
            
            // 获取活跃时间
            const activeTime = document.querySelector('.boss-online-icon')?.textContent.trim() 
                || document.querySelector('.boss-online-tag')?.textContent.trim() 
                || document.querySelector('.boss-active-time')?.textContent.trim() 
                || '';
                
            // 获取薪资
            const salaryElement = document.querySelector('.job-salary') || document.querySelector('.salary');
            
            // 获取福利
            const jobTagsElement = document.querySelector('.job-tags');
            let jobTags = '';
            if (jobTagsElement) {
                const spans = jobTagsElement.querySelectorAll('span');
                jobTags = Array.from(spans).map(span => span.textContent.trim()).filter(Boolean).join(', ');
            }
            
            // 如果关键元素都加载了，且职位描述长度合理，则认为页面已加载完成
            if ((jobDescription && jobDescription.length > 10) || 
                (jobStatus || communicationButton) || 
                (activeTime || salaryElement) || jobTags) {
                return true;
            }
            return false;
        }
        
        // 开始尝试获取内容，最多等待15秒
        let attempts = 0;
        const maxAttempts = 30; // 30次尝试，每次间隔500ms，总共最多等待15秒
        
        function tryGetContent() {
            if (checkJobContent()) {
                // 页面已加载完成，执行数据抓取
                try {
                    const jobDescription = document.querySelector('.job-sec-text')?.textContent.trim() 
                        || document.querySelector('.job-detail-section')?.textContent.trim() 
                        || '未找到职位描述';
                    
                    // 检查职位状态和沟通按钮，设置投递进度
                    const jobStatus = document.querySelector('.job-status span')?.textContent.trim();
                    let hasCommunicated = '未知';
                    let 投递进度 = '未知';
                    
                    // 如果职位已关闭，设置投递进度为 '职位已关闭'
                    if (jobStatus && jobStatus === '职位已关闭') {
                        投递进度 = '职位已关闭';
                    } else {
                        // 如果职位未关闭，继续检查沟通按钮状态
                        const communicationButton = document.querySelector('.btn-startchat');
                        if (communicationButton) {
                            hasCommunicated = communicationButton.textContent.trim() === '继续沟通' ? '是' : '否';
                        }

                        // 设置投递进度字段
                        if (hasCommunicated === '否') {
                            投递进度 = '未沟通';
                        } else if (hasCommunicated === '是') {
                            投递进度 = '沟通未回复';
                        }
                    }

                    // 优先获取在线活跃类型
                    const activeTime = document.querySelector('.boss-online-icon')?.textContent.trim() 
                        || document.querySelector('.boss-online-tag')?.textContent.trim() 
                        || document.querySelector('.boss-active-time')?.textContent.trim() 
                        || '活跃时间未找到';

                    console.log('活跃时间:', activeTime);

                    // 获取薪资数据
                    const salaryElement = document.querySelector('.job-salary') || document.querySelector('.salary');
                    let salary = '薪资未找到';

                    if (salaryElement) {
                        // 尝试获取文本内容
                        salary = salaryElement.textContent.trim();
                        
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
                                    const childText = child.textContent.trim();
                                    if (childText) salary = childText;
                                });
                            }
                            
                            if (salary === '薪资未找到' || salary === '-K' || salary === 'K') {
                                console.log('无法获取薪资，元素HTML:', salaryElement.outerHTML);
                                salary = '需要登录查看';
                            }
                        }
                    }

                    // 获取福利
                    const jobTagsElement = document.querySelector('.job-tags');
                    let jobTags = '';
                    if (jobTagsElement) {
                        const spans = jobTagsElement.querySelectorAll('span');
                        jobTags = Array.from(spans).map(span => span.textContent.trim()).filter(Boolean).join(', ');
                    } else {
                        jobTags = '未找到福利信息';
                    }

                    console.log('成功抓取职位详情，职位描述长度:', jobDescription.length);
                    resolve({ 
                        jobDescription, 
                        投递进度,
                        activeTime, 
                        薪资: salary,
                        职位福利:jobTags
                    });
                } catch (error) {
                    console.error('抓取职位详情时出错:', error);
                    resolve({ error: error.message });
                }
            } else if (attempts < maxAttempts) {
                // 继续等待并再次尝试
                attempts++;
                console.log(`等待职位详情加载，尝试次数: ${attempts}/${maxAttempts}`);
                setTimeout(tryGetContent, 500);
            } else {
                // 达到最大尝试次数，返回未找到
                console.warn('职位详情加载超时');
                resolve({ 
                    jobDescription: '加载超时，未找到职位描述', 
                    投递进度: '未知',
                    activeTime: '未知', 
                    薪资: '未知',
                    职位福利: '未知'
                });
            }
        }
        
        // 开始第一次尝试
        tryGetContent();
    });
}

async function fetchJobDetailsAsync(url) {
    let attempts = 0;
    const maxAttempts = 3; // 设置最大重试次数为3次
    while (attempts < maxAttempts) {
        try {
            const tab = await chrome.tabs.create({ url: url, active: false });
            await new Promise(resolve => setTimeout(resolve, 2000 + attempts * 1000)); // 增加初始等待时间
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: scrapeJobDetails,
            });
            
            if (results && results[0] && results[0].result) {
                const detailsResult = results[0].result;
                
                // 如果是Promise结果，需要等待其解析
                if (detailsResult instanceof Promise) {
                    try {
                        const finalResult = await detailsResult;
                        await chrome.tabs.remove(tab.id);
                        
                        chrome.runtime.sendMessage({
                            action: "jobDetailsFetched",
                            success: true,
                            data: finalResult,
                            url: url
                        });
                        return;
                    } catch (error) {
                        throw new Error('获取职位详情时出错: ' + error.message);
                    }
                } else {
                    // 普通结果，直接使用
                    await chrome.tabs.remove(tab.id);
                    
                    chrome.runtime.sendMessage({
                        action: "jobDetailsFetched",
                        success: true,
                        data: detailsResult,
                        url: url
                    });
                    return;
                }
            } else {
                throw new Error('未能获取职位详情');
            }
        } catch (error) {
            attempts++;
            console.error(`尝试 ${attempts} 失败:`, error);
            if (attempts === maxAttempts) {
                // 达到最大重试次数后，发送失败消息
                chrome.runtime.sendMessage({
                    action: "jobDetailsFetched",
                    success: false,
                    error: error.message,
                    url: url
                });
            }
        }
    }
}

//抓取沟通对话框信息

// background.js

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'processUrl') {
        const url = request.url;
        processUrl(url, sendResponse);
        // 返回true，表示将异步发送响应
        return true;
    }
});

function processUrl(url, sendResponse) {
    // 创建一个新的标签页
    chrome.tabs.create({ url: url, active: false }, function(tab) {
        // 监听标签页的更新事件
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                // 移除监听器，避免重复触发
                chrome.tabs.onUpdated.removeListener(listener);

                // 在职位详情页执行脚本，检查并点击沟通按钮
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: checkAndClickCommunicationButton,
                }, function(results) {
                    if (chrome.runtime.lastError || !results || !results[0]) {
                        console.error('执行脚本出错:', chrome.runtime.lastError);
                        sendResponse({ status: 'error' });
                        chrome.tabs.remove(tab.id);
                        return;
                    }

                    const hasClicked = results[0].result;
                    if (hasClicked) {
                        // 如果点击了沟通按钮，等待新页面加载完成
                        waitForChatPage(tab.id, sendResponse);
                    } else {
                        console.log('未找到沟通按钮或无需点击');
                        sendResponse({ status: 'no_communication_needed' });
                        chrome.tabs.remove(tab.id);
                    }
                });
            }
        });
    });
}

// 在职位详情页执行的函数，检查并点击沟通按钮
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'processConversationUrl') {
        const url = request.url;
        processConversationUrl(url, sendResponse);
        return true; // 表示异步操作
    }
});

function processConversationUrl(url, sendResponse) {
    // 创建一个新的标签页打开职位详情页面
    chrome.tabs.create({ url: url, active: false }, function(tab) {
        // 监听标签页更新事件
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                // 移除监听器
                chrome.tabs.onUpdated.removeListener(listener);

                // 执行脚本检查并点击沟通按钮
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: checkAndClickCommunicationButton,
                }, function(results) {
                    if (chrome.runtime.lastError || !results || !results[0]) {
                        console.error('执行脚本出错:', chrome.runtime.lastError);
                        sendResponse({ status: 'error' });
                        chrome.tabs.remove(tab.id);
                        return;
                    }

                    const hasClicked = results[0].result;
                    if (hasClicked) {
                        // 如果点击了沟通按钮，等待新页面加载并爬取数据
                        waitForChatPage(tab.id, sendResponse);
                    } else {
                        console.log('无需点击沟通按钮');
                        sendResponse({ status: 'no_communication_needed' });
                        chrome.tabs.remove(tab.id);
                    }
                });
            }
        });
    });
}



// 更新求职进度
function checkAndClickCommunicationButton() {
    // 尝试找到沟通按钮的各种可能选择器
    const communicationButton = document.querySelector('.btn-startchat') || 
                              document.querySelector('[class*="btn-startchat"]') || 
                              document.querySelector('[data-v-*="startchat"]') ||
                              document.querySelector('button:contains("沟通")');
    
    // 默认值，未获取到按钮时显示"未知"
    let hasCommunicated = '未知';
    
    if (communicationButton) {
      // 获取按钮文本并判断是否需要继续沟通
      hasCommunicated = communicationButton.textContent.trim().includes('继续沟通') ? '是' : '否';
      
      if (hasCommunicated === '是') {
        try {
          communicationButton.click();  // 点击继续沟通按钮
          console.log('成功点击继续沟通按钮');
          return true; // 返回 true 表示已经点击
        } catch (error) {
          console.error('点击按钮时出错:', error);
          return false;  // 如果点击出错，则返回 false
        }
      } else {
        console.log('无需点击，状态为:', hasCommunicated);
      }
    } else {
      console.warn('未找到继续沟通按钮');
    }
    
    return false; // 返回 false 表示不需要点击
}

// 等待聊天页面加载完成并抓取对话内容

function waitForChatPage(tabId, sendResponse) {
    // 等待新页面加载完成，获取对话内容
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (changeInfo.status === 'complete') {
        // 移除监听器，避免重复触发
        chrome.tabs.onUpdated.removeListener(listener);

        // 页面加载完成后延时1秒，等待页面完全渲染
        setTimeout(() => {
          // 在新页面执行爬取对话内容的脚本
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: scrapeConversationData
          }, function(results) {
            if (chrome.runtime.lastError || !results || !results[0]) {
              console.error('获取对话数据出错:', chrome.runtime.lastError);
              sendResponse({ status: 'error', message: chrome.runtime.lastError?.message });
            } else {
              console.log('成功获取对话内容:', results);
              sendResponse({ status: 'success', conversation: results });
            }
            chrome.tabs.remove(tabId); // 爬取完毕后关闭标签页
          });
        }, 1000); // 延时1秒，确保页面已完全渲染
      }
    });
}


// 抓取对话内容
function scrapeConversationData() {
    try {
      // 获取所有消息 li 元素
      const messages = document.querySelectorAll('.im-list li');  // 使用 'li' 来选择每条消息
  
      // 如果没有找到消息元素，直接返回空数组
      if (!messages.length) {
        console.warn('未找到任何消息元素');
        return [];
      }
  
      // 存储所有抓取的对话
      const conversation = [];
  
      // 遍历每条消息
      messages.forEach((message) => {
        // 获取发送者（朋友还是自己）判断条件
        const isFriend = message.classList.contains('item-friend');
        const isMine = message.classList.contains('item-myself');
        const isSystem = message.classList.contains('item-system'); // 判断是否为系统消息
  
        // 获取消息内容，确保文本节点存在
        const textElement = message.querySelector('.text span');
        const textContent = textElement ? textElement.textContent.trim() : null;
  
        // 如果有消息内容，进行处理
        if (textContent) {
          let sender = '用户'; // 默认是'用户'
  
          // 判断消息的发送者
          if (isFriend) {
            sender = '招聘方';
          } else if (isMine) {
            sender = '用户';
          } else if (isSystem) {
            sender = '系统消息'; // 系统消息的标签
          } else {
            console.warn('无法确定消息发送者:', message);
          }
  
          // 将格式化后的字符串添加到 conversation 中
          conversation.push(`${sender} : ${textContent}`);
        } else {
          console.warn('未找到消息内容或消息内容为空:', message);
        }
      });
  
      // 打印并返回抓取到的对话
      console.log('抓取到的对话:', conversation);
      return conversation;
  
    } catch (error) {
      console.error('解析对话内容时出错:', error);
      return { error: error.message };  // 返回错误信息，保持返回格式一致
    }
  }
  
