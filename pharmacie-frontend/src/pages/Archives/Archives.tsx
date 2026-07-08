import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Archives.module.css';

interface Archive {
  id: number;
  [key: string]: any;
}

interface Stats {
  produits: number;
  clients: number;
  commandes: number;
}

const Archives = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'produits' | 'clients' | 'commandes'>('produits');
  const [produits, setProduits] = useState<Archive[]>([]);
  const [clients, setClients] = useState<Archive[]>([]);
  const [commandes, setCommandes] = useState<Archive[]>([]);
  const [stats, setStats] = useState<Stats>({ produits: 0, clients: 0, commandes: 0 });
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canArchive: false,
    canDelete: false
  });
  const [searchTerm, setSearchTerm] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // Vérifier si le vendeur tente d'accéder
    if (user.role === 'VENDEUR') {
      alert('Accès refusé. Les vendeurs ne peuvent pas accéder aux archives.');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Charger stats
      const statsRes = await fetch('http://localhost:3000/api/archives/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      
      if (statsData.success) {
        setStats(statsData.stats);
        setPermissions(statsData.permissions);
      } else if (statsData.message.includes('refusé')) {
        alert(statsData.message);
        navigate('/dashboard');
        return;
      }

      // Charger produits archivés
      const produitsRes = await fetch('http://localhost:3000/api/archives/produits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const produitsData = await produitsRes.json();
      if (produitsData.success) {
        setProduits(produitsData.produits);
      }

      // Charger clients archivés
      const clientsRes = await fetch('http://localhost:3000/api/archives/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clientsData = await clientsRes.json();
      if (clientsData.success) {
        setClients(clientsData.clients);
      }

      // Charger commandes archivées
      const commandesRes = await fetch('http://localhost:3000/api/archives/commandes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const commandesData = await commandesRes.json();
      if (commandesData.success) {
        setCommandes(commandesData.commandes);
      }

    } catch (error) {
      console.error('Erreur chargement archives:', error);
      alert('Erreur lors du chargement des archives');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiverClientsInactifs = async () => {
    if (!confirm('Archiver tous les clients inactifs (sans commande depuis 24 mois) ?')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/archives/clients/archiver-inactifs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'archivage');
    }
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Supprimer définitivement cette archive ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/archives/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filterData = (data: Archive[]) => {
    if (!searchTerm) return data;
    
    return data.filter(item => {
      const values = Object.values(item).join(' ').toLowerCase();
      return values.includes(searchTerm.toLowerCase());
    });
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des archives...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📚 Archives</h1>
          <p className={styles.subtitle}>
            {user.username} • {user.role} • 
            {permissions.canArchive ? ' Accès complet' : ' Lecture seule'}
          </p>
        </div>
        {permissions.canArchive && (
          <button onClick={handleArchiverClientsInactifs} className={styles.archiveBtn}>
            🗄️ Archiver clients inactifs
          </button>
        )}
      </header>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Produits archivés</div>
            <div className={styles.statValue}>{stats.produits}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Clients archivés</div>
            <div className={styles.statValue}>{stats.clients}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Commandes archivées</div>
            <div className={styles.statValue}>{stats.commandes}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'produits' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('produits')}
        >
          📦 Produits ({stats.produits})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'clients' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          👥 Clients ({stats.clients})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'commandes' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('commandes')}
        >
          📋 Commandes ({stats.commandes})
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 Rechercher dans les archives..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Produits Archive */}
      {activeTab === 'produits' && (
        <div className={styles.tableWrapper}>
          <h3 className={styles.tableTitle}>Produits archivés</h3>
          {filterData(produits).length === 0 ? (
            <div className={styles.empty}>Aucun produit archivé</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Produit</th>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Fournisseur</th>
                  <th>Expiration</th>
                  {permissions.canDelete && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filterData(produits).map(p => (
                  <tr key={p.id}>
                    <td>{p.ID_PRODUIT}</td>
                    <td><strong>{p.NOM}</strong></td>
                    <td>{p.CATEGORIE}</td>
                    <td>{p.PRIX_UNITAIRE} DH</td>
                    <td>{p.STOCK}</td>
                    <td>{p.FOURNISSEUR}</td>
                    <td>{p.DATE_EXPIRATION}</td>
                    {permissions.canDelete && (
                      <td>
                        <button
                          onClick={() => handleDelete('produits', p.id)}
                          className={styles.btnDelete}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Clients Archive */}
      {activeTab === 'clients' && (
        <div className={styles.tableWrapper}>
          <h3 className={styles.tableTitle}>Clients archivés</h3>
          {filterData(clients).length === 0 ? (
            <div className={styles.empty}>Aucun client archivé</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Client</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  {permissions.canDelete && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filterData(clients).map(c => (
                  <tr key={c.id}>
                    <td>{c.ID_CLIENT}</td>
                    <td><strong>{c.NOM}</strong></td>
                    <td>{c.PRENOM}</td>
                    <td>{c.EMAIL}</td>
                    <td>{c.TELEPHONE}</td>
                    {permissions.canDelete && (
                      <td>
                        <button
                          onClick={() => handleDelete('clients', c.id)}
                          className={styles.btnDelete}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Commandes Archive */}
      {activeTab === 'commandes' && (
        <div className={styles.tableWrapper}>
          <h3 className={styles.tableTitle}>Commandes archivées</h3>
          {filterData(commandes).length === 0 ? (
            <div className={styles.empty}>Aucune commande archivée</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Commande</th>
                  <th>ID Client</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  {permissions.canDelete && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filterData(commandes).map(cmd => (
                  <tr key={cmd.id}>
                    <td><strong>#{cmd.ID_COMMANDE}</strong></td>
                    <td>{cmd.ID_CLIENT}</td>
                    <td>{cmd.DATE}</td>
                    <td><strong>{cmd.MONTANT_TOTAL} DH</strong></td>
                    <td>
                      <span className={styles.badge}>{cmd.STATUT}</span>
                    </td>
                    {permissions.canDelete && (
                      <td>
                        <button
                          onClick={() => handleDelete('commandes', cmd.id)}
                          className={styles.btnDelete}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Info */}
      {!permissions.canArchive && (
        <div className={styles.infoBox}>
          <strong>ℹ️ Mode lecture seule</strong>
          <p>Vous consultez les archives en lecture seule. Seul le Pharmacien peut archiver ou supprimer des données.</p>
        </div>
      )}
    </div>
  );
};

export default Archives;