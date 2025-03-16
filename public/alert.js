const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = "/css/alert.css";
document.head.appendChild(link);


function betterAlert(type, message, context) {//1 for just alert,  2 for alert with confirmation, 3 for alert with redirect to the login page
    return new Promise((resolve, reject) => {
        switch(type) {
            case 1:
                {
                    const messageModal = document.createElement('div');
                    messageModal.id = 'message-modal';
                    messageModal.classList.add('message');
                    document.body.appendChild(messageModal);

                    const modalBox = document.createElement('div');
                    modalBox.id = 'modal-message';
                    modalBox.classList.add('message');
                    document.body.appendChild(modalBox);
                    modalBox.style.opacity = 0;
                    setTimeout(() => { modalBox.style.transition = 'opacity 0.5s'; modalBox.style.opacity = 1; }, 10);

                    const modalContext = document.createElement('p');
                    modalContext.classList.add('message');
                    modalContext.id = "context";
                    modalContext.innerHTML = context;
                    modalBox.appendChild(modalContext);

                    const modalMessage = document.createElement('p');
                    modalMessage.classList.add('message');
                    modalMessage.id = "message";
                    modalMessage.innerHTML = message;
                    modalMessage.style.cssText = "";
                    modalBox.appendChild(modalMessage);
                    
                    const closeModal = document.createElement('button');
                    closeModal.id = 'close-modal';
                    closeModal.classList.add('message', 'button');
                    closeModal.textContent = 'Kapat';
                    closeModal.style.cssText = "margin-bottom: 5%";
                    closeModal.onclick = closeMessage;
                    modalBox.appendChild(closeModal);
                }
            break;

            case 2:
                {
                    const messageModal = document.createElement('div');
                    messageModal.id = 'message-modal';
                    messageModal.classList.add('message');
                    document.body.appendChild(messageModal);

                    const modalBox = document.createElement('div');
                    modalBox.id = 'modal-message';
                    modalBox.classList.add('message');
                    document.body.appendChild(modalBox);
                    modalBox.style.opacity = 0;
                    setTimeout(() => { modalBox.style.transition = 'opacity 0.5s'; modalBox.style.opacity = 1; }, 10);

                    const modalContext = document.createElement('p');
                    modalContext.classList.add('message');
                    modalContext.id = "context"
                    modalContext.innerHTML = context;
                    modalBox.appendChild(modalContext);

                    const modalMessage = document.createElement('p');
                    modalMessage.classList.add('message');
                    modalMessage.id = "message";
                    modalMessage.innerHTML = message;
                    modalBox.appendChild(modalMessage);

                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 5%;';
                    modalBox.appendChild(buttonContainer);
                    
                    const cancelModal = document.createElement('button');
                    cancelModal.id = 'close-modal';
                    cancelModal.classList.add('message', 'button');
                    cancelModal.textContent = 'Kapat';
                    cancelModal.onclick = () => {
                        closeMessage();
                        resolve(0); // Return 0 if canceled
                    };
                    buttonContainer.appendChild(cancelModal);

                    const confirmModal = document.createElement('button');
                    confirmModal.id = 'confirm-modal';
                    confirmModal.classList.add('message', 'button');
                    confirmModal.textContent = 'Onayla';
                    confirmModal.onclick = () => {
                        closeMessage();
                        resolve(1); // Return 1 if confirmed
                    };
                    buttonContainer.appendChild(confirmModal);
                }
            break;

            case 3:
                {
                    const messageModal = document.createElement('div');
                    messageModal.id = 'message-modal';
                    messageModal.classList.add('message');
                    document.body.appendChild(messageModal);

                    const modalBox = document.createElement('div');
                    modalBox.id = 'modal-message';
                    modalBox.classList.add('message');
                    document.body.appendChild(modalBox);
                    modalBox.style.opacity = 0;
                    setTimeout(() => { modalBox.style.transition = 'opacity 0.5s'; modalBox.style.opacity = 1; }, 10);

                    const modalContext = document.createElement('p');
                    modalContext.classList.add('message');
                    modalContext.id = "context"
                    modalContext.innerHTML = context;
                    modalBox.appendChild(modalContext);

                    const modalMessage = document.createElement('p');
                    modalMessage.classList.add('message');
                    modalMessage.id = "message";
                    modalMessage.innerHTML = message;
                    modalBox.appendChild(modalMessage);

                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 5%;';
                    modalBox.appendChild(buttonContainer);
                    
                    const cancelModal = document.createElement('button');
                    cancelModal.id = 'close-modal';
                    cancelModal.classList.add('message', 'button');
                    cancelModal.textContent = 'Kapat';
                    cancelModal.onclick = () => {
                        closeMessage();
                        resolve(0); // Return 0 if canceled
                    };
                    buttonContainer.appendChild(cancelModal);

                    const confirmModal = document.createElement('button');
                    confirmModal.id = 'confirm-modal';
                    confirmModal.classList.add('message', 'button');
                    confirmModal.textContent = 'Giriş Yap';
                    confirmModal.onclick = () => {
                        window.location.replace('/login');
                    };
                    buttonContainer.appendChild(confirmModal);
                }
            break;
        }

        function closeMessage() {
            const elements = document.querySelectorAll('.message');
            elements.forEach(element => {
                element.style.transition = 'opacity 0.5s';
                element.style.opacity = 0;
                setTimeout(() => element.remove(), 500);  // Wait for the fade-out effect to finish
            });
        }
    });
}
adjustCss
function adjustCss() {
    if (window.innerWidth <= 768) {  // Adjust this value for different breakpoints
        document.getElementById(con).style.fontSize = '4vmin';  // Font size for mobile
    } else {
        modalContext.style.fontSize = '5vmin';  // Font size for larger screens
    }
}