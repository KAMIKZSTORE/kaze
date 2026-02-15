// Pterodactyl API Configuration
const API = {
    domain: 'https://nayoffc.my.id',
    apiKey: 'ptla_sHBDAx21LICJLz0Qk8sMKsTQH6aNGIRz03CTrDHK4cA',
    clientKey: 'ptlc_ceF8EQFV0NANV8w2XdvwuN9pyarQx5wKKRknsril6wn'
};

// Headers for API requests
const headers = {
    'Authorization': `Bearer ${API.apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

const clientHeaders = {
    'Authorization': `Bearer ${API.clientKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

// Activity Logs Array
let activityLogs = [];
let currentServerId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    testConnection();
    loadNests();
    loadAllocations();
    addLog('info', 'Application initialized');
});

// Test API Connection
async function testConnection() {
    const statusSpinner = document.getElementById('statusSpinner');
    const statusText = document.getElementById('statusText');
    const apiStatus = document.getElementById('apiStatus');
    
    try {
        const response = await fetch(`${API.domain}/api/application/users`, { headers });
        
        if (response.ok) {
            statusSpinner.classList.remove('spinner-grow');
            statusSpinner.classList.add('spinner-grow', 'text-success');
            statusText.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Connected to API</span>';
            apiStatus.className = 'badge bg-success';
            apiStatus.textContent = 'Connected';
            addLog('success', 'API connection successful');
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        statusSpinner.classList.remove('spinner-grow');
        statusSpinner.classList.add('spinner-grow', 'text-danger');
        statusText.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Failed to connect to API</span>';
        apiStatus.className = 'badge bg-danger';
        apiStatus.textContent = 'Disconnected';
        addLog('error', 'API connection failed: ' + error.message);
    }
}

// Load Nests from API
async function loadNests() {
    try {
        const response = await fetch(`${API.domain}/api/application/nests`, { headers });
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

// Load Eggs when nest changes
document.getElementById('nest').addEventListener('change', async function() {
    const nestId = this.value;
    if (!nestId) return;
    
    try {
        const response = await fetch(`${API.domain}/api/application/nests/${nestId}/eggs`, { headers });
        const data = await response.json();
        
        const eggSelect = document.getElementById('egg');
        eggSelect.innerHTML = '<option value="">Select Egg</option>';
        
        data.data.forEach(egg => {
            const option = document.createElement('option');
            option.value = egg.attributes.id;
            option.textContent = egg.attributes.name;
            eggSelect.appendChild(option);
        });
        
        addLog('info', `Loaded ${data.data.length} eggs for nest ${nestId}`);
    } catch (error) {
        addLog('error', 'Failed to load eggs: ' + error.message);
    }
});

// Load Allocations
async function loadAllocations() {
    try {
        const response = await fetch(`${API.domain}/api/application/nodes/1/allocations`, { headers });
        const data = await response.json();
        
        const allocSelect = document.getElementById('allocation');
        allocSelect.innerHTML = '<option value="">Auto Allocation</option>';
        
        data.data.forEach(alloc => {
            if (!alloc.attributes.assigned) {
                const option = document.createElement('option');
                option.value = alloc.attributes.id;
                option.textContent = `${alloc.attributes.ip}:${alloc.attributes.port}`;
                allocSelect.appendChild(option);
            }
        });
    } catch (error) {
        addLog('error', 'Failed to load allocations: ' + error.message);
    }
}

// Select RAM
function selectRAM(ramValue) {
    document.getElementById('ram').value = ramValue;
    document.querySelectorAll('.badge-ram').forEach(badge => {
        badge.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// Toggle Password Visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('bi-eye');
        toggleIcon.classList.add('bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('bi-eye-slash');
        toggleIcon.classList.add('bi-eye');
    }
}

// Generate Random Password
function generatePassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    document.getElementById('password').value = password;
    checkPasswordStrength(password);
    addLog('info', 'Generated new password');
}

// Check Password Strength
document.getElementById('password').addEventListener('input', function() {
    checkPasswordStrength(this.value);
});

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    strengthBar.className = 'password-strength';
    
    if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
    } else if (strength <= 3) {
        strengthBar.classList.add('strength-medium');
    } else if (strength <= 4) {
        strengthBar.classList.add('strength-strong');
    } else {
        strengthBar.classList.add('strength-very-strong');
    }
}

// Create Panel Form Submit
document.getElementById('createPanelForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const createBtn = document.getElementById('createBtn');
    const createSpinner = document.getElementById('createSpinner');
    const createBtnText = document.getElementById('createBtnText');
    
    // Disable button and show loading
    createBtn.disabled = true;
    createSpinner.classList.remove('d-none');
    createBtnText.innerHTML = 'Creating Panel...';
    
    try {
        // Step 1: Create User
        const userData = await createUser();
        if (!userData) throw new Error('Failed to create user');
        
        // Step 2: Create Server
        const serverData = await createServer(userData.attributes.id);
        
        // Step 3: Set as Admin if selected
        if (document.getElementById('userType').value === 'admin') {
            await makeAdmin(userData.attributes.id);
        }
        
        // Show Success
        showSuccess({
            user: userData.attributes,
            server: serverData.attributes
        });
        
        addLog('success', `Panel created successfully for ${userData.attributes.username}`);
        
    } catch (error) {
        showError('Failed to create panel: ' + error.message);
        addLog('error', 'Panel creation failed: ' + error.message);
    } finally {
        // Re-enable button
        createBtn.disabled = false;
        createSpinner.classList.add('d-none');
        createBtnText.innerHTML = 'Create Panel <i class="bi bi-arrow-right ms-2"></i>';
    }
});

// Create User via API
async function createUser() {
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        first_name: document.getElementById('username').value,
        last_name: 'User',
        password: document.getElementById('password').value
    };
    
    const response = await fetch(`${API.domain}/api/application/users`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors[0].detail || 'Failed to create user');
    }
    
    const data = await response.json();
    addLog('success', `User created: ${userData.username}`);
    return data;
}

// Create Server via API
async function createServer(userId) {
    const serverData = {
        name: document.getElementById('panelName').value,
        user: userId,
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
        },
        allocation: {
            default: parseInt(document.getElementById('allocation').value) || null
        }
    };
    
    const response = await fetch(`${API.domain}/api/application/servers`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(serverData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors[0].detail || 'Failed to create server');
    }
    
    const data = await response.json();
    addLog('success', `Server created: ${serverData.name}`);
    return data;
}

// Make user admin
async function makeAdmin(userId) {
    const response = await fetch(`${API.domain}/api/application/users/${userId}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ root_admin: true })
    });
    
    if (!response.ok) {
        throw new Error('Failed to set admin privileges');
    }
    
    addLog('info', `User ${userId} set as administrator`);
}

// Show success result
function showSuccess(data) {
    const resultContainer = document.getElementById('resultContainer');
    const resultDetails = document.getElementById('resultDetails');
    
    resultDetails.innerHTML = `
        <p><strong>Panel Name:</strong> ${data.server.name}</p>
        <p><strong>Username:</strong> ${data.user.username}</p>
        <p><strong>Email:</strong> ${data.user.email}</p>
        <p><strong>Password:</strong> ${document.getElementById('password').value}</p>
        <p><strong>RAM:</strong> ${data.server.limits.memory} MB</p>
        <p><strong>User Type:</strong> ${document.getElementById('userType').value === 'admin' ? 'Administrator' : 'Regular User'}</p>
        <p><strong>Server ID:</strong> ${data.server.id}</p>
        <p><strong>Panel URL:</strong> ${API.domain}</p>
    `;
    
    resultContainer.classList.add('show');
    currentServerId = data.server.id;
}

// Show error
function showError(message) {
    const alertContainer = document.createElement('div');
    alertContainer.className = 'alert alert-danger alert-dismissible fade show mt-3';
    alertContainer.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.card-body').prepend(alertContainer);
    
    setTimeout(() => alertContainer.remove(), 5000);
}

// Load Servers
async function loadServers() {
    const serversList = document.getElementById('serversList');
    serversList.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-arrow-repeat spin me-2"></i>Loading servers...</div>';
    
    try {
        const response = await fetch(`${API.domain}/api/application/servers`, { headers });
        const data = await response.json();
        
        if (data.data.length === 0) {
            serversList.innerHTML = '<div class="text-center text-muted py-5">No servers found</div>';
            return;
        }
        
        let html = '';
        data.data.forEach(server => {
            const attr = server.attributes;
            html += `
                <div class="server-item" onclick="viewServer('${attr.id}')">
                    <div class="d-flex justify-content-between">
                        <h6><i class="bi bi-server me-2"></i>${attr.name}</h6>
                        <span class="badge ${attr.suspended ? 'bg-warning' : 'bg-success'}">
                            ${attr.suspended ? 'Suspended' : 'Active'}
                        </span>
                    </div>
                    <p class="mb-1 small">ID: ${attr.identifier}</p>
                    <p class="mb-0 small">Node: ${attr.node} | RAM: ${attr.limits.memory} MB</p>
                </div>
            `;
        });
        
        serversList.innerHTML = html;
        addLog('info', `Loaded ${data.data.length} servers`);
        
    } catch (error) {
        serversList.innerHTML = '<div class="text-center text-danger py-5">Failed to load servers</div>';
        addLog('error', 'Failed to load servers: ' + error.message);
    }
}

// Load Users
async function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-arrow-repeat spin me-2"></i>Loading users...</div>';
    
    try {
        const response = await fetch(`${API.domain}/api/application/users`, { headers });
        const data = await response.json();
        
        if (data.data.length === 0) {
            usersList.innerHTML = '<div class="text-center text-muted py-5">No users found</div>';
            return;
        }
        
        let html = '';
        data.data.forEach(user => {
            const attr = user.attributes;
            html += `
                <div class="server-item">
                    <div class="d-flex justify-content-between">
                        <h6><i class="bi bi-person me-2"></i>${attr.username}</h6>
                        <span class="badge ${attr.root_admin ? 'bg-primary' : 'bg-secondary'}">
                            ${attr.root_admin ? 'Admin' : 'User'}
                        </span>
                    </div>
                    <p class="mb-1 small">Email: ${attr.email}</p>
                    <p class="mb-0 small">ID: ${attr.id} | Created: ${new Date(attr.created_at).toLocaleDateString()}</p>
                </div>
            `;
        });
        
        usersList.innerHTML = html;
        addLog('info', `Loaded ${data.data.length} users`);
        
    } catch (error) {
        usersList.innerHTML = '<div class="text-center text-danger py-5">Failed to load users</div>';
        addLog('error', 'Failed to load users: ' + error.message);
    }
}

// View Server Details
async function viewServer(serverId) {
    try {
        const response = await fetch(`${API.domain}/api/application/servers/${serverId}`, { headers });
        const data = await response.json();
        const server = data.attributes;
        
        const modalBody = document.getElementById('serverModalBody');
        modalBody.innerHTML = `
            <div class="mb-3">
                <h6>Server Information</h6>
                <p><strong>Name:</strong> ${server.name}</p>
                <p><strong>ID:</strong> ${server.id}</p>
                <p><strong>Identifier:</strong> ${server.identifier}</p>
                <p><strong>UUID:</strong> ${server.uuid}</p>
            </div>
            
            <div class="mb-3">
                <h6>Resource Limits</h6>
                <p><strong>Memory:</strong> ${server.limits.memory} MB</p>
                <p><strong>Disk:</strong> ${server.limits.disk} MB</p>
                <p><strong>CPU:</strong> ${server.limits.cpu}%</p>
            </div>
            
            <div class="mb-3">
                <h6>Status</h6>
                <p><strong>State:</strong> <span class="badge ${server.suspended ? 'bg-warning' : 'bg-success'}">${server.suspended ? 'Suspended' : 'Active'}</span></p>
                <p><strong>Node:</strong> ${server.node}</p>
            </div>
        `;
        
        currentServerId = serverId;
        
        const modal = new bootstrap.Modal(document.getElementById('serverModal'));
        modal.show();
        
    } catch (error) {
        addLog('error', 'Failed to load server details: ' + error.message);
    }
}

// Server Control Functions
async function startServer() {
    if (!currentServerId) return;
    
    try {
        const response = await fetch(`${API.domain}/api/client/servers/${currentServerId}/power`, {
            method: 'POST',
            headers: clientHeaders,
            body: JSON.stringify({ signal: 'start' })
        });
        
        if (response.ok) {
            addLog('success', `Server ${currentServerId} started`);
            showNotification('Server started successfully');
        }
    } catch (error) {
        addLog('error', 'Failed to start server: ' + error.message);
    }
}

async function stopServer() {
    if (!currentServerId) return;
    
    try {
        const response = await fetch(`${API.domain}/api/client/servers/${currentServerId}/power`, {
            method: 'POST',
            headers: clientHeaders,
            body: JSON.stringify({ signal: 'stop' })
        });
        
        if (response.ok) {
            addLog('success', `Server ${currentServerId} stopped`);
            showNotification('Server stopped successfully');
        }
    } catch (error) {
        addLog('error', 'Failed to stop server: ' + error.message);
    }
}

async function restartServer() {
    if (!currentServerId) return;
    
    try {
        const response = await fetch(`${API.domain}/api/client/servers/${currentServerId}/power`, {
            method: 'POST',
            headers: clientHeaders,
            body: JSON.stringify({ signal: 'restart' })
        });
        
        if (response.ok) {
            addLog('success', `Server ${currentServerId} restarted`);
            showNotification('Server restarted successfully');
        }
    } catch (error) {
        addLog('error', 'Failed to restart server: ' + error.message);
    }
}

// Add Log Entry
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
    const resultText = document.getElementById('resultDetails').innerText;
    navigator.clipboard.writeText(resultText).then(() => {
        showNotification('Copied to clipboard!');
    });
}

// Show Notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        <i class="bi bi-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// View Server Details from Result
function viewServerDetails() {
    if (currentServerId) {
        viewServer(currentServerId);
    }
}

// Load initial data when tabs are clicked
document.getElementById('pills-servers-tab').addEventListener('click', loadServers);
document.getElementById('pills-users-tab').addEventListener('click', loadUsers);
