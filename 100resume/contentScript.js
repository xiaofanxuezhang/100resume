(function() {
    console.log('内容脚本已注入，开始处理岗位详情页');

    // 检查是否存在沟通按钮
    const communicationButton = document.querySelector('.btn-startchat');
    if (communicationButton) {
        const buttonText = communicationButton.textContent.trim();
        const hasCommunicated = buttonText === '继续沟通' ? '是' : '否';

        if (hasCommunicated === '否') {
            console.log('尚未沟通过，点击沟通按钮...');
            communicationButton.click();

            // 等待输入框加载
            setTimeout(() => {
                const messageBox = document.querySelector('.edit-area textarea');
                if (messageBox) {
                    console.log('找到输入框，准备输入打招呼信息...');

                    // 从 chrome.storage.local 获取 greetingMessage
                    chrome.storage.local.get('greetingMessage', function(data) {
                        const greetingMessage = data.greetingMessage || '我对该岗位非常感兴趣，请问能否进一步沟通？';
                        messageBox.value = greetingMessage;

                        // 触发输入事件，确保发送按钮可用
                        const inputEvent = new Event('input', { bubbles: true });
                        messageBox.dispatchEvent(inputEvent);

                        // 模拟点击发送按钮
                        const sendButton = document.querySelector('.send-message');
                        if (sendButton && !sendButton.classList.contains('disable')) {
                            console.log('点击发送按钮...');
                            sendButton.click();

                            console.log('已成功发送打招呼信息');

                            // 更新 hasCommunicated 状态
                            updateHasCommunicatedStatus();
                        } else {
                            console.log('发送按钮未启用或不存在，无法发送打招呼信息');
                        }
                    });

                } else {
                    console.log('未找到输入框，无法输入打招呼信息');
                }
            }, 1000); // 等待1秒，确保输入框加载完成
        } else {
            console.log('已沟通过，跳过该岗位');

            // 更新 hasCommunicated 状态
            updateHasCommunicatedStatus();
        }
    } else {
        console.log('未找到沟通按钮，可能已经沟通或不适用该操作');
    }

    function updateHasCommunicatedStatus() {
        const currentUrl = window.location.href;

        // 发送消息给选项页面，通知更新 hasCommunicated 状态
        chrome.runtime.sendMessage({
            action: 'updateHasCommunicated',
            url: currentUrl
        }, function(response) {
            console.log('已通知选项页面更新 hasCommunicated 状态');
        });
    }

    // 关闭当前标签页
    setTimeout(() => {
        window.close();
    }, 2000); // 等待2秒，确保操作完成后再关闭
})();

