import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AlertesStock.module.css';

interface Alerte {
  ID_PRODUIT: number;
  NOM_PRODUIT: string;
  CATEGORIE: string;
  STOCK_RESTANT: number;
  PRIX_UNITAIRE: number;
  DATE_EXPIRATION: string;
  MESSAGE: string;
}

interface Stats {
  TOTAL: number;
  RUPTURE: number;
  CRITIQUE: number;
  FAIBLE: number;
}

const AlertesStock = () => {
  const navigate = useNavigate();
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [stats, setStats] = useState<Stats>({ TOTAL: 0, RUPTURE: 0, CRITIQUE: 0, FAIBLE: 0 });
  const [loading, setLoading] = useState(true);
  const [seuil, setSeuil] = useState<number>(10);
  const [seuilTemp, setSeuilTemp] = useState<number>(10);
  const [showSeuilModal, setShowSeuilModal] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Vérification stricte du rôle PHARMACIEN
  useEffect(() => {
    if (!token || user.role !== 'PHARMACIEN') {
      alert('❌ Accès refusé : Cette page est réservée au Pharmacien uniquement.');
      navigate('/dashboard');
      return;
    }
    loadAlertes();
    loadStats();
  }, []);

  const loadAlertes = async (customSeuil?: number) => {
    setLoading(true);
    try {
      const seuilToUse = customSeuil !== undefined ? customSeuil : seuil;
      const url = `${API_BASE_URL}/api/alertes-stock/seuil/${seuilToUse}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        // Filtrer pour être sûr qu'on n'affiche que les produits réels
        const alertesValides = data.alertes.filter((a: Alerte) => 
          a.NOM_PRODUIT && a.NOM_PRODUIT.trim() !== ''
        );
        setAlertes(alertesValides);
      } else {
        console.error('Erreur chargement alertes:', data.message);
        setAlertes([]);
      }
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
      setAlertes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('${API_BASE_URL}/api/alertes-stock/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleChangeSeuil = () => {
    setSeuil(seuilTemp);
    setShowSeuilModal(false);
    loadAlertes(seuilTemp);
  };

  const handleRefresh = () => {
    loadAlertes();
    loadStats();
  };

  const getGraviteBadge = (stock: number) => {
    if (stock === 0) return { text: 'RUPTURE', className: styles.badgeRupture };
    if (stock <= 5) return { text: 'CRITIQUE', className: styles.badgeCritique };
    if (stock <= 10) return { text: 'FAIBLE', className: styles.badgeFaible };
    return { text: 'NORMAL', className: styles.badgeNormal };
  };

  const alertesRupture = alertes.filter(a => a.STOCK_RESTANT === 0);
  const alertesCritiques = alertes.filter(a => a.STOCK_RESTANT > 0 && a.STOCK_RESTANT <= 5);
  const alertesFaibles = alertes.filter(a => a.STOCK_RESTANT > 5 && a.STOCK_RESTANT <= seuil);

  if (loading) {
    return <div className={styles.loading}>Chargement des alertes stock...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>⚠️ Alertes Stock</h1>
          <p className={styles.subtitle}>
            {user.username} • {user.role} • Seuil: {seuil} unités
          </p>
        </div>
        <button onClick={handleRefresh} className={styles.addBtn}>
          🔄 Actualiser
        </button>
        <button onClick={() => setShowSeuilModal(true)} className={styles.addBtn}>
          ⚙️ Seuil
        </button>
      </header>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔴</div>
          <div>
            <div className={styles.statValue}>{stats.RUPTURE}</div>
            <div className={styles.statLabel}>Rupture</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🟠</div>
          <div>
            <div className={styles.statValue}>{stats.CRITIQUE}</div>
            <div className={styles.statLabel}>Critique</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🟡</div>
          <div>
            <div className={styles.statValue}>{stats.FAIBLE}</div>
            <div className={styles.statLabel}>Faible</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div>
            <div className={styles.statValue}>{stats.TOTAL}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
        </div>
      </div>

      {/* Section Rupture de Stock */}
      {alertesRupture.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🔴 RUPTURE DE STOCK - URGENT ({alertesRupture.length})
          </h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Prix</th>
                  <th>Expiration</th>
                  <th>Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alertesRupture.map(alerte => {
                  const gravite = getGraviteBadge(alerte.STOCK_RESTANT);
                  return (
                    <tr key={alerte.ID_PRODUIT}>
                      <td><strong>#{alerte.ID_PRODUIT}</strong></td>
                      <td><strong>{alerte.NOM_PRODUIT}</strong></td>
                      <td>{alerte.CATEGORIE}</td>
                      <td>
                        <span className={gravite.className}>
                          {alerte.STOCK_RESTANT}
                        </span>
                      </td>
                      <td>{alerte.PRIX_UNITAIRE} DH</td>
                      <td>{new Date(alerte.DATE_EXPIRATION).toLocaleDateString('fr-FR')}</td>
                      <td className={styles.messageUrgent}>{alerte.MESSAGE}</td>
                      <td>
                        <button
                          onClick={() => navigate('/produits')}
                          className={styles.btnView}
                          title="Gérer ce produit"
                        >
                          📦 Gérer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section Stock Critique */}
      {alertesCritiques.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🟠 STOCK CRITIQUE ({alertesCritiques.length})
          </h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Prix</th>
                  <th>Expiration</th>
                  <th>Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alertesCritiques.map(alerte => {
                  const gravite = getGraviteBadge(alerte.STOCK_RESTANT);
                  return (
                    <tr key={alerte.ID_PRODUIT}>
                      <td><strong>#{alerte.ID_PRODUIT}</strong></td>
                      <td><strong>{alerte.NOM_PRODUIT}</strong></td>
                      <td>{alerte.CATEGORIE}</td>
                      <td>
                        <span className={gravite.className}>
                          {alerte.STOCK_RESTANT}
                        </span>
                      </td>
                      <td>{alerte.PRIX_UNITAIRE} DH</td>
                      <td>{new Date(alerte.DATE_EXPIRATION).toLocaleDateString('fr-FR')}</td>
                      <td>{alerte.MESSAGE}</td>
                      <td>
                        <button
                          onClick={() => navigate('/produits')}
                          className={styles.btnView}
                          title="Gérer ce produit"
                        >
                          📦 Gérer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section Stock Faible */}
      {alertesFaibles.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🟡 STOCK FAIBLE ({alertesFaibles.length})
          </h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Prix</th>
                  <th>Expiration</th>
                  <th>Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alertesFaibles.map(alerte => {
                  const gravite = getGraviteBadge(alerte.STOCK_RESTANT);
                  return (
                    <tr key={alerte.ID_PRODUIT}>
                      <td><strong>#{alerte.ID_PRODUIT}</strong></td>
                      <td><strong>{alerte.NOM_PRODUIT}</strong></td>
                      <td>{alerte.CATEGORIE}</td>
                      <td>
                        <span className={gravite.className}>
                          {alerte.STOCK_RESTANT}
                        </span>
                      </td>
                      <td>{alerte.PRIX_UNITAIRE} DH</td>
                      <td>{new Date(alerte.DATE_EXPIRATION).toLocaleDateString('fr-FR')}</td>
                      <td>{alerte.MESSAGE}</td>
                      <td>
                        <button
                          onClick={() => navigate('/produits')}
                          className={styles.btnView}
                          title="Gérer ce produit"
                        >
                          📦 Gérer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message si aucune alerte */}
      {alertes.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3>Aucune alerte stock</h3>
          <p>Tous les produits ont un stock suffisant (supérieur à {seuil} unités).</p>
        </div>
      )}

      {/* Modal Changement de Seuil */}
      {showSeuilModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSeuilModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>⚙️ Configurer le seuil de surveillance</h2>
            
            <div className={styles.formGroup}>
              <label>Seuil de stock minimum *</label>
              <input
                type="number"
                min="1"
                value={seuilTemp}
                onChange={(e) => setSeuilTemp(parseInt(e.target.value) || 10)}
                className={styles.input}
                placeholder="Ex: 10"
              />
              <small style={{ color: '#64748b', fontSize: '13px' }}>
                Les produits avec un stock ≤ {seuilTemp} unités seront affichés
              </small>
            </div>

            <div className={styles.formActions}>
              <button 
                onClick={() => setShowSeuilModal(false)} 
                className={styles.btnCancel}
              >
                Annuler
              </button>
              <button 
                onClick={handleChangeSeuil} 
                className={styles.btnSubmit}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertesStock;