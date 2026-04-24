// Elementos da UI
const sidebar = document.getElementById('sidebar');
const clientsList = document.getElementById('clients-list');
const addClientBtn = document.getElementById('add-client-btn');
const clientsScreenDashboard = document.getElementById('clients-screen-dashboard');
const clientsGrid = document.getElementById('clients-grid');
const currentClientName = document.getElementById('current-client-name');
const backToClientsBtn = document.getElementById('back-to-clients');

const projectsScreen = document.getElementById('projects-screen');
const projectsList = document.getElementById('projects-list');
const addProjectBtn = document.getElementById('add-project-btn');
const backToProjectsBtn = document.getElementById('back-to-projects');
const projectTitleInput = document.getElementById('project-title-input');

const controlsPanel = document.getElementById('controls-panel');
const prompterScreen = document.getElementById('prompter-screen');
const textInput = document.getElementById('text-input');
const prompterText = document.getElementById('prompter-text');
const speedSlider = document.getElementById('speed-slider');
const fontSizeSlider = document.getElementById('font-size-slider');
const lineSpacingSlider = document.getElementById('line-spacing-slider');
const startBtn = document.getElementById('start-btn');

// Elementos do Menu Flutuante do Prompter
const prompterMenuBtn = document.getElementById('prompter-menu-btn');
const prompterOverlayMenu = document.getElementById('prompter-overlay-menu');
const menuPlayPause = document.getElementById('menu-play-pause');
const menuRestart = document.getElementById('menu-restart');
const menuStop = document.getElementById('menu-stop');

// Estado Global
let animationId;
let isPlaying = false;
let speed = 1.5;
let currentScrollY = 0;

let clients = JSON.parse(localStorage.getItem('teleprompter_clients')) || [];
let projects = JSON.parse(localStorage.getItem('teleprompter_projects')) || [];
let currentClientId = localStorage.getItem('teleprompter_last_client') || null;
let currentProjectId = localStorage.getItem('teleprompter_last_project') || null;

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

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}:${seconds}`;
}

// --- Lógica de Clientes ---

function renderClients() {
    clientsList.innerHTML = '';
    clientsGrid.innerHTML = '';

    const addCard = document.createElement('div');
    addCard.className = 'client-card add-card';
    addCard.innerHTML = '+';
    addCard.onclick = addClient;
    clientsGrid.appendChild(addCard);

    if (clients.length === 0) {
        const defaultClient = { 
            id: Date.now().toString(), 
            name: 'Meu Primeiro Cliente', 
            createdAt: Date.now(),
            settings: { speed: 30, fontSize: 60, lineSpacing: 15 }
        };
        clients.push(defaultClient);
        saveToLocalStorage();
    }

    clients.forEach(client => {
        const item = document.createElement('div');
        item.className = `client-item ${currentClientId === client.id ? 'active' : ''}`;
        item.innerHTML = `<span>${client.name}</span><button class="delete-client" data-id="${client.id}">&times;</button>`;
        item.onclick = (e) => {
            if (e.target.classList.contains('delete-client')) deleteClient(client.id);
            else selectClient(client.id);
        };
        clientsList.appendChild(item);

        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `<h3>${client.name}</h3>`;
        card.onclick = () => selectClient(client.id);
        clientsGrid.appendChild(card);
    });

    if (currentClientId) {
        const activeClient = clients.find(c => c.id === currentClientId);
        currentClientName.textContent = activeClient ? activeClient.name.toUpperCase() : 'NOME DO CLIENTE';
    }
}

function addClient() {
    const name = prompt("Nome do novo cliente:");
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

function deleteClient(id) {
    if (confirm("Isso excluirá o cliente e TODOS os seus projetos. Confirmar?")) {
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
    
    clientsScreenDashboard.classList.add('hidden');
    sidebar.classList.remove('hidden');
    projectsScreen.classList.remove('hidden');
    controlsPanel.classList.add('hidden');
    localStorage.setItem('teleprompter_last_screen', 'projects');
}

function showClientsDashboard() {
    currentClientId = null;
    localStorage.removeItem('teleprompter_last_client');
    localStorage.setItem('teleprompter_last_screen', 'clients');
    
    clientsScreenDashboard.classList.remove('hidden');
    projectsScreen.classList.add('hidden');
    controlsPanel.classList.add('hidden');
    sidebar.classList.add('hidden');
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
    const name = prompt("Nome do novo roteiro:");
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

function deleteProject(id) {
    if (confirm("Excluir este roteiro?")) {
        projects = projects.filter(p => p.id !== id);
        saveToLocalStorage();
        renderProjects();
    }
}

function openProject(id) {
    currentProjectId = id;
    const project = projects.find(p => p.id === id);
    if (project) {
        textInput.value = project.script;
        projectTitleInput.value = project.name;
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

if (addClientBtn) addClientBtn.addEventListener('click', addClient);
backToClientsBtn.addEventListener('click', showClientsDashboard);
addProjectBtn.addEventListener('click', addProject);
backToProjectsBtn.addEventListener('click', goBackToProjects);
startBtn.addEventListener('click', startPrompter);

// Menu Flutuante
prompterMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prompterOverlayMenu.classList.toggle('show');
});

menuPlayPause.addEventListener('click', () => {
    if (isPlaying) pause(); else play();
});

menuRestart.addEventListener('click', restartPrompter);
menuStop.addEventListener('click', stopPrompter);

// Fecha o menu ao clicar fora
prompterScreen.addEventListener('click', () => {
    prompterOverlayMenu.classList.remove('show');
});

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

speedSlider.addEventListener('input', () => { updateSettings(); saveClientSettings(); });
fontSizeSlider.addEventListener('input', () => { updateSettings(); saveClientSettings(); });
lineSpacingSlider.addEventListener('input', () => { updateSettings(); saveClientSettings(); });

// --- Inicialização ---

function initApp() {
    migrateData();
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

initApp();
