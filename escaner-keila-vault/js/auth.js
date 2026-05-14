// js/auth.js

// Configuración de Firebase (REEMPLAZA CON TUS DATOS REALES SI CAMBIAN)
const firebaseConfig = {
    apiKey: "AIzaSyBqDz6cX9yJzZ5vZ8wX7yW6vU5tS4rQ3pO", // Ejemplo: pon tus claves reales aquí si son diferentes
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase (solo si no está ya inicializado)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Estado de la aplicación
let currentUser = null;
let isDemoMode = false;

// Objeto App definido AQUÍ para que esté disponible antes de cualquier callback
const App = {
    initializeAfterLogin: function() {
        console.log("Iniciando aplicación completa...");
        // Ocultar login y mostrar dashboard
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        
        // Iniciar componentes
        if (typeof MapManager !== 'undefined') MapManager.init();
        if (typeof DocumentScanner !== 'undefined') DocumentScanner.init();
        if (typeof FileManager !== 'undefined') FileManager.loadDocuments();
        
        this.updateUserInfo();
    },

    updateUserInfo: function() {
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        
        if (isDemoMode) {
            if(userNameElement) userNameElement.textContent = "Usuario Demo";
            if(userEmailElement) userEmailElement.textContent = "demo@ejemplo.com";
        } else if (currentUser) {
            if(userNameElement) userNameElement.textContent = currentUser.displayName || "Usuario";
            if(userEmailElement) userEmailElement.textContent = currentUser.email;
        }
    },

    logout: function() {
        if (isDemoMode) {
            isDemoMode = false;
            currentUser = null;
            location.reload();
            return;
        }

        firebase.auth().signOut().then(() => {
            currentUser = null;
            location.reload();
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión: " + error.message);
        });
    }
};

// Funciones de Autenticación
function checkAuthState() {
    // Escuchar cambios en la autenticación
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log("Usuario logueado:", user.email);
            App.initializeAfterLogin();
        } else {
            console.log("No hay sesión activa");
            currentUser = null;
            isDemoMode = false;
            // Mostrar solo el login, ocultar todo lo demás
            document.getElementById('loginModal').classList.remove('hidden');
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        }
    });
}

// Login con Google
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Login Google exitoso");
            // El onAuthStateChanged se encargará de iniciar la app
        }).catch((error) => {
            console.error("Error Google Login:", error);
            alert("Error al iniciar con Google: " + error.message);
        });
}

// Callback para el botón de Google (One Tap o personalizado)
function handleGoogleCredential(response) {
    // Si usas el nuevo SDK de One Tap, esto procesa el token
    // Para popup tradicional, no suele ser necesario si usas signInWithPopup
    console.log("Token Google recibido:", response);
}

// Modo Demo
function loginDemo() {
    isDemoMode = true;
    currentUser = {
        displayName: "Usuario Demo",
        email: "demo@tecnm.mx"
    };
    console.log("Entrando en modo demo");
    App.initializeAfterLogin();
}

// Inicializar listeners cuando carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay sesión guardada
    checkAuthState();

    // Botón Login Google
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', signInWithGoogle);
    }

    // Botón Modo Demo
    const demoBtn = document.getElementById('demoLoginBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', loginDemo);
    }

    // Botón Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => App.logout());
    }
    
    // Asegurar que el modal de login esté visible al inicio si no hay sesión
    // (El onAuthStateChanged lo ajustará si hay usuario)
    setTimeout(() => {
        if (!currentUser && !isDemoMode) {
            document.getElementById('loginModal').classList.remove('hidden');
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        }
    }, 100);
});
