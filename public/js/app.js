document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        initializeApp(token);
    } else {
        showAuthPage();
    }
});

function showAuthPage() {
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('chat-app').style.display = 'none';
    setupAuthFormListeners();
}

function setupAuthFormListeners() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
    const registerTab = document.querySelector('.auth-tab[data-tab="register"]');
    const loginFormContainer = document.getElementById('login-form');
    const registerFormContainer = document.getElementById('register-form');

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginFormContainer.classList.add('active');
        registerFormContainer.classList.remove('active');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerFormContainer.classList.add('active');
        loginFormContainer.classList.remove('active');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('#loginEmail').value;
        const password = loginForm.querySelector('#loginPassword').value;
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');
            localStorage.setItem('token', data.token);
            initializeApp(data.token);
        } catch (err) {
            alert(err.message);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = registerForm.querySelector('#registerUsername').value;
        const email = registerForm.querySelector('#registerEmail').value;
        const password = registerForm.querySelector('#registerPassword').value;
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                const errorMsg = data.error || 'Registration failed';
                throw new Error(errorMsg.includes('User with this email') ? 
                    'Email already in use' : errorMsg);
            }
            localStorage.setItem('token', data.token);
            initializeApp(data.token);
        } catch (err) {
            alert(err.message);
            registerForm.reset();
        }
    });
}

function initializeApp(token) {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('chat-app').style.display = 'block';

    const decodedToken = jwt_decode(token);
    const userId = decodedToken.userId;
    const username = decodedToken.username;

    document.getElementById('currentUserName').textContent = username;
    document.getElementById('currentUserId').textContent = userId;

    const socket = io({ auth: { token } });

    setupGlobalListeners(socket, userId, token);
    loadContacts(token, userId, socket);
    setupWelcomeScreen(token, userId, socket);
}

function setupGlobalListeners(socket, userId, token) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        socket.disconnect();
        showAuthPage();
    });

    document.getElementById('addContactBtn').addEventListener('click', () => {
        showModal('addContactModal');
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        hideModal('addContactModal');
    });

    document.getElementById('addContactConfirm').addEventListener('click', async () => {
        const contactIdentifier = document.getElementById('contactIdentifier').value;
        if (!contactIdentifier) {
            alert('Contact identifier (user ID) is required');
            return;
        }
        const contactName = document.getElementById('contactName').value;
        await addContact(token, userId, socket, contactIdentifier, contactName);
        hideModal('addContactModal');
    });

    socket.on('receive-message', (message) => {
        const messagesList = document.getElementById('messagesList');
        const currentUserId = document.getElementById('currentUserId').textContent;
        const chatContactId = document.getElementById('chatUserId').textContent;

        // Only append message if it belongs to the currently open chat
        if (chatContactId && ((message.senderId === currentUserId && message.receiverId === chatContactId) ||
            (message.senderId === chatContactId && message.receiverId === currentUserId))) {
            
            const messageEl = document.createElement('li');
            const chatContactName = document.getElementById('chatUserName').textContent;
            const senderDisplayName = message.senderId === currentUserId ? 'Me' : chatContactName;

            messageEl.textContent = `${senderDisplayName}: ${message.text}`;
            messagesList.appendChild(messageEl);
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    });
}

async function loadContacts(token, userId, socket) {
    try {
        const response = await fetch('/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.status === 401) {
            localStorage.removeItem('token');
            showAuthPage();
            return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load contacts');
        
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        if (data.contacts.length > 0) {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('chatHeader').style.display = 'flex';
            document.getElementById('messagesContainer').style.display = 'block';
            document.getElementById('messageInputContainer').style.display = 'flex';
        } else {
            document.getElementById('welcomeScreen').style.display = 'flex';
            document.getElementById('chatHeader').style.display = 'none';
            document.getElementById('messagesContainer').style.display = 'none';
            document.getElementById('messageInputContainer').style.display = 'none';
        }

        data.contacts.forEach(contact => {
            const contactEl = document.createElement('div');
            contactEl.className = 'contact-item';
        
            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'contact-avatar';
            avatar.textContent = contact.contactName ? contact.contactName[0].toUpperCase() : contact.contactId[0].toUpperCase();
            // Status indicator (optional, can be improved)
            const status = document.createElement('span');
            status.className = 'status-indicator offline';
            avatar.appendChild(status);
        
            // Info
            const info = document.createElement('div');
            info.className = 'contact-info';
            const name = document.createElement('div');
            name.className = 'contact-name';
            name.textContent = contact.contactName || contact.contactId;
            const lastMsg = document.createElement('div');
            lastMsg.className = 'contact-last-message';
            lastMsg.textContent = '';
            info.appendChild(name);
            info.appendChild(lastMsg);
        
            contactEl.appendChild(avatar);
            contactEl.appendChild(info);
            contactEl.dataset.contactId = contact.contactId;
            contactEl.addEventListener('click', () => openChat(contact, token, userId, socket));
            contactsList.appendChild(contactEl);
        });
    } catch (err) {
        alert(err.message);
    }
}

async function addContact(token, userId, socket, contactIdentifier, contactName) {
    try {
        const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ contactIdentifier, contactName })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not add contact');
        loadContacts(token, userId, socket);
    } catch (err) {
        alert(err.message);
    }
}

async function openChat(contact, token, userId, socket) {
    document.getElementById('chatUserName').textContent = contact.contactName || contact.contactId;
    document.getElementById('chatUserId').textContent = contact.contactId;
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';

    try {
        const response = await fetch(`/api/messages/${contact.contactId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load messages');

        data.messages.forEach(msg => {
            const messageEl = document.createElement('li');
            messageEl.textContent = `${msg.senderId === userId ? 'Me' : contact.contactName}: ${msg.text}`;
            messagesList.appendChild(messageEl);
        });
    } catch (err) {
        alert(err.message);
    }

    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    const sendMessage = async () => {
        const message = messageInput.value;
        if (message.trim()) {
            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ receiverId: contact.contactId, text: message })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not send message');
                messageInput.value = '';
            } catch (err) {
                alert(err.message);
            }
        }
    };

    sendBtn.onclick = sendMessage;

    messageInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };
}

function setupWelcomeScreen(token, userId, socket) {
    document.getElementById('startChatBtn').addEventListener('click', () => {
        showModal('addContactModal');
    });
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}