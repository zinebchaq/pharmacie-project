import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Fournisseurs.module.css';
import { API_BASE_URL } from '../../config/api';

interface Fournisseur {
  ID_FOURNISSEUR: number;
  NOM: string;
  CONTACT: string;
  ADRESSE: string;
  NB_PRODUITS: number;
}

const Fournisseurs = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [fournisseursFiltered, setFournisseursFiltered] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    contact: '',
    adresse: ''
  });

  // Détails
  const [showDetails, setShowDetails] = useState(false);
  const [detailsFournisseur, setDetailsFournisseur] = useState<any>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // CONTRÔLE D'ACCÈS STRICT : Seul le PHARMACIEN peut accéder
    if (user.role !== 'PHARMACIEN') {
      alert('Accès refusé. Seul le Pharmacien peut gérer les fournisseurs.');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fournisseurs, searchTerm]);

  const loadData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fournisseurs`, {
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

      setFournisseurs(data.fournisseurs);

    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...fournisseurs];

    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.NOM.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.CONTACT && f.CONTACT.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.ADRESSE && f.ADRESSE.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFournisseursFiltered(filtered);
  };

  const handleOpenModal = (fournisseur?: Fournisseur) => {
    if (fournisseur) {
      setEditingFournisseur(fournisseur);
      setFormData({
        nom: fournisseur.NOM,
        contact: fournisseur.CONTACT || '',
        adresse: fournisseur.ADRESSE || ''
      });
    } else {
      setEditingFournisseur(null);
      setFormData({
        nom: '',
        contact: '',
        adresse: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFournisseur(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingFournisseur
        ? `${API_BASE_URL}/api/fournisseurs/${editingFournisseur.ID_FOURNISSEUR}`
        : `${API_BASE_URL}/api/fournisseurs`;

      const method = editingFournisseur ? 'PUT' : 'POST';

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

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le fournisseur "${nom}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/fournisseurs/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/fournisseurs/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setDetailsFournisseur(data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des fournisseurs...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>🏢 Gestion des Fournisseurs</h1>
          <p className={styles.subtitle}>
            {user.username} • Pharmacien • Accès complet
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className={styles.addBtn}>
          + Nouveau Fournisseur
        </button>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Rechercher un fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.count}>
          {fournisseursFiltered.length} fournisseur(s)
        </div>
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <strong>ℹ️ Accès restreint</strong>
        <p>
          Cette page est accessible uniquement au Pharmacien. Les autres rôles peuvent consulter 
          les informations fournisseurs via les pages Produits et Commandes (lecture seule).
        </p>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Contact</th>
              <th>Adresse</th>
              <th>Produits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fournisseursFiltered.map(f => (
              <tr key={f.ID_FOURNISSEUR}>
                <td>{f.ID_FOURNISSEUR}</td>
                <td><strong>{f.NOM}</strong></td>
                <td>{f.CONTACT || '-'}</td>
                <td>{f.ADRESSE || '-'}</td>
                <td>
                  <span className={styles.badge}>
                    {f.NB_PRODUITS} produit(s)
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleViewDetails(f.ID_FOURNISSEUR)}
                      className={styles.btnView}
                      title="Voir détails"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleOpenModal(f)}
                      className={styles.btnEdit}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(f.ID_FOURNISSEUR, f.NOM)}
                      className={styles.btnDelete}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Création/Modification */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  placeholder="Ex: DistribPharma"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Contact</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Ex: contact@distribpharma.com ou 06 12 34 56 78"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Adresse</label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Ex: 12 Rue des Pharmacies, Casablanca"
                  rows={3}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  {editingFournisseur ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetails && detailsFournisseur && (
        <div className={styles.modalOverlay} onClick={() => setShowDetails(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              Détails : {detailsFournisseur.fournisseur.NOM}
            </h2>
            
            <div className={styles.detailsGrid}>
              <div>
                <strong>ID:</strong> {detailsFournisseur.fournisseur.ID_FOURNISSEUR}
              </div>
              <div>
                <strong>Nom:</strong> {detailsFournisseur.fournisseur.NOM}
              </div>
              <div>
                <strong>Contact:</strong> {detailsFournisseur.fournisseur.CONTACT || '-'}
              </div>
              <div>
                <strong>Adresse:</strong> {detailsFournisseur.fournisseur.ADRESSE || '-'}
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>
              Produits associés ({detailsFournisseur.produits.length})
            </h3>

            {detailsFournisseur.produits.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                Aucun produit associé à ce fournisseur
              </p>
            ) : (
              <table className={styles.detailsTable}>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Prix</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsFournisseur.produits.map((p: any) => (
                    <tr key={p.ID_PRODUIT}>
                      <td><strong>{p.NOM}</strong></td>
                      <td>{p.CATEGORIE}</td>
                      <td>{p.PRIX_UNITAIRE} DH</td>
                      <td>{p.STOCK}</td>
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

export default Fournisseurs;