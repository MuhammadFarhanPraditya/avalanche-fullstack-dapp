const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const addressEl = document.getElementById("address");
const networkEl = document.getElementById("network");
const balanceEl = document.getElementById("balance");
const errorMessageEl = document.getElementById("errorMessage");

// Avalanche Fuji Testnet
const AVALANCHE_FUJI_CHAIN_ID = "0xa869"; // Hex for 43113
const AVALANCHE_FUJI_NAME = "Avalanche Fuji Testnet";

let isConnected = false;
let currentAddress = "";

// Function to shorten address
function shortenAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Function to format AVAX balance - FIXED VERSION
function formatAvaxBalance(balanceWei) {
    console.log("Raw balance hex:", balanceWei);
    
    try {
        // Remove '0x' prefix if exists and handle empty/zero
        if (!balanceWei || balanceWei === '0x' || balanceWei === '0x0') {
            return "0.0000";
        }
        
        // Convert hex string to BigInt
        const balanceBigInt = BigInt(balanceWei);
        console.log("Balance as BigInt:", balanceBigInt.toString());
        
        // Convert from wei to AVAX (divide by 10^18)
        const balanceInAvax = Number(balanceBigInt) / 1000000000000000000;
        console.log("Balance in AVAX:", balanceInAvax);
        
        return balanceInAvax.toFixed(4);
    } catch (error) {
        console.error("Error formatting balance:", error, "Input:", balanceWei);
        return "Error";
    }
}

// Function to show error message
function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.classList.add("show");
    setTimeout(() => hideError(), 5000);
}

function hideError() {
    errorMessageEl.classList.remove("show");
}

function disableConnectButton() {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connected";
    isConnected = true;
}

function enableConnectButton() {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
    isConnected = false;
}

function resetUI() {
    statusEl.textContent = "Not Connected";
    statusEl.style.color = "#ffffff";
    addressEl.textContent = "-";
    networkEl.textContent = "-";
    balanceEl.textContent = "-";
    enableConnectButton();
}

function updateAccount(address) {
    currentAddress = address;
    const shortAddress = shortenAddress(address);
    addressEl.innerHTML = `${shortAddress} <br><span style="font-size: 10px; opacity: 0.7;">${address}</span>`;
}

async function updateNetworkAndBalance(address) {
    console.log("=== updateNetworkAndBalance called ===");
    console.log("Address:", address);
    
    try {
        // Get chainId
        const chainId = await window.ethereum.request({
            method: "eth_chainId",
        });

        console.log("Current chainId:", chainId);
        console.log("Expected chainId:", AVALANCHE_FUJI_CHAIN_ID);

        if (chainId === AVALANCHE_FUJI_CHAIN_ID) {
            networkEl.textContent = AVALANCHE_FUJI_NAME;
            statusEl.textContent = "Connected ✅";
            statusEl.style.color = "#4cd137";

            // Get AVAX balance with error handling
            try {
                console.log("Fetching balance for address:", address);
                
                const balanceWei = await window.ethereum.request({
                    method: "eth_getBalance",
                    params: [address, "latest"],
                });

                console.log("Balance response (hex):", balanceWei);
                
                const formattedBalance = formatAvaxBalance(balanceWei);
                console.log("Formatted balance:", formattedBalance);
                
                balanceEl.textContent = formattedBalance;
                
                // Jika balance 0, tampilkan pesan
                if (formattedBalance === "0.0000") {
                    console.log("Balance is zero, consider using faucet");
                    // Tidak perlu show error, hanya log saja
                }
                
            } catch (balanceError) {
                console.error("Balance fetch error:", balanceError);
                balanceEl.textContent = "Error";
                showError("Failed to fetch balance: " + balanceError.message);
            }
        } else {
            // Wrong network
            networkEl.textContent = `Wrong Network (${chainId})`;
            statusEl.textContent = "Please switch to Avalanche Fuji";
            statusEl.style.color = "#fbc531";
            balanceEl.textContent = "-";
            
            // Show helpful error based on chainId
            let chainName = "Unknown Network";
            if (chainId === "0x1") chainName = "Ethereum Mainnet";
            else if (chainId === "0x38") chainName = "BNB Smart Chain";
            else if (chainId === "0x89") chainName = "Polygon Mainnet";
            else if (chainId === "0xa86a") chainName = "Avalanche Mainnet";
            
            showError(`Connected to ${chainName}. Please switch to ${AVALANCHE_FUJI_NAME}`);
        }
    } catch (error) {
        console.error("Network/balance update error:", error);
        showError("Network error: " + error.message);
    }
}

async function connectWallet() {
    console.log("=== connectWallet START ===");
    
    if (typeof window.ethereum === "undefined") {
        showError("Core Wallet not detected. Please install Core Wallet.");
        return;
    }

    try {
        hideError();
        statusEl.textContent = "Connecting...";
        
        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });

        console.log("Accounts received:", accounts);
        
        if (accounts.length === 0) {
            throw new Error("No accounts found");
        }

        const address = accounts[0];
        console.log("Selected address:", address);
        
        updateAccount(address);
        disableConnectButton();
        
        // Small delay to ensure wallet is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await updateNetworkAndBalance(address);
        
        console.log("=== connectWallet SUCCESS ===");
        
    } catch (error) {
        console.error("Connection error:", error);
        statusEl.textContent = "Connection Failed ❌";
        statusEl.style.color = "#e84142";
        
        let errorMsg = "Failed to connect wallet";
        if (error.code === 4001) {
            errorMsg = "Connection rejected by user";
        }
        
        showError(errorMsg);
        enableConnectButton();
    }
}

function disconnectWallet() {
    console.log("Disconnecting wallet...");
    resetUI();
    hideError();
}

// Enhanced event listeners with debugging
function setupEventListeners() {
    if (typeof window.ethereum === "undefined") {
        console.warn("Ethereum provider not available for event listeners");
        return;
    }

    console.log("Setting up event listeners...");

    // Accounts changed
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log("accountsChanged event fired:", accounts);
        
        if (accounts.length === 0) {
            showError("Wallet disconnected");
            disconnectWallet();
        } else {
            const newAddress = accounts[0];
            console.log("New address:", newAddress);
            
            if (newAddress !== currentAddress) {
                updateAccount(newAddress);
                updateNetworkAndBalance(newAddress);
                showError("Account changed");
            }
        }
    });

    // Chain changed
    window.ethereum.on('chainChanged', (chainId) => {
        console.log("chainChanged event fired:", chainId);
        
        // Reload page for chain change (standard practice)
        console.log("Reloading page due to chain change...");
        window.location.reload();
    });

    // Connect event
    window.ethereum.on('connect', (connectInfo) => {
        console.log("Wallet connected:", connectInfo);
    });

    // Disconnect event
    window.ethereum.on('disconnect', (error) => {
        console.log("Wallet disconnected:", error);
        showError("Wallet disconnected");
        disconnectWallet();
    });
}

// Auto-connect on page load
window.addEventListener('load', async () => {
    console.log("Page loaded, checking wallet connection...");
    
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Check if already connected
            const accounts = await window.ethereum.request({
                method: "eth_accounts"
            });
            
            console.log("Auto-connect accounts:", accounts);
            
            if (accounts.length > 0) {
                const address = accounts[0];
                console.log("Auto-connecting to:", address);
                updateAccount(address);
                disableConnectButton();
                await updateNetworkAndBalance(address);
            }
        } catch (error) {
            console.error("Auto-connect error:", error);
        }
        
        setupEventListeners();
    }
});

// Connect button event
connectBtn.addEventListener("click", connectWallet);

// Debug helper: Add manual refresh button in console
console.log("Debug helpers available:");
console.log("- Type 'refreshBalance()' to manually refresh balance");
console.log("- Type 'checkConnection()' to check current state");

window.refreshBalance = async function() {
    if (currentAddress) {
        console.log("Manually refreshing balance for:", currentAddress);
        await updateNetworkAndBalance(currentAddress);
    } else {
        console.log("No address connected");
    }
};

window.checkConnection = function() {
    console.log("=== Connection Status ===");
    console.log("isConnected:", isConnected);
    console.log("currentAddress:", currentAddress);
    console.log("window.ethereum:", typeof window.ethereum !== "undefined");
    
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_chainId' })
            .then(chainId => console.log("Current chainId:", chainId))
            .catch(err => console.error("ChainId error:", err));
    }
};