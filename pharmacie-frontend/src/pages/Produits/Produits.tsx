import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Produits.module.css';
import { API_BASE_URL } from '../../config/api';

interface Produit {
  ID_PRODUIT: number;
  NOM: string;
  CATEGORIE: string;
  PRIX_UNITAIRE: number;
  STOCK: number;
  DATE_EXPIRATION: string;
  FOURNISSEUR_NOM: string;
  ID_FOURNISSEUR: number;
  STATUT: 'ACTIF' | 'INACTIF' | 'ARCHIVE';
  STATUT_AFFICHAGE: 'ok' | 'faible' | 'rupture' | 'perime' | 'expire_bientot' | 'inactif' | 'archive';
}

interface Fournisseur {
  ID_FOURNISSEUR: number;
  NOM: string;
}

const Produits = () => {
  const navigate = useNavigate();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [produitsFiltered, setProduitsFiltered] = useState<Produit[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canArchive: false
  });
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [sortBy, setSortBy] = useState('nom');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    prix_unitaire: '',
    stock: '',
    id_fournisseur: '',
    date_expiration: '',
    statut: 'ACTIF'
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [produits, searchTerm, filterCategorie, filterStatut, sortBy]);

  const loadData = async () => {
    try {
      // Charger produits
      const produitsRes = await fetch(`${API_BASE_URL}/api/produits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const produitsData = await produitsRes.json();
      
      if (produitsData.success) {
        setProduits(produitsData.produits);
        setPermissions(produitsData.permissions);
      }

      // Charger fournisseurs
      const fournisseursRes = await fetch(`${API_BASE_URL}/api/produits/fournisseurs/liste`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const fournisseursData = await fournisseursRes.json();
      if (fournisseursData.success) {
        setFournisseurs(fournisseursData.fournisseurs);
      }

      // Charger catégories
      const categoriesRes = await fetch(`${API_BASE_URL}/api/produits/categories/liste`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
        setCategories(categoriesData.categories);
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...produits];

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.NOM.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.CATEGORIE.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.FOURNISSEUR_NOM.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre catégorie
    if (filterCategorie) {
      filtered = filtered.filter(p => p.CATEGORIE === filterCategorie);
    }

    // Filtre statut
    if (filterStatut) {
      if (filterStatut === 'ACTIF' || filterStatut === 'INACTIF') {
        filtered = filtered.filter(p => p.STATUT === filterStatut);
      } else {
        filtered = filtered.filter(p => p.STATUT_AFFICHAGE === filterStatut);
      }
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nom':
          return a.NOM.localeCompare(b.NOM);
        case 'stock':
          return a.STOCK - b.STOCK;
        case 'prix':
          return a.PRIX_UNITAIRE - b.PRIX_UNITAIRE;
        case 'expiration':
          return new Date(a.DATE_EXPIRATION).getTime() - new Date(b.DATE_EXPIRATION).getTime();
        default:
          return 0;
      }
    });

    setProduitsFiltered(filtered);
  };

  const handleOpenModal = (produit?: Produit) => {
    if (produit) {
      setEditingProduit(produit);
      setFormData({
        nom: produit.NOM,
        categorie: produit.CATEGORIE,
        prix_unitaire: produit.PRIX_UNITAIRE.toString(),
        stock: produit.STOCK.toString(),
        id_fournisseur: produit.ID_FOURNISSEUR.toString(),
        date_expiration: produit.DATE_EXPIRATION.split('T')[0],
        statut: produit.STATUT
      });
    } else {
      setEditingProduit(null);
      setFormData({
        nom: '',
        categorie: '',
        prix_unitaire: '',
        stock: '0',
        id_fournisseur: '',
        date_expiration: '',
        statut: 'ACTIF'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingProduit
        ? `${API_BASE_URL}/api/produits/${editingProduit.ID_PRODUIT}`
        : `${API_BASE_URL}/api/produits`;

      const method = editingProduit ? 'PUT' : 'POST';

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

  const handleChangeStatut = async (id: number, nouveauStatut: 'ACTIF' | 'INACTIF' | 'ARCHIVE') => {
    const confirmMessage = nouveauStatut === 'ARCHIVE' 
      ? 'Archiver ce produit ? Il sera déplacé vers les archives.'
      : nouveauStatut === 'INACTIF'
      ? 'Désactiver ce produit ?'
      : 'Activer ce produit ?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/produits/${id}/statut`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statut: nouveauStatut })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erreur changement statut:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce produit ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/produits/${id}`, {
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

  const getStatutBadge = (statut: string, statutDB: string) => {
    // Priorité au statut de la base de données
    if (statutDB === 'INACTIF') {
      return { text: 'Inactif', className: styles.badgeInactif };
    }
    
    const badges = {
      ok: { text: 'En stock', className: styles.badgeSuccess },
      faible: { text: 'Stock faible', className: styles.badgeWarning },
      rupture: { text: 'Rupture', className: styles.badgeDanger },
      perime: { text: 'Périmé', className: styles.badgeDanger },
      expire_bientot: { text: 'Expire bientôt', className: styles.badgeWarning },
      inactif: { text: 'Inactif', className: styles.badgeInactif }
    };
    return badges[statut as keyof typeof badges] || badges.ok;
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des produits...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}> Gestion des Produits</h1>
          <p className={styles.subtitle}>
            {user.username} • {user.role} • 
            {permissions.canCreate ? ' Accès complet' : ' Lecture seule'}
          </p>
        </div>
        {permissions.canCreate && (
          <button onClick={() => handleOpenModal()} className={styles.addBtn}>
            + Nouveau Produit
          </button>
        )}
      </header>

      {/* Filtres */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={filterCategorie}
          onChange={(e) => setFilterCategorie(e.target.value)}
          className={styles.select}
        >
          <option value="">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className={styles.select}
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIF">Actifs</option>
          <option value="INACTIF">Inactifs</option>
          <option value="ok">En stock</option>
          <option value="faible">Stock faible</option>
          <option value="rupture">Rupture</option>
          <option value="perime">Périmé</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={styles.select}
        >
          <option value="nom">Trier par: Nom</option>
          <option value="stock">Trier par: Stock</option>
          <option value="prix">Trier par: Prix</option>
          <option value="expiration">Trier par: Expiration</option>
        </select>

        <div className={styles.count}>
          {produitsFiltered.length} produit(s)
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Fournisseur</th>
              <th>Expiration</th>
              <th>Statut</th>
              {permissions.canUpdate && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {produitsFiltered.map(produit => {
              const badge = getStatutBadge(produit.STATUT_AFFICHAGE, produit.STATUT);
              return (
                <tr key={produit.ID_PRODUIT} className={styles[`row${produit.STATUT_AFFICHAGE}`]}>
                  <td><strong>{produit.NOM}</strong></td>
                  <td>{produit.CATEGORIE}</td>
                  <td>{produit.PRIX_UNITAIRE} DH</td>
                  <td>
                    <span className={produit.STOCK < 10 ? styles.stockLow : ''}>
                      {produit.STOCK}
                    </span>
                  </td>
                  <td>{produit.FOURNISSEUR_NOM}</td>
                  <td>{new Date(produit.DATE_EXPIRATION).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span className={badge.className}>
                      {badge.text}
                    </span>
                  </td>
                  {permissions.canUpdate && (
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleOpenModal(produit)}
                          className={styles.btnEdit}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        
                        {/* Bouton Activer/Désactiver */}
                        {permissions.canArchive && (
                          <>
                            {produit.STATUT === 'ACTIF' && (
                              <button
                                onClick={() => handleChangeStatut(produit.ID_PRODUIT, 'INACTIF')}
                                className={styles.btnDeactivate}
                                title="Désactiver"
                              >
                                🚫
                              </button>
                            )}
                            {produit.STATUT === 'INACTIF' && (
                              <button
                                onClick={() => handleChangeStatut(produit.ID_PRODUIT, 'ACTIF')}
                                className={styles.btnActivate}
                                title="Activer"
                              >
                                ✅
                              </button>
                            )}
                            {/* Bouton Archiver */}
                            <button
                              onClick={() => handleChangeStatut(produit.ID_PRODUIT, 'ARCHIVE')}
                              className={styles.btnArchive}
                              title="Archiver"
                            >
                              📦
                            </button>
                          </>
                        )}
                        
                        {permissions.canDelete && (
                          <button
                            onClick={() => handleDelete(produit.ID_PRODUIT)}
                            className={styles.btnDelete}
                            title="Supprimer définitivement"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editingProduit ? 'Modifier le produit' : 'Nouveau produit'}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Catégorie *</label>
                <input
                  type="text"
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  list="categories"
                  required
                />
                <datalist id="categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Prix unitaire (DH) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Fournisseur *</label>
                <select
                  value={formData.id_fournisseur}
                  onChange={(e) => setFormData({ ...formData, id_fournisseur: e.target.value })}
                  required
                >
                  <option value="">Sélectionnez un fournisseur</option>
                  {fournisseurs.map(f => (
                    <option key={f.ID_FOURNISSEUR} value={f.ID_FOURNISSEUR}>
                      {f.NOM}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Date d'expiration *</label>
                <input
                  type="date"
                  value={formData.date_expiration}
                  onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                  required
                />
              </div>

              {editingProduit && (
                <div className={styles.formGroup}>
                  <label>Statut *</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  >
                    <option value="ACTIF">Actif</option>
                    <option value="INACTIF">Inactif</option>
                  </select>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  {editingProduit ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Produits;