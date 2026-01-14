const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const addressEl = document.getElementById("address");
const networkEl = document.getElementById("network");
const balanceEl = document.getElementById("balance");
const errorMessageEl = document.getElementById("errorMessage");

// Avalanche Fuji Testnet chainId (hex)
const AVALANCHE_FUJI_CHAIN_ID = "0xa869";
const AVALANCHE_FUJI_NAME = "Avalanche Fuji Testnet";

let isConnected = false;
let currentAddress = "";

// Function to shorten address (Task 4.2)
function shortenAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Function to format AVAX balance
function formatAvaxBalance(balanceWei) {
    const balance = parseInt(balanceWei, 16);
    return (balance / 1e18).toFixed(4);
}

// Function to show error message (Task 4.4)
function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.classList.add("show");
    
    // Auto hide error after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Function to hide error message
function hideError() {
    errorMessageEl.classList.remove("show");
}

// Function to disable button after connect (Task 4.1)
function disableConnectButton() {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connected";
    isConnected = true;
}

// Function to enable connect button
function enableConnectButton() {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
    isConnected = false;
}

// Function to reset UI
function resetUI() {
    statusEl.textContent = "Not Connected";
    statusEl.style.color = "#ffffff";
    addressEl.textContent = "-";
    networkEl.textContent = "-";
    balanceEl.textContent = "-";
    enableConnectButton();
}

// Function to update account information
function updateAccount(address) {
    currentAddress = address;
    const shortAddress = shortenAddress(address);
    addressEl.innerHTML = `${shortAddress} <br><span style="font-size: 10px; opacity: 0.7;">${address}</span>`;
}

// Function to update network and balance
async function updateNetworkAndBalance(address) {
    try {
        // Get chainId
        const chainId = await window.ethereum.request({
            method: "eth_chainId",
        });

        console.log({ chainId });

        if (chainId === AVALANCHE_FUJI_CHAIN_ID) {
            networkEl.textContent = AVALANCHE_FUJI_NAME;
            statusEl.textContent = "Connected ✅";
            statusEl.style.color = "#4cd137";

            // Get AVAX balance
            const balanceWei = await window.ethereum.request({
                method: "eth_getBalance",
                params: [address, "latest"],
            });

            console.log({ balanceWei });

            balanceEl.textContent = formatAvaxBalance(balanceWei);
        } else {
            networkEl.textContent = "Wrong Network ❌";
            statusEl.textContent = "Please switch to Avalanche Fuji";
            statusEl.style.color = "#fbc531";
            balanceEl.textContent = "-";
            showError(`Please switch to ${AVALANCHE_FUJI_NAME}`);
        }
    } catch (error) {
        console.error("Error updating network/balance:", error);
        showError("Failed to get network information");
    }
}

// Main connect wallet function
async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        showError("Core Wallet tidak terdeteksi. Silakan install Core Wallet.");
        return;
    }

    console.log("window.ethereum", window.ethereum);

    try {
        hideError(); // Hide any previous errors
        statusEl.textContent = "Connecting...";

        // Request wallet accounts
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });

        if (accounts.length === 0) {
            throw new Error("No accounts found");
        }

        const address = accounts[0];
        updateAccount(address);
        
        // Disable button after successful connection (Task 4.1)
        disableConnectButton();
        
        // Update network and balance
        await updateNetworkAndBalance(address);
        
    } catch (error) {
        console.error("Connection error:", error);
        statusEl.textContent = "Connection Failed ❌";
        statusEl.style.color = "#e84142";
        
        let errorMsg = "Failed to connect wallet";
        if (error.code === 4001) {
            errorMsg = "Connection rejected by user";
        } else if (error.message.includes("No accounts")) {
            errorMsg = "No accounts found in wallet";
        }
        
        showError(errorMsg);
        enableConnectButton(); // Re-enable button on error
    }
}

// Function to disconnect wallet (for accountsChanged event)
function disconnectWallet() {
    resetUI();
    hideError();
}

// Event Listeners (Task 4.3)
function setupEventListeners() {
    if (typeof window.ethereum === "undefined") return;

    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log("Accounts changed:", accounts);
        
        if (accounts.length === 0) {
            // User disconnected wallet
            showError("Wallet disconnected");
            disconnectWallet();
        } else {
            // User switched account
            const newAddress = accounts[0];
            if (newAddress !== currentAddress) {
                updateAccount(newAddress);
                updateNetworkAndBalance(newAddress);
                showError("Account changed to: " + shortenAddress(newAddress));
            }
        }
    });

    // Listen for chain changes
    window.ethereum.on('chainChanged', (chainId) => {
        console.log("Chain changed:", chainId);
        
        if (isConnected && currentAddress) {
            // Update UI with new chain info
            if (chainId === AVALANCHE_FUJI_CHAIN_ID) {
                updateNetworkAndBalance(currentAddress);
                hideError();
            } else {
                networkEl.textContent = "Wrong Network ❌";
                statusEl.textContent = "Please switch to Avalanche Fuji";
                statusEl.style.color = "#fbc531";
                balanceEl.textContent = "-";
                showError(`Network changed. Please switch to ${AVALANCHE_FUJI_NAME}`);
            }
        }
    });

    // Optional: Listen for disconnect
    window.ethereum.on('disconnect', (error) => {
        console.log("Wallet disconnected:", error);
        showError("Wallet disconnected: " + error.message);
        disconnectWallet();
    });
}

// Initialize event listeners on page load
window.addEventListener('load', () => {
    // Check if already connected on page load
    if (typeof window.ethereum !== 'undefined' && window.ethereum.selectedAddress) {
        const address = window.ethereum.selectedAddress;
        updateAccount(address);
        disableConnectButton();
        updateNetworkAndBalance(address);
    }
    
    setupEventListeners();
});

// Connect button event listener
connectBtn.addEventListener("click", connectWallet);