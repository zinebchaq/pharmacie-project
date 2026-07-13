import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Clients.module.css';

interface Client {
  ID_CLIENT: number;
  NOM: string;
  PRENOM: string;
  ADRESSE: string;
  EMAIL: string;
  TELEPHONE: string;
  NB_COMMANDES: number;
  DERNIERE_COMMANDE: string;
  STATUT: 'actif' | 'inactif';
}

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsFiltered, setClientsFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canView: false
  });

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [sortBy, setSortBy] = useState('nom');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    adresse: '',
    email: '',
    telephone: ''
  });

  // Détails
  const [showDetails, setShowDetails] = useState(false);
  const [detailsClient, setDetailsClient] = useState<any>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // CONTRÔLE D'ACCÈS : Bloquer le COMPTABLE
    if (user.role === 'COMPTABLE') {
      alert('Accès refusé. Les comptables ne peuvent pas accéder aux clients.');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clients, searchTerm, filterStatut, sortBy]);

  const loadData = async () => {
    try {
      const response = await fetch('${API_BASE_URL}/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!data.success) {
        if (data.message.includes('refusé')) {
          alert(data.message);
          navigate('/dashboard');
        }
        return;
      }

      setClients(data.clients);
      setPermissions(data.permissions);

    } catch (error) {
      console.error('Erreur chargement clients:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clients];

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.NOM.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.PRENOM.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.EMAIL.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.TELEPHONE && c.TELEPHONE.includes(searchTerm))
      );
    }

    // Filtre statut
    if (filterStatut) {
      filtered = filtered.filter(c => c.STATUT === filterStatut);
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nom':
          return a.NOM.localeCompare(b.NOM);
        case 'prenom':
          return a.PRENOM.localeCompare(b.PRENOM);
        case 'email':
          return a.EMAIL.localeCompare(b.EMAIL);
        case 'commandes':
          return b.NB_COMMANDES - a.NB_COMMANDES;
        default:
          return 0;
      }
    });

    setClientsFiltered(filtered);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        nom: client.NOM,
        prenom: client.PRENOM,
        adresse: client.ADRESSE || '',
        email: client.EMAIL,
        telephone: client.TELEPHONE || ''
      });
    } else {
      setEditingClient(null);
      setFormData({
        nom: '',
        prenom: '',
        adresse: '',
        email: '',
        telephone: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingClient
        ? `${API_BASE_URL}/api/clients/${editingClient.ID_CLIENT}`
        : '${API_BASE_URL}/api/clients';

      const method = editingClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        handleCloseModal();
        loadData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: number, nom: string, prenom: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le client "${nom} ${prenom}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
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
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setDetailsClient(data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getStatutBadge = (statut: string) => {
    return statut === 'actif'
      ? { text: 'Actif', className: styles.badgeActif }
      : { text: 'Inactif', className: styles.badgeInactif };
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des clients...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>👥 Gestion des Clients</h1>
          <p className={styles.subtitle}>
            {user.username} • {user.role} • 
            {permissions.canDelete ? ' Accès complet' : ' Ajout et modification uniquement'}
          </p>
        </div>
        {permissions.canCreate && (
          <button onClick={() => handleOpenModal()} className={styles.addBtn}>
            + Nouveau Client
          </button>
        )}
      </header>

      {/* Info Box pour VENDEUR */}
      {user.role === 'VENDEUR' && (
        <div className={styles.infoBox}>
          <strong>ℹ️ Permissions Vendeur</strong>
          <p>
            Vous pouvez créer et modifier des clients, mais seul le Pharmacien peut les supprimer.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, prénom, email ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className={styles.select}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={styles.select}
        >
          <option value="nom">Trier par: Nom</option>
          <option value="prenom">Trier par: Prénom</option>
          <option value="email">Trier par: Email</option>
          <option value="commandes">Trier par: Nb commandes</option>
        </select>

        <div className={styles.count}>
          {clientsFiltered.length} client(s)
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Commandes</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clientsFiltered.map(client => {
              const badge = getStatutBadge(client.STATUT);
              return (
                <tr key={client.ID_CLIENT}>
                  <td>{client.ID_CLIENT}</td>
                  <td><strong>{client.NOM}</strong></td>
                  <td>{client.PRENOM}</td>
                  <td>{client.EMAIL}</td>
                  <td>{client.TELEPHONE || '-'}</td>
                  <td>
                    <span className={styles.badge}>
                      {client.NB_COMMANDES}
                    </span>
                  </td>
                  <td>
                    <span className={badge.className}>
                      {badge.text}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleViewDetails(client.ID_CLIENT)}
                        className={styles.btnView}
                        title="Voir détails"
                      >
                        👁️
                      </button>

                      {permissions.canUpdate && (
                        <button
                          onClick={() => handleOpenModal(client)}
                          className={styles.btnEdit}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                      )}

                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(client.ID_CLIENT, client.NOM, client.PRENOM)}
                          className={styles.btnDelete}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Création/Modification */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Benali"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Prénom *</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    placeholder="Ex: Sara"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Ex: sara.benali@gmail.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="Ex: 0612345678"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Adresse</label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Ex: 12 Rue Hassan II, Casablanca"
                  rows={3}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  {editingClient ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetails && detailsClient && (
        <div className={styles.modalOverlay} onClick={() => setShowDetails(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              Détails : {detailsClient.client.NOM} {detailsClient.client.PRENOM}
            </h2>

            <div className={styles.detailsGrid}>
              <div><strong>ID:</strong> {detailsClient.client.ID_CLIENT}</div>
              <div><strong>Nom:</strong> {detailsClient.client.NOM}</div>
              <div><strong>Prénom:</strong> {detailsClient.client.PRENOM}</div>
              <div><strong>Email:</strong> {detailsClient.client.EMAIL}</div>
              <div><strong>Téléphone:</strong> {detailsClient.client.TELEPHONE || '-'}</div>
              <div><strong>Adresse:</strong> {detailsClient.client.ADRESSE || '-'}</div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>
              Historique des commandes ({detailsClient.commandes.length})
            </h3>

            {detailsClient.commandes.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                Aucune commande pour ce client
              </p>
            ) : (
              <table className={styles.detailsTable}>
                <thead>
                  <tr>
                    <th>N° Commande</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsClient.commandes.map((cmd: any) => (
                    <tr key={cmd.ID_COMMANDE}>
                      <td><strong>#{cmd.ID_COMMANDE}</strong></td>
                      <td>{new Date(cmd.DATE_COMMANDE).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span className={styles[`status${cmd.STATUT}`]}>
                          {cmd.STATUT}
                        </span>
                      </td>
                      <td><strong>{cmd.MONTANT_TOTAL} DH</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button onClick={() => setShowDetails(false)} className={styles.btnClose}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;