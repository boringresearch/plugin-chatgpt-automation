// ==UserScript==
// @name         ChatGPT Queue
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Automatically submit questions in a queue to ChatGPT (2.0) 2023/11
// @author       xihajun
// @match        https://chat.openai.com/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    const questionList = [];
    let isAutoSubmitting = false;
    let isWaitingForResponse = false;

    function createUI() {
        const controlPanel = document.createElement('div');

        controlPanel.innerHTML = `
      <div id="controlPanel" style="position: fixed; top: 20px; right: 20px; z-index: 9999; background-color: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 10px; color: #333; cursor: move; resize: both; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <button id="toggleHideBar" style="background-color: #FFC107; border: none; color: white; padding: 5px 10px; text-align: center; text-decoration: none; display: inline-block; font-size: 14px; margin: 4px 2px; cursor: pointer; border-radius: 5px; transition: background-color 0.3s;">Hide</button>
        <div id="panelContent">
          <button id="startAutoSubmit" style="background-color: #4CAF50; border: none; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 5px; transition: background-color 0.3s;">Start Auto Submit</button>
          <div id="questionWindow" style="width: 100%; height: 100px; background-color: rgba(255, 255, 255, 0.95); border: 1px solid #ddd; margin-top: 20px; padding: 10px; overflow-y: auto;">
            <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 18px; font-weight: bold;">Questions</h4>
            <ul id="questionList" style="list-style-type: none; margin: 0; padding: 0;"></ul>
          </div>
        </div>
      </div>
    `;
        document.body.appendChild(controlPanel);
        document.getElementById('toggleHideBar').addEventListener('click', toggleHide);

        document.getElementById('startAutoSubmit').addEventListener('click', toggleAutoSubmit);

        // Make the Control Panel draggable
        const dragItem = document.getElementById('controlPanel');
        let active = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        dragItem.addEventListener('mousedown', dragStart, false);
        document.addEventListener('mouseup', dragEnd, false);
        document.addEventListener('mousemove', drag, false);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === dragItem) {
                active = true;
            }
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;

            active = false;
        }

        function drag(e) {
            if (active) {
                e.preventDefault();

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, dragItem);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }
    }


    function toggleAutoSubmit() {
        isAutoSubmitting = !isAutoSubmitting;
        document.getElementById('startAutoSubmit').innerHTML = isAutoSubmitting ? 'Stop Auto Submit' : 'Start Auto Submit';

        if (isAutoSubmitting) {
            autoSubmitNextQuestion();
        }
    }

    function toggleHide() {
        const panelContent = document.getElementById('panelContent');
        const hideBar = document.getElementById('toggleHideBar');
        const controlPanelTitle = document.getElementById('controlPanelTitle');
        if (panelContent.style.display === 'none') {
            panelContent.style.display = 'block';
            hideBar.innerHTML = 'Hide';
            controlPanelTitle.style.display = 'block';
        } else {
            panelContent.style.display = 'none';
            hideBar.innerHTML = 'Show';
            controlPanelTitle.style.display = 'none';
        }
    }

    function submitQuestion(question) {
        let textarea = document.getElementById('prompt-textarea');
        if (textarea) {
            textarea.value = question;

            // Dispatch an 'input' event to simulate typing in the textarea
            let event = new Event('input', { bubbles: true });
            textarea.dispatchEvent(event);

            // Use a short delay to allow any JavaScript that reacts to the input event to run
            setTimeout(() => {
                // Attempt to find the submit button using the 'data-testid' attribute
                let submitButton = document.querySelector('button[data-testid="send-button"]');

                // If the submit button is found, click it
                if (submitButton) {
                    submitButton.click();
                    waitForResponse();
                } else {
                    console.error('Submit button not found. Please check the button selector.');
                }
            }, 10000); // Adjust the delay as needed
        } else {
            console.error('Textarea not found.');
        }
    }

    function autoSubmitNextQuestion() {
        if (questionList.length > 0) {
            const question = questionList.shift();
            updateQuestionListUI();
            submitQuestion(question);
        } else {
            console.log('Question list is empty.');
        }
    }

    function waitForResponse() {
        isWaitingForResponse = true;

        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check for the absence of the "Stop generating" button
                    const stopGeneratingButton = document.querySelector('button[aria-label="Stop generating"]');

                    if (!stopGeneratingButton) {
                        observer.disconnect();
                        isWaitingForResponse = false;
                        setTimeout(() => {
                            autoSubmitNextQuestion(); // Add a slight delay before submitting the next question
                        }, 1000); // Adjust the delay as needed
                        break;
                    }
                }
            }
        });

        const config = {
            childList: true,
            subtree: true
        };
        observer.observe(document.body, config);
    }

    function addQuestionToQueue(question) {
        questionList.push(question);
        updateQuestionListUI();
    }


    function updateQuestionListUI() {
        const maxWordsToShow = 5;
        const questionListUI = document.getElementById('questionList');
        questionListUI.innerHTML = questionList.map((q, i) => {
            const words = q.split(' ');
            const shortQuestion = words.slice(0, maxWordsToShow).join(' ') + (words.length > maxWordsToShow ? '...' : '');
            return `<li>${i + 1}. ${shortQuestion} <button data-index="${i}" class="deleteQuestion" style="background-color: #f44336; border: none; color: white; padding: 2px 4px; text-align: center; text-decoration: none; display: inline-block; font-size: 12px; line-height: 12px; margin: 0 2px; cursor: pointer; border-radius: 3px; transition: background-color 0.3s;">🗑️</button></li>`;
        }).join('');

        const deleteButtons = document.querySelectorAll('.deleteQuestion');
        deleteButtons.forEach((btn) => {
            btn.addEventListener('click', deleteQuestion);
        });
    }

    function deleteQuestion(event) {
        const indexToDelete = parseInt(event.target.getAttribute('data-index'), 10);
        questionList.splice(indexToDelete, 1);
        updateQuestionListUI();
    }

    function handleKeyPress(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            const textarea = document.getElementById('prompt-textarea'); // Corrected this line
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
