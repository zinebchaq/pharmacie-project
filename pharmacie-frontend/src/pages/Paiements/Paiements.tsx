import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Paiements.module.css';

interface Paiement {
  ID_PAIEMENT: number;
  ID_COMMANDE: number;
  MONTANT: number;
  DATE_PAIEMENT: string;
  MODE_PAIEMENT: string;
  NOM_CLIENT?: string;
}

interface Commande {
  ID_COMMANDE: number;
  MONTANT_TOTAL: number;
  STATUT: string;
  NOM_CLIENT: string;
}

interface Stats {
  TOTAL_PAIEMENTS: number;
  MONTANT_TOTAL: number;
  MONTANT_MOYEN: number;
}

interface ModeStats {
  MODE_PAIEMENT: string;
  NOMBRE: number;
  MONTANT: number;
}

const Paiements = () => {
  const navigate = useNavigate();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [parMode, setParMode] = useState<ModeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    id_commande: '',
    montant: '',
    montant_commande: '',
    mode_paiement: 'Espèces'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('Tous');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Charger paiements
      const paiementsRes = await fetch('${API_BASE_URL}/api/paiements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const paiementsData = await paiementsRes.json();

      if (paiementsData.success) {
        setPaiements(paiementsData.paiements);
        setPermissions(paiementsData.permissions);
      } else if (paiementsData.message.includes('refusé')) {
        alert(paiementsData.message);
        navigate('/dashboard');
        return;
      }

      // Charger commandes pour le dropdown
      const commandesRes = await fetch('${API_BASE_URL}/api/paiements/commandes/liste', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const commandesData = await commandesRes.json();
      if (commandesData.success) {
        setCommandes(commandesData.commandes);
      }

      // Charger statistiques
      const statsRes = await fetch('${API_BASE_URL}/api/paiements/stats/resume', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
        setParMode(statsData.parMode);
      }

    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      alert('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const handleCommandeChange = (commandeId: string) => {
    const commande = commandes.find(c => c.ID_COMMANDE === parseInt(commandeId));
    
    if (commande) {
      setFormData({
        ...formData,
        id_commande: commandeId,
        montant: commande.MONTANT_TOTAL.toString(),
        montant_commande: commande.MONTANT_TOTAL.toString()
      });
    } else {
      setFormData({
        ...formData,
        id_commande: '',
        montant: '',
        montant_commande: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id_commande || !formData.montant || !formData.mode_paiement) {
      alert('Tous les champs sont requis');
      return;
    }

    if (parseFloat(formData.montant) <= 0) {
      alert('Le montant doit être supérieur à 0');
      return;
    }

    try {
      const url = editingId 
        ? `${API_BASE_URL}/api/paiements/${editingId}`
        : '${API_BASE_URL}/api/paiements';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_commande: parseInt(formData.id_commande),
          montant: parseFloat(formData.montant),
          mode_paiement: formData.mode_paiement
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowForm(false);
        setEditingId(null);
        setFormData({ id_commande: '', montant: '', montant_commande: '', mode_paiement: 'Espèces' });
        loadData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement du paiement');
    }
  };

  const handleEdit = (paiement: Paiement) => {
    const commande = commandes.find(c => c.ID_COMMANDE === paiement.ID_COMMANDE);
    
    setEditingId(paiement.ID_PAIEMENT);
    setFormData({
      id_commande: paiement.ID_COMMANDE.toString(),
      montant: paiement.MONTANT.toString(),
      montant_commande: commande ? commande.MONTANT_TOTAL.toString() : '',
      mode_paiement: paiement.MODE_PAIEMENT
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce paiement ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/paiements/${id}`, {
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

  const filterPaiements = () => {
    let filtered = paiements;

    if (filterMode !== 'Tous') {
      filtered = filtered.filter(p => p.MODE_PAIEMENT === filterMode);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => {
        const searchLower = searchTerm.toLowerCase();
        return (
          p.ID_PAIEMENT.toString().includes(searchLower) ||
          p.ID_COMMANDE.toString().includes(searchLower) ||
          p.MODE_PAIEMENT.toLowerCase().includes(searchLower) ||
          (p.NOM_CLIENT && p.NOM_CLIENT.toLowerCase().includes(searchLower))
        );
      });
    }

    return filtered;
  };

  const getRoleBadgeColor = () => {
    switch(user.role) {
      case 'PHARMACIEN': return '#10b981';
      case 'VENDEUR': return '#3b82f6';
      case 'COMPTABLE': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des paiements...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>💳 Paiements</h1>
          <div className={styles.userInfo}>
            <span>{user.username}</span>
            <span 
              className={styles.roleBadge}
              style={{ backgroundColor: getRoleBadgeColor() }}
            >
              {user.role}
            </span>
          </div>
        </div>
        {permissions.canCreate && (
          <button 
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ id_commande: '', montant: '', montant_commande: '', mode_paiement: 'Espèces' });
            }} 
            className={styles.addBtn}
          >
            {showForm ? '✖ Annuler' : '➕ Nouveau Paiement'}
          </button>
        )}
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Total Encaissé</div>
              <div className={styles.statValue}>{stats.MONTANT_TOTAL.toFixed(2)} DH</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Nombre de Paiements</div>
              <div className={styles.statValue}>{stats.TOTAL_PAIEMENTS}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📈</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Montant Moyen</div>
              <div className={styles.statValue}>{stats.MONTANT_MOYEN.toFixed(2)} DH</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats par mode */}
      {parMode.length > 0 && (
        <div className={styles.modesGrid}>
          {parMode.map(mode => (
            <div key={mode.MODE_PAIEMENT} className={styles.modeCard}>
              <div className={styles.modeLabel}>{mode.MODE_PAIEMENT}</div>
              <div className={styles.modeValue}>{mode.MONTANT.toFixed(2)} DH</div>
              <div className={styles.modeCount}>{mode.NOMBRE} paiement(s)</div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className={styles.formCard}>
          <h3>{editingId ? '✏️ Modifier Paiement' : '➕ Nouveau Paiement'}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Commande *</label>
              <select
                value={formData.id_commande}
                onChange={(e) => handleCommandeChange(e.target.value)}
                required
                disabled={editingId !== null}
              >
                <option value="">Sélectionnez une commande</option>
                {commandes.map(cmd => (
                  <option key={cmd.ID_COMMANDE} value={cmd.ID_COMMANDE}>
                    #{cmd.ID_COMMANDE} - {cmd.NOM_CLIENT} - {cmd.MONTANT_TOTAL} DH ({cmd.STATUT})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>
                Montant (DH) * 
                {formData.montant_commande && (
                  <span style={{color: '#64748b', fontSize: '12px', fontWeight: 'normal'}}>
                    {' '}(Commande: {formData.montant_commande} DH)
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.montant}
                onChange={(e) => setFormData({...formData, montant: e.target.value})}
                placeholder="Montant du paiement"
                required
              />
              <small style={{color: '#64748b', fontSize: '12px'}}>
                💡 Vous pouvez modifier le montant pour un paiement partiel
              </small>
            </div>

            <div className={styles.formGroup}>
              <label>Mode de Paiement *</label>
              <select
                value={formData.mode_paiement}
                onChange={(e) => setFormData({...formData, mode_paiement: e.target.value})}
                required
              >
                <option value="Espèces">Espèces</option>
                <option value="Carte">Carte</option>
                <option value="Chèque">Chèque</option>
                <option value="Virement">Virement</option>
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn}>
                {editingId ? '💾 Enregistrer' : '➕ Ajouter'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ id_commande: '', montant: '', montant_commande: '', mode_paiement: 'Espèces' });
                }}
                className={styles.cancelBtn}
              >
                ✖ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="Tous">Tous les modes</option>
          <option value="Espèces">Espèces</option>
          <option value="Carte">Carte</option>
          <option value="Chèque">Chèque</option>
          <option value="Virement">Virement</option>
        </select>
      </div>

      {/* Tableau */}
      <div className={styles.tableWrapper}>
        {filterPaiements().length === 0 ? (
          <div className={styles.empty}>Aucun paiement trouvé</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Paiement</th>
                <th>ID Commande</th>
                <th>Client</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Mode</th>
                {(permissions.canUpdate || permissions.canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filterPaiements().map(p => (
                <tr key={p.ID_PAIEMENT}>
                  <td><strong>#{p.ID_PAIEMENT}</strong></td>
                  <td>#{p.ID_COMMANDE}</td>
                  <td>{p.NOM_CLIENT || '-'}</td>
                  <td><strong>{p.MONTANT} DH</strong></td>
                  <td>{new Date(p.DATE_PAIEMENT).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span className={styles.modeBadge}>
                      {p.MODE_PAIEMENT}
                    </span>
                  </td>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <td className={styles.actions}>
                      {permissions.canUpdate && (
                        <button
                          onClick={() => handleEdit(p)}
                          className={styles.btnEdit}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(p.ID_PAIEMENT)}
                          className={styles.btnDelete}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info permissions */}
      {!permissions.canCreate && (
        <div className={styles.infoBox}>
          <strong>ℹ️ Mode lecture seule</strong>
          <p>
            {user.role === 'COMPTABLE' 
              ? 'Vous consultez les paiements en lecture seule.'
              : 'Vos permissions ne permettent pas la modification.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Paiements;


