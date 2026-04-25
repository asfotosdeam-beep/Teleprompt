// Referências que serão capturadas após o carregamento do DOM
let sidebar, clientsList, addClientBtn, clientsScreenDashboard, clientsGrid, currentClientName, backToClientsBtn;
let projectsScreen, projectsList, addProjectBtn, backToProjectsBtn, projectTitleInput;
let controlsPanel, prompterScreen, textInput, prompterText, speedSlider, fontSizeSlider, lineSpacingSlider, startBtn;
let prompterMenuBtn, prompterOverlayMenu, menuPlayPause, menuRestart, menuStop;
let customModal, modalTitle, modalInput, modalMessage, modalCancel, modalConfirm;
let searchToggleBtn, deleteModeBtn, searchContainer, clientSearchInput;
let appContainer;

function captureElements() {
    sidebar = document.getElementById('sidebar');
    appContainer = document.getElementById('app-container');
    clientsList = document.getElementById('clients-list');
    addClientBtn = document.getElementById('add-client-btn');
    clientsScreenDashboard = document.getElementById('clients-screen-dashboard');
    clientsGrid = document.getElementById('clients-grid');
    currentClientName = document.getElementById('current-client-name');
    backToClientsBtn = document.getElementById('back-to-clients');
    
    projectsScreen = document.getElementById('projects-screen');
    projectsList = document.getElementById('projects-list');
    addProjectBtn = document.getElementById('add-project-btn');
    backToProjectsBtn = document.getElementById('back-to-projects');
    projectTitleInput = document.getElementById('project-title-input');
    
    controlsPanel = document.getElementById('controls-panel');
    prompterScreen = document.getElementById('prompter-screen');
    textInput = document.getElementById('text-input');
    prompterText = document.getElementById('prompter-text');
    speedSlider = document.getElementById('speed-slider');
    fontSizeSlider = document.getElementById('font-size-slider');
    lineSpacingSlider = document.getElementById('line-spacing-slider');
    startBtn = document.getElementById('start-btn');
    
    prompterMenuBtn = document.getElementById('prompter-menu-btn');
    prompterOverlayMenu = document.getElementById('prompter-overlay-menu');
    menuPlayPause = document.getElementById('menu-play-pause');
    menuRestart = document.getElementById('menu-restart');
    menuStop = document.getElementById('menu-stop');
    
    customModal = document.getElementById('custom-modal');
    modalTitle = document.getElementById('modal-title');
    modalInput = document.getElementById('modal-input');
    modalMessage = document.getElementById('modal-message');
    modalCancel = document.getElementById('modal-cancel');
    modalConfirm = document.getElementById('modal-confirm');
    
    deleteModeBtn = document.getElementById('delete-mode-btn');
    clientSearchInput = document.getElementById('client-search-input');
}

// Estado Global
let animationId;
let isPlaying = false;
let speed = 1.5;
let currentScrollY = 0;

let clients = JSON.parse(localStorage.getItem('teleprompter_clients')) || [];
let projects = JSON.parse(localStorage.getItem('teleprompter_projects')) || [];
let currentClientId = localStorage.getItem('teleprompter_last_client') || null;
let currentProjectId = localStorage.getItem('teleprompter_last_project') || null;

// Novo Estado
let isDeleteMode = false;
let selectedClientIds = [];
let searchQuery = '';

// Migração de Dados
function migrateData() {
    const oldProjects = JSON.parse(localStorage.getItem('teleprompter_projects'));
    if (oldProjects && oldProjects.length > 0 && !oldProjects[0].clientId) {
        const generalClient = { 
            id: 'geral', 
            name: 'Geral', 
            createdAt: Date.now(),
            settings: { speed: 30, fontSize: 60, lineSpacing: 15 }
        };
        if (!clients.find(c => c.id === 'geral')) clients.push(generalClient);
        projects = oldProjects.map(p => ({ ...p, clientId: 'geral' }));
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('teleprompter_clients', JSON.stringify(clients));
    localStorage.setItem('teleprompter_projects', JSON.stringify(projects));
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

// --- Modais Customizados ---

function showCustomModal({ title, placeholder, message, showInput = true, onConfirm }) {
    modalTitle.textContent = title;
    modalInput.placeholder = placeholder || '';
    modalInput.value = '';
    modalMessage.textContent = message || '';
    
    if (showInput) {
        modalInput.classList.remove('hidden');
        modalMessage.classList.add('hidden');
    } else {
        modalInput.classList.add('hidden');
        modalMessage.classList.remove('hidden');
    }
    
    customModal.classList.remove('hidden');
    modalInput.focus();
    
    modalConfirm.onclick = () => {
        const value = modalInput.value;
        customModal.classList.add('hidden');
        onConfirm(value);
    };
    
    modalCancel.onclick = () => {
        customModal.classList.add('hidden');
    };
}

// --- Lógica de Clientes ---

function renderClients() {
    const clientsList = document.getElementById('clients-list');
    const clientsGrid = document.getElementById('clients-grid');
    
    if (!clientsList || !clientsGrid) return;
    
    clientsList.innerHTML = '';
    clientsGrid.innerHTML = '';

    // Card Adicionar (+)
    const addCard = document.createElement('div');
    addCard.className = 'client-card add-card';
    addCard.innerHTML = '<span>+</span>';
    addCard.onclick = () => {
        if (isDeleteMode) toggleDeleteMode();
        addClient();
    };
    clientsGrid.appendChild(addCard);

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filteredClients.forEach(client => {
        // Item na Sidebar
        const item = document.createElement('div');
        item.className = `client-item ${currentClientId === client.id ? 'active' : ''}`;
        item.innerHTML = `<span>${client.name}</span><button class="delete-client" data-id="${client.id}">&times;</button>`;
        item.onclick = (e) => {
            if (e.target.classList.contains('delete-client')) {
                showCustomModal({
                    title: "Excluir Cliente",
                    message: `Deseja realmente excluir ${client.name} e todos os seus roteiros?`,
                    showInput: false,
                    onConfirm: () => deleteClient(client.id)
                });
            } else selectClient(client.id);
        };
        clientsList.appendChild(item);

        // Card na Grid
        const card = document.createElement('div');
        const isSelected = selectedClientIds.includes(client.id);
        card.className = `client-card ${isDeleteMode ? 'delete-mode' : ''} ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="client-avatar">${getInitials(client.name)}</div>
            <h3>${client.name}</h3>
        `;
        card.onclick = () => {
            if (isDeleteMode) toggleClientSelection(client.id);
            else selectClient(client.id);
        };
        clientsGrid.appendChild(card);
    });

    if (currentClientId) {
        const activeClient = clients.find(c => c.id === currentClientId);
        currentClientName.textContent = activeClient ? activeClient.name.toUpperCase() : 'NOME DO CLIENTE';
    }
}

function addClient() {
    showCustomModal({
        title: "Novo Cliente",
        placeholder: "Digite o nome do cliente...",
        onConfirm: (name) => {
            if (name) {
                const newClient = {
                    id: Date.now().toString(),
                    name: name,
                    createdAt: Date.now(),
                    settings: { speed: 30, fontSize: 60, lineSpacing: 15 }
                };
                clients.push(newClient);
                saveToLocalStorage();
                renderClients();
                selectClient(newClient.id);
            }
        }
    });
}

function deleteClient(id) {
    clients = clients.filter(c => c.id !== id);
    projects = projects.filter(p => p.clientId !== id);
    if (currentClientId === id) {
        currentClientId = null;
        showClientsDashboard();
    }
    saveToLocalStorage();
    renderClients();
    renderProjects();
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    deleteModeBtn.classList.toggle('primary');
    if (!isDeleteMode && selectedClientIds.length > 0) {
        showCustomModal({
            title: "Excluir Selecionados",
            message: `Deseja apagar os ${selectedClientIds.length} clientes selecionados?`,
            showInput: false,
            onConfirm: () => {
                clients = clients.filter(c => !selectedClientIds.includes(c.id));
                projects = projects.filter(p => !selectedClientIds.includes(p.clientId));
                selectedClientIds = [];
                saveToLocalStorage();
                renderClients();
            }
        });
    } else {
        selectedClientIds = [];
        renderClients();
    }
}

function toggleClientSelection(id) {
    if (selectedClientIds.includes(id)) {
        selectedClientIds = selectedClientIds.filter(cid => cid !== id);
    } else {
        selectedClientIds.push(id);
    }
    renderClients();
}

function selectClient(id) {
    currentClientId = id;
    localStorage.setItem('teleprompter_last_client', id);
    
    const client = clients.find(c => c.id === id);
    if (client && client.settings) {
        speedSlider.value = client.settings.speed;
        fontSizeSlider.value = client.settings.fontSize;
        lineSpacingSlider.value = client.settings.lineSpacing;
        updateSettings();
    }

    renderClients();
    renderProjects();
    
    appContainer.classList.add('hidden');
    clientsScreenDashboard.classList.add('hidden');
    projectsScreen.classList.remove('hidden');
    controlsPanel.classList.add('hidden');
    localStorage.setItem('teleprompter_last_screen', 'projects');
}

function showClientsDashboard() {
    currentClientId = null;
    localStorage.removeItem('teleprompter_last_client');
    localStorage.setItem('teleprompter_last_screen', 'clients');
    
    appContainer.classList.add('hidden');
    clientsScreenDashboard.classList.remove('hidden');
    projectsScreen.classList.add('hidden');
    controlsPanel.classList.add('hidden');
    renderClients();
}

// --- Lógica de Projetos ---

function renderProjects() {
    projectsList.innerHTML = '';
    if (!currentClientId) return;

    const filteredProjects = projects.filter(p => p.clientId === currentClientId);
    filteredProjects.sort((a, b) => b.updatedAt - a.updatedAt);

    filteredProjects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <h3>${project.name}</h3>
            <span class="date-info">Modificado em: ${formatDate(project.updatedAt)}</span>
            <button class="delete-project" data-id="${project.id}">&times;</button>
        `;
        card.onclick = (e) => {
            if (e.target.classList.contains('delete-project')) deleteProject(project.id);
            else openProject(project.id);
        };
        projectsList.appendChild(card);
    });
}

function addProject() {
    if (!currentClientId) return;
    showCustomModal({
        title: "Novo Roteiro",
        placeholder: "Digite o título do roteiro...",
        onConfirm: (name) => {
            if (name) {
                const newProject = {
                    id: Date.now().toString(),
                    clientId: currentClientId,
                    name: name,
                    script: "Comece seu roteiro aqui...",
                    updatedAt: Date.now()
                };
                projects.push(newProject);
                saveToLocalStorage();
                renderProjects();
                openProject(newProject.id);
            }
        }
    });
}

function deleteProject(id) {
    showCustomModal({
        title: "Excluir Roteiro",
        message: "Tem certeza que deseja apagar este roteiro permanentemente?",
        showInput: false,
        onConfirm: () => {
            projects = projects.filter(p => p.id !== id);
            saveToLocalStorage();
            renderProjects();
        }
    });
}

function openProject(id) {
    currentProjectId = id;
    const project = projects.find(p => p.id === id);
    if (project) {
        textInput.value = project.script;
        projectTitleInput.value = project.name;
        
        appContainer.classList.remove('hidden');
        clientsScreenDashboard.classList.add('hidden');
        projectsScreen.classList.add('hidden');
        controlsPanel.classList.remove('hidden');
        
        localStorage.setItem('teleprompter_last_project', id);
        localStorage.setItem('teleprompter_last_screen', 'controls');
    }
}

function goBackToProjects() {
    if (currentProjectId) {
        const project = projects.find(p => p.id === currentProjectId);
        if (project) {
            project.script = textInput.value;
            project.name = projectTitleInput.value;
            project.updatedAt = Date.now();
            saveToLocalStorage();
        }
    }
    currentProjectId = null;
    
    appContainer.classList.add('hidden');
    controlsPanel.classList.add('hidden');
    projectsScreen.classList.remove('hidden');
    
    localStorage.removeItem('teleprompter_last_project');
    localStorage.setItem('teleprompter_last_screen', 'projects');
    renderProjects();
}

// --- Lógica do Prompter ---

function updateSettings() {
    speed = speedSlider.value / 20; 
    prompterText.style.fontSize = `${fontSizeSlider.value}px`;
    prompterText.style.lineHeight = lineSpacingSlider.value / 10;
    document.getElementById('speed-val').textContent = speedSlider.value;
    document.getElementById('font-size-val').textContent = fontSizeSlider.value;
    document.getElementById('line-spacing-val').textContent = lineSpacingSlider.value;
}

function saveClientSettings() {
    if (currentClientId) {
        const client = clients.find(c => c.id === currentClientId);
        if (client) {
            client.settings = {
                speed: parseInt(speedSlider.value),
                fontSize: parseInt(fontSizeSlider.value),
                lineSpacing: parseInt(lineSpacingSlider.value)
            };
            saveToLocalStorage();
        }
    }
}

function startPrompter() {
    const text = textInput.value;
    if (!text.trim()) return;
    updateSettings();
    prompterText.textContent = text;
    controlsPanel.classList.add('hidden');
    prompterScreen.classList.remove('hidden');
    
    // Inicia no final e sobe (para descer no reflexo)
    prompterScreen.scrollTop = prompterScreen.scrollHeight;
    currentScrollY = prompterScreen.scrollTop;
    
    localStorage.setItem('teleprompter_last_screen', 'prompter');
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    
    // Solicitar tela cheia para melhor experiência no celular
    if (prompterScreen.requestFullscreen) {
        prompterScreen.requestFullscreen();
    } else if (prompterScreen.webkitRequestFullscreen) {
        prompterScreen.webkitRequestFullscreen();
    } else if (prompterScreen.msRequestFullscreen) {
        prompterScreen.msRequestFullscreen();
    }

    play();
}

function stopPrompter() {
    pause();
    controlsPanel.classList.remove('hidden');
    prompterScreen.classList.add('hidden');
    prompterOverlayMenu.classList.remove('show');
    localStorage.setItem('teleprompter_last_screen', 'controls');
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();

    // Sair da tela cheia
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function scrollStep() {
    if (isPlaying) {
        currentScrollY -= speed; // Invertido: Diminui scroll para descer no reflexo
        prompterScreen.scrollTop = Math.floor(currentScrollY);
        
        if (prompterScreen.scrollTop <= 0) {
            pause();
            menuPlayPause.innerHTML = '&#x25B6;';
        } else {
            animationId = requestAnimationFrame(scrollStep);
        }
    }
}

function play() {
    // Sincroniza com a posição manual se o usuário tiver scrollado enquanto pausado
    currentScrollY = prompterScreen.scrollTop;
    
    isPlaying = true;
    menuPlayPause.innerHTML = '&#x23F8;';
    animationId = requestAnimationFrame(scrollStep);
}

function pause() {
    isPlaying = false;
    menuPlayPause.innerHTML = '&#x25B6;';
    cancelAnimationFrame(animationId);
}

function restartPrompter() {
    prompterScreen.scrollTop = prompterScreen.scrollHeight;
    currentScrollY = prompterScreen.scrollTop;
    prompterOverlayMenu.classList.remove('show');
    pause(); // Pausa ao reiniciar para aguardar o comando
}

// --- Event Listeners ---
function setupEventListeners() {
    if (addClientBtn) addClientBtn.addEventListener('click', addClient);
    if (backToClientsBtn) backToClientsBtn.addEventListener('click', showClientsDashboard);
    if (addProjectBtn) addProjectBtn.addEventListener('click', addProject);
    if (backToProjectsBtn) backToProjectsBtn.addEventListener('click', goBackToProjects);
    if (startBtn) startBtn.addEventListener('click', startPrompter);
    
    // Busca e Exclusão
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderClients();
        });
    }
    
    if (deleteModeBtn) deleteModeBtn.addEventListener('click', toggleDeleteMode);
    
    // Menu Flutuante
    if (prompterMenuBtn) {
        prompterMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            prompterOverlayMenu.classList.toggle('show');
        });
    }
    
    if (menuPlayPause) {
        menuPlayPause.addEventListener('click', () => {
            if (isPlaying) pause(); else play();
        });
    }
    
    if (menuRestart) menuRestart.addEventListener('click', restartPrompter);
    if (menuStop) menuStop.addEventListener('click', stopPrompter);
    
    // Fecha o menu ao clicar fora
    if (prompterScreen) {
        prompterScreen.addEventListener('click', () => {
            prompterOverlayMenu.classList.remove('show');
        });
    }
    
    if (textInput) {
        textInput.addEventListener('input', () => {
            if (currentProjectId) {
                const project = projects.find(p => p.id === currentProjectId);
                if (project) {
                    project.script = textInput.value;
                    project.updatedAt = Date.now();
                    saveToLocalStorage();
                }
            }
        });
    }
    
    if (projectTitleInput) {
        projectTitleInput.addEventListener('input', () => {
            if (currentProjectId) {
                const project = projects.find(p => p.id === currentProjectId);
                if (project) {
                    project.name = projectTitleInput.value;
                    project.updatedAt = Date.now();
                    saveToLocalStorage();
                    renderProjects();
                }
            }
        });
    }
    
    if (speedSlider) speedSlider.addEventListener('input', () => { updateSettings(); saveClientSettings(); });
    if (fontSizeSlider) fontSizeSlider.addEventListener('input', () => { updateSettings(); saveClientSettings(); });
    if (lineSpacingSlider) lineSpacingSlider.addEventListener('input', () => { updateSettings(); saveClientSettings(); });
    
    // --- Atalhos de Teclado ---
    window.addEventListener('keydown', (e) => {
        if (!prompterScreen || prompterScreen.classList.contains('hidden')) return;
    
        if (e.code === 'Space') {
            e.preventDefault();
            if (isPlaying) pause(); else play();
        } else if (e.code === 'Escape') {
            stopPrompter();
        } else if (e.code === 'KeyR') {
            restartPrompter();
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            speedSlider.value = Math.min(100, parseInt(speedSlider.value) + 5);
            updateSettings();
            saveClientSettings();
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            speedSlider.value = Math.max(1, parseInt(speedSlider.value) - 5);
            updateSettings();
            saveClientSettings();
        }
    });
}

// --- Inicialização ---

function initApp() {
    captureElements();
    migrateData();
    setupEventListeners();
    renderClients();
    
    const lastScreen = localStorage.getItem('teleprompter_last_screen');
    const lastProjectId = localStorage.getItem('teleprompter_last_project');
    const lastClientId = localStorage.getItem('teleprompter_last_client');

    if (lastScreen === 'controls' && lastProjectId && lastClientId) {
        selectClient(lastClientId);
        openProject(lastProjectId);
    } else if (lastScreen === 'projects' && lastClientId) {
        selectClient(lastClientId);
    } else {
        showClientsDashboard();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
