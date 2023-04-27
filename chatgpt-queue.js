// ==UserScript==
// @name         ChatGPT Queue
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically submit questions in a queue to ChatGPT
// @author       xihajun
// @match        https://chat.openai.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const questionList = [];
  let isAutoSubmitting = false;
  let isWaitingForResponse = false;

  function createUI() {
    const controlPanel = document.createElement('div');
    controlPanel.innerHTML = `
      <div id="controlPanel" style="position: fixed; top: 20px; right: 20px; z-index: 9999; background-color: rgba(255, 255, 255, 0.8); padding: 10px; border-radius: 5px;">
        <h3>Control Panel</h3>
        <button id="startAutoSubmit" style="background-color: #4CAF50; border: none; color: white; padding: 5px 10px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 5px;">Start Auto Submit</button>
        <div id="questionWindow" style="width: 200px; height: 100px; background-color: rgba(255, 255, 255, 0.5); border: 1px solid #000; margin-top: 10px; padding: 5px; overflow-y: auto;">
          <h4>Questions</h4>
          <ul id="questionList" style="list-style-type: none; margin: 0; padding: 0;"></ul>
        </div>
      </div>
    `;
    document.body.appendChild(controlPanel);

    document.getElementById('startAutoSubmit').addEventListener('click', toggleAutoSubmit);
  }

  function toggleAutoSubmit() {
    isAutoSubmitting = !isAutoSubmitting;
    document.getElementById('startAutoSubmit').innerHTML = isAutoSubmitting ? 'Stop Auto Submit' : 'Start Auto Submit';

    if (isAutoSubmitting) {
      autoSubmitNextQuestion();
    }
  }

  function autoSubmitNextQuestion() {
    if (isAutoSubmitting && !isWaitingForResponse) {
      if (questionList.length > 0) {
        const question = questionList.shift();
        updateQuestionListUI();
        submitQuestion(question);
      } else {
        toggleAutoSubmit();
      }
    }
  }


  function submitQuestion(question) {
    const textarea = document.querySelector('textarea[placeholder="Send a message."]');
    const submitButton = document.querySelector('button[class*="absolute"]');

    if (textarea && submitButton) {
      textarea.value = question;
      submitButton.disabled = false;
      submitButton.click();
      waitForResponse();
    }
  }

  function waitForResponse() {
    isWaitingForResponse = true;

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const regenerateResponse = document.evaluate(
            '//button[contains(., "Regenerate response")]',
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;

          if (regenerateResponse) {
            observer.disconnect();
            isWaitingForResponse = false;
            autoSubmitNextQuestion();
            break;
          }
        }
      }
    });

    const config = { childList: true, subtree: true };
    observer.observe(document.body, config);
  }

  function addQuestionToQueue(question) {
    questionList.push(question);
    updateQuestionListUI();
  }

  function updateQuestionListUI() {
    const questionListUI = document.getElementById('questionList');
    questionListUI.innerHTML = questionList.map((q, i) => `<li>${i + 1}. ${q}</li>`).join('');
  }

  function handleKeyPress(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      const textarea = document.querySelector('textarea[placeholder="Send a message."]');
      const question = textarea.value;
      if (question.trim()) {
        addQuestionToQueue(question);
        textarea.value = '';
      }
    }
  }

  createUI();
  document.addEventListener('keydown', handleKeyPress);
})();
