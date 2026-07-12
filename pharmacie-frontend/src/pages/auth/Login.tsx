import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/api";
import styles from "./Login.module.css";
import pharmacyVideo from "./video.mp4"; 

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Envoi de la requête...'); // DEBUG
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('📡 Réponse reçue:', response.status); // DEBUG

      const data = await response.json();
      console.log('📦 Données:', data); // DEBUG

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ Connexion réussie !'); // DEBUG
        navigate('/dashboard');
      } else {
        setError(data.message || "Identifiants incorrects");
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      setError("Erreur de connexion. Vérifiez que le backend tourne sur le port 3000.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Vidéo en background */}
      <video autoPlay loop muted playsInline className={styles.bgVideo}>
        <source src={pharmacyVideo} type="video/mp4" />
      </video>
      
      {/* Overlay pour éclaircir */}
      <div className={styles.videoOverlay}></div>

      {/* Formulaire centré */}
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Bienvenue</h2>
          <p className={styles.formSubtitle}>
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Nom d'utilisateur</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}></span>
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Mot de passe</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}></span>
              <input
                type="password"
                placeholder="Entrer le mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                disabled={isLoading}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? " Connexion en cours..." : " Se connecter"}
          </button>

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              <strong>💡 se connecter selon role</strong>
            </p>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.footerText}>© 2026 PharmaCare</p>
      </div>
    </div>
  );
};

export default Login;