// ============================================
// API CONFIGURATION - TERSEMBUNYI DI DALAM CODE
// ============================================
// API keys sudah include di sini, tidak perlu diinput user
// DAN TIDAK AKAN TAMPIL DI UI
// ============================================

const CONFIG = {
    domain: 'https://nayoffc.my.id',  // Domain Anda
    apiKey: 'ptla_sHBDAx21LICJLz0Qk8sMKsTQH6aNGIRz03CTrDHK4cA',  // API Key Anda
    clientKey: 'ptlc_ceF8EQFV0NANV8w2XdvwuN9pyarQx5wKKRknsril6wn'  // Client Key Anda
};

// ============================================
// API HANDLER - JANGAN DIUBAH
// ============================================

let currentServerId = null;
let activityLogs = [];

// Headers untuk API requests
function getHeaders() {
    return {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

function getClientHeaders() {
    return {
        'Authorization': `Bearer ${CONFIG.clientKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

// Test connection on load
document.addEventListener('DOMContentLoaded', function() {
    testConnection();
    loadNests();
});

// Test API Connection
async function testConnection() {
    const statusEl = document.getElementById('connectionStatus');
    
    statusEl.className = 'status-badge status-checking';
    statusEl.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>Testing Connection...';
    
    try {
        const response = await fetch(`${CONFIG.domain}/api/application/users?per_page=1`, {
            headers: getHeaders()
        });
        
        if (response.ok) {
            statusEl.className = 'status-badge status-connected';
            statusEl.innerHTML = '<i class="bi bi-wifi me-1"></i>Connected to Panel';
            addLog('success', 'Connected to Pterodactyl panel');
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        statusEl.className = 'status-badge status-disconnected';
        statusEl.innerHTML = '<i class="bi bi-wifi-off me-1"></i>Connection Failed';
        addLog('error', 'Failed to connect to panel: ' + error.message);
    }
}

// Load Nests
async function loadNests() {
    try {
        const response = await fetch(`${CONFIG.domain}/api/application/nests`, {
            headers: getHeaders()
        });
        const data = await response.json();
        
        const nestSelect = document.getElementById('nest');
        nestSelect.innerHTML = '<option value="">Select Nest</option>';
        
        data.data.forEach(nest => {
            const option = document.createElement('option');
            option.value = nest.attributes.id;
            option.textContent = nest.attributes.name;
            nestSelect.appendChild(option);
        });
        
        addLog('info', `Loaded ${data.data.length} nests`);
    } catch (error) {
        addLog('error', 'Failed to load nests: ' + error.message);
    }
}

// Load Eggs
async function loadEggs() {
    const nestId = document.getElementById('nest').value;
    if (!nestId) return;
    
    try {
        const response = await fetch(`${CONFIG.domain}/api/application/nests/${nestId}/eggs`, {
            headers: getHeaders()
        });
        const data = await response.json();
        
        const eggSelect = document.getElementById('egg');
        eggSelect.innerHTML = '<option value="">Select Egg</option>';
        
        data.data.forEach(egg => {
            const option = document.createElement('option');
            option.value = egg.attributes.id;
            option.textContent = egg.attributes.name;
            eggSelect.appendChild(option);
        });
        
        addLog('info', `Loaded ${data.data.length} eggs`);
    } catch (error) {
        addLog('error', 'Failed to load eggs: ' + error.message);
    }
}

// Select RAM
function selectRAM(ramValue) {
    document.getElementById('ram').value = ramValue;
    document.querySelectorAll('.ram-badge').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');
}

// Toggle Password
function togglePassword() {
    const password = document.getElementById('password');
    const icon = document.getElementById('toggleIcon');
    
    if (password.type === 'password') {
        password.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        password.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

// Generate Password
function generatePassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    document.getElementById('password').value = password;
    addLog('info', 'Generated new password');
}

// Create Panel
document.getElementById('createPanelForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = document.getElementById('createBtn');
    const spinner = document.getElementById('createSpinner');
    const btnText = document.getElementById('createBtnText');
    
    btn.disabled = true;
    spinner.classList.remove('d-none');
    btnText.innerHTML = 'Creating Panel...';
    
    try {
        // Create User
        const userData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            first_name: document.getElementById('username').value,
            last_name: 'User',
            password: document.getElementById('password').value
        };
        
        const userResponse = await fetch(`${CONFIG.domain}/api/application/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData)
        });
        
        if (!userResponse.ok) {
            const error = await userResponse.json();
            throw new Error(error.errors?.[0]?.detail || 'Failed to create user');
        }
        
        const user = await userResponse.json();
        addLog('success', `User created: ${userData.username}`);
        
        // Create Server
        const serverData = {
            name: document.getElementById('panelName').value,
            user: user.attributes.id,
            egg: parseInt(document.getElementById('egg').value),
            docker_image: 'ghcr.io/pterodactyl/yolks:games_rust',
            startup: './start.sh',
            environment: {
                SERVER_JARFILE: 'server.jar',
                VERSION: 'latest'
            },
            limits: {
                memory: parseInt(document.getElementById('ram').value),
                swap: 0,
                disk: 10240,
                io: 500,
                cpu: 100
            },
            feature_limits: {
                databases: 2,
                allocations: 1,
                backups: 2
            }
        };
        
        const serverResponse = await fetch(`${CONFIG.domain}/api/application/servers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(serverData)
        });
        
        if (!serverResponse.ok) {
            throw new Error('Failed to create server');
        }
        
        const server = await serverResponse.json();
        addLog('success', `Server created: ${serverData.name}`);
        
        // Set Admin if selected
        if (document.getElementById('userType').value === 'admin') {
            await fetch(`${CONFIG.domain}/api/application/users/${user.attributes.id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ root_admin: true })
            });
            addLog('info', `User set as administrator`);
        }
        
        // Show Success
        showSuccess({
            user: user.attributes,
            server: server.attributes
        });
        
    } catch (error) {
        alert('Error: ' + error.message);
        addLog('error', error.message);
    } finally {
        btn.disabled = false;
        spinner.classList.add('d-none');
        btnText.innerHTML = 'Create Panel <i class="bi bi-arrow-right ms-2"></i>';
    }
});

// Show Success
function showSuccess(data) {
    const result = document.getElementById('resultContainer');
    const details = document.getElementById('resultDetails');
    
    details.innerHTML = `
        <div class="mb-2"><strong>Panel Name:</strong> ${data.server.name}</div>
        <div class="mb-2"><strong>Username:</strong> ${data.user.username}</div>
        <div class="mb-2"><strong>Email:</strong> ${data.user.email}</div>
        <div class="mb-2"><strong>Password:</strong> ${document.getElementById('password').value}</div>
        <div class="mb-2"><strong>RAM:</strong> ${data.server.limits.memory} MB</div>
        <div class="mb-2"><strong>Server ID:</strong> ${data.server.id}</div>
        <div class="mb-2"><strong>Panel URL:</strong> ${CONFIG.domain}</div>
    `;
    
    result.classList.add('show');
    currentServerId = data.server.id;
}

// Load Servers
async function loadServers() {
    try {
        const response = await fetch(`${CONFIG.domain}/api/application/servers`, {
            headers: getHeaders()
        });
        const data = await response.json();
        
        let html = '';
        if (data.data.length === 0) {
            html = '<div class="text-center text-secondary py-5">No servers found</div>';
        } else {
            data.data.forEach(server => {
                const s = server.attributes;
                html += `
                    <div class="server-item" onclick="viewServer('${s.id}')">
                        <div class="d-flex justify-content-between">
                            <h6><i class="bi bi-server me-2"></i>${s.name}</h6>
                            <span class="badge" style="background: ${s.suspended ? '#f87171' : '#4ade80'}">
                                ${s.suspended ? 'Suspended' : 'Active'}
                            </span>
                        </div>
                        <small class="text-secondary">ID: ${s.identifier} | RAM: ${s.limits.memory} MB</small>
                    </div>
                `;
            });
        }
        
        document.getElementById('serversList').innerHTML = html;
        addLog('info', `Loaded ${data.data.length} servers`);
        
    } catch (error) {
        document.getElementById('serversList').innerHTML = `
            <div class="text-center text-danger py-5">
                <i class="bi bi-exclamation-triangle me-2"></i>Failed to load servers
            </div>
        `;
        addLog('error', 'Failed to load servers: ' + error.message);
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch(`${CONFIG.domain}/api/application/users`, {
            headers: getHeaders()
        });
        const data = await response.json();
        
        let html = '';
        if (data.data.length === 0) {
            html = '<div class="text-center text-secondary py-5">No users found</div>';
        } else {
            data.data.forEach(user => {
                const u = user.attributes;
                html += `
                    <div class="server-item">
                        <div class="d-flex justify-content-between">
                            <h6><i class="bi bi-person me-2"></i>${u.username}</h6>
                            <span class="badge" style="background: ${u.root_admin ? '#8b5cf6' : '#64748b'}">
                                ${u.root_admin ? 'Admin' : 'User'}
                            </span>
                        </div>
                        <small class="text-secondary">Email: ${u.email}</small>
                    </div>
                `;
            });
        }
        
        document.getElementById('usersList').innerHTML = html;
        addLog('info', `Loaded ${data.data.length} users`);
        
    } catch (error) {
        document.getElementById('usersList').innerHTML = `
            <div class="text-center text-danger py-5">
                <i class="bi bi-exclamation-triangle me-2"></i>Failed to load users
            </div>
        `;
        addLog('error', 'Failed to load users: ' + error.message);
    }
}

// View Server
async function viewServer(serverId) {
    try {
        const response = await fetch(`${CONFIG.domain}/api/application/servers/${serverId}`, {
            headers: getHeaders()
        });
        const data = await response.json();
        const server = data.attributes;
        
        document.getElementById('serverModalBody').innerHTML = `
            <div class="mb-4">
                <h6 class="text-primary mb-3">Server Information</h6>
                <p><strong>Name:</strong> ${server.name}</p>
                <p><strong>ID:</strong> ${server.id}</p>
                <p><strong>Identifier:</strong> ${server.identifier}</p>
                <p><strong>UUID:</strong> ${server.uuid}</p>
            </div>
            
            <div class="mb-4">
                <h6 class="text-primary mb-3">Resource Limits</h6>
                <p><strong>Memory:</strong> ${server.limits.memory} MB</p>
                <p><strong>Disk:</strong> ${server.limits.disk} MB</p>
                <p><strong>CPU:</strong> ${server.limits.cpu}%</p>
            </div>
            
            <div class="mb-4">
                <h6 class="text-primary mb-3">Status</h6>
                <p><strong>State:</strong> <span class="badge" style="background: ${server.suspended ? '#f87171' : '#4ade80'}">
                    ${server.suspended ? 'Suspended' : 'Active'}
                </span></p>
                <p><strong>Node:</strong> ${server.node}</p>
            </div>
        `;
        
        currentServerId = serverId;
        
        const modal = new bootstrap.Modal(document.getElementById('serverModal'));
        modal.show();
        
    } catch (error) {
        alert('Failed to load server details');
        addLog('error', 'Failed to load server details: ' + error.message);
    }
}

// Control Server
async function controlServer(action) {
    if (!currentServerId) return;
    
    try {
        const response = await fetch(`${CONFIG.domain}/api/client/servers/${currentServerId}/power`, {
            method: 'POST',
            headers: getClientHeaders(),
            body: JSON.stringify({ signal: action })
        });
        
        if (response.ok) {
            addLog('success', `Server ${action} initiated`);
            alert(`Server ${action} initiated successfully`);
        }
    } catch (error) {
        addLog('error', `Failed to ${action} server: ` + error.message);
    }
}

// Add Log
function addLog(type, message) {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<span class="text-secondary">[${timestamp}]</span> ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    activityLogs.push({ type, message, timestamp });
}

// Clear Logs
function clearLogs() {
    document.getElementById('logContainer').innerHTML = '';
    activityLogs = [];
    addLog('info', 'Logs cleared');
}

// Copy Result
function copyResult() {
    const text = document.getElementById('resultDetails').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
}

// View Created Server
function viewCreatedServer() {
    if (currentServerId) {
        viewServer(currentServerId);
    }
}
