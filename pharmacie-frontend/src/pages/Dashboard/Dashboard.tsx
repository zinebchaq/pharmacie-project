import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

interface User {
  id: number;
  username: string;
  role: 'PHARMACIEN' | 'VENDEUR' | 'COMPTABLE';
}

interface Stats {
  produits?: any;
  commandes?: any;
  clients?: any;
  commandesJour?: number;
  alertesStock?: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [produitsAlerte, setProduitsAlerte] = useState<any[]>([]);
  const [commandesRecentes, setCommandesRecentes] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/');
      return;
    }

    setUser(JSON.parse(userData));
    loadDashboardData(token);
  }, [navigate]);

  const loadDashboardData = async (token: string) => {
    try {
      const statsResponse = await fetch('http://localhost:3000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      const produitsResponse = await fetch('http://localhost:3000/api/dashboard/produits-alerte', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const produitsData = await produitsResponse.json();
      if (produitsData.success) {
        setProduitsAlerte(produitsData.produits);
      }

      const commandesResponse = await fetch('http://localhost:3000/api/dashboard/commandes-recentes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const commandesData = await commandesResponse.json();
      if (commandesData.success) {
        setCommandesRecentes(commandesData.commandes);
      }

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.dashboard}>
      {/* Header Moderne */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.brandLogo}>🏥</div>
            <div>
              <h1 className={styles.title}>PharmaCare</h1>
              <p className={styles.subtitle}>
                {user.username}
                <span className={styles.roleBadge}>{user.role}</span>
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </header>

      <div className={styles.container}>
        {/* Stats Cards Modernes */}
        <div className={styles.statsGrid}>
          {(user.role === 'PHARMACIEN' || user.role === 'VENDEUR') && (
            <StatCard
              icon="💊"
              title="Produits"
              value={stats.produits?.TOTAL || 0}
              subtitle={`${stats.produits?.DISPONIBLES || 0} disponibles`}
              trend={`${stats.produits?.RUPTURE || 0} en rupture`}
            />
          )}

          {(user.role === 'PHARMACIEN' || user.role === 'VENDEUR') && stats.clients && (
            <StatCard
              icon="👥"
              title="Clients"
              value={stats.clients.TOTAL || 0}
              subtitle="Clients actifs"
            />
          )}

          <StatCard
            icon="📦"
            title="Commandes"
            value={stats.commandes?.TOTAL || 0}
            subtitle={`${stats.commandes?.EN_COURS || 0} en cours`}
            trend={`${stats.commandes?.TERMINEES || 0} terminées`}
          />

          {(user.role === 'PHARMACIEN' || user.role === 'VENDEUR') && (
            <StatCard
              icon="📋"
              title="Aujourd'hui"
              value={stats.commandesJour || 0}
              subtitle="Commandes du jour"
            />
          )}

          {user.role === 'PHARMACIEN' && (
            <StatCard
              icon="⚠️"
              title="Alertes"
              value={stats.alertesStock || 0}
              subtitle="Produits à surveiller"
            />
          )}
        </div>

        {/* Info Box Comptable */}
        {user.role === 'COMPTABLE' && (
          <div className={styles.infoBox}>
            <span>💡</span>
            <div>
              <strong>Espace Comptable</strong>
              <p>Consultez les revenus et paiements dans la section dédiée</p>
            </div>
          </div>
        )}

        {/* Actions Rapides */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ Actions rapides</h2>
          <div className={styles.actionsGrid}>
            {user.role === 'PHARMACIEN' && (
              <>
                <ActionCard icon="💊" title="Produits" onClick={() => navigate('/produits')} />
                <ActionCard icon="🏢" title="Fournisseurs" onClick={() => navigate('/fournisseurs')} />
                <ActionCard icon="👥" title="Clients" onClick={() => navigate('/clients')} />
                <ActionCard icon="📦" title="Commandes" onClick={() => navigate('/commandes')} />
                <ActionCard icon="💳" title="Paiements" onClick={() => navigate('/paiements')} />
                <ActionCard icon="⚠️" title="Alertes" onClick={() => navigate('/alertes')} />
                <ActionCard icon="📚" title="Archives" onClick={() => navigate('/archives')} />
              </>
            )}

            {user.role === 'VENDEUR' && (
              <>
                <ActionCard icon="📦" title="Commandes" onClick={() => navigate('/commandes')} />
                <ActionCard icon="💊" title="Produits" onClick={() => navigate('/produits')} />
                <ActionCard icon="👥" title="Clients" onClick={() => navigate('/clients')} />
                <ActionCard icon="💳" title="Paiements" onClick={() => navigate('/paiements')} />
              </>
            )}

            {user.role === 'COMPTABLE' && (
              <>
                <ActionCard icon="💳" title="Paiements" onClick={() => navigate('/paiements')} />
                <ActionCard icon="📦" title="Commandes" onClick={() => navigate('/commandes')} />
                <ActionCard icon="📚" title="Archives" onClick={() => navigate('/archives')} />
              </>
            )}
          </div>
        </section>

        {/* Produits en Alerte */}
        {produitsAlerte.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              ⚠️ Produits nécessitant attention ({produitsAlerte.length})
            </h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Stock</th>
                    <th>Expiration</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {produitsAlerte.map((prod, index) => (
                    <tr key={index}>
                      <td><strong>{prod.NOM}</strong></td>
                      <td>{prod.CATEGORIE}</td>
                      <td>
                        <span className={prod.STOCK < 5 ? styles.stockCritique : styles.stockFaible}>
                          {prod.STOCK}
                        </span>
                      </td>
                      <td>{new Date(prod.DATE_EXPIRATION).toLocaleDateString('fr-FR')}</td>
                      <td>
                        {prod.STOCK < 10 && <span className={styles.badge}>Stock faible</span>}
                        {new Date(prod.DATE_EXPIRATION) < new Date() && (
                          <span className={styles.badgeDanger}>Périmé</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Commandes Récentes */}
        {commandesRecentes.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📋 Commandes récentes</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>N° Commande</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {commandesRecentes.map((cmd) => (
                    <tr key={cmd.ID_COMMANDE}>
                      <td><strong>#{cmd.ID_COMMANDE}</strong></td>
                      <td>{cmd.CLIENT_NOM}</td>
                      <td>{new Date(cmd.DATE_COMMANDE).toLocaleDateString('fr-FR')}</td>
                      <td><strong>{cmd.MONTANT_TOTAL} DH</strong></td>
                      <td>
                        <span className={styles[`status${cmd.STATUT}`]}>
                          {cmd.STATUT === 'en_cours' ? 'En cours' : 
                           cmd.STATUT === 'terminee' ? 'Terminée' : 
                           'Annulée'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// Composant StatCard Moderne
const StatCard = ({ icon, title, value, subtitle, trend }: any) => (
  <div className={styles.statCard}>
    <div className={styles.statHeader}>
      <div className={styles.statIcon}>{icon}</div>
    </div>
    <div className={styles.statContent}>
      <div className={styles.statTitle}>{title}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSubtitle}>{subtitle}</div>
      {trend && <div className={styles.statTrend}>• {trend}</div>}
    </div>
  </div>
);

// Composant ActionCard
const ActionCard = ({ icon, title, onClick }: any) => (
  <button className={styles.actionCard} onClick={onClick}>
    <div className={styles.actionIcon}>{icon}</div>
    <div className={styles.actionTitle}>{title}</div>
  </button>
);

export default Dashboard;