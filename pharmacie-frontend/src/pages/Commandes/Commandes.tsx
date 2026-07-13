import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Commandes.module.css';

interface Commande {
  ID_COMMANDE: number;
  DATE_COMMANDE: string;
  STATUT: 'en_cours' | 'terminee' | 'annulee';
  MONTANT_TOTAL: number;
  CLIENT_NOM: string;
  ID_CLIENT: number;
  NB_PRODUITS: number;
}

interface Client {
  ID_CLIENT: number;
  NOM: string;
  PRENOM: string;
  EMAIL: string;
  TELEPHONE: string;
}

interface Produit {
  ID_PRODUIT: number;
  NOM: string;
  CATEGORIE: string;
  PRIX_UNITAIRE: number;
  STOCK: number;
}

interface ProduitPanier {
  produit: Produit;
  quantite: number;
}

const Commandes = () => {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [commandesFiltered, setCommandesFiltered] = useState<Commande[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canChangeStatus: false
  });

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Modal création
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [panier, setPanier] = useState<ProduitPanier[]>([]);
  const [searchProduit, setSearchProduit] = useState('');

  // Modal détails
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<any>(null);

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
  }, [commandes, searchTerm, filterStatut]);

  const loadData = async () => {
    try {
      // Charger commandes
      const commandesRes = await fetch('${API_BASE_URL}/api/commandes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const commandesData = await commandesRes.json();

      if (commandesData.success) {
        setCommandes(commandesData.commandes);
        setPermissions(commandesData.permissions);
      }

      // Charger clients
      const clientsRes = await fetch('${API_BASE_URL}/api/commandes/clients/liste', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clientsData = await clientsRes.json();
      if (clientsData.success) {
        setClients(clientsData.clients);
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProduits = async (query: string) => {
    if (query.length < 2) {
      setProduits([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/commandes/produits/recherche?q=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProduits(data.produits);
      }
    } catch (error) {
      console.error('Erreur recherche produits:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...commandes];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.CLIENT_NOM.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ID_COMMANDE.toString().includes(searchTerm)
      );
    }

    if (filterStatut) {
      filtered = filtered.filter(c => c.STATUT === filterStatut);
    }

    setCommandesFiltered(filtered);
  };

  const handleOpenModal = () => {
    setSelectedClient('');
    setPanier([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient('');
    setPanier([]);
    setProduits([]);
    setSearchProduit('');
  };

  const ajouterAuPanier = (produit: Produit) => {
    const existe = panier.find(p => p.produit.ID_PRODUIT === produit.ID_PRODUIT);
    if (existe) {
      setPanier(panier.map(p =>
        p.produit.ID_PRODUIT === produit.ID_PRODUIT
          ? { ...p, quantite: p.quantite + 1 }
          : p
      ));
    } else {
      setPanier([...panier, { produit, quantite: 1 }]);
    }
    setSearchProduit('');
    setProduits([]);
  };

  const retirerDuPanier = (idProduit: number) => {
    setPanier(panier.filter(p => p.produit.ID_PRODUIT !== idProduit));
  };

  const modifierQuantite = (idProduit: number, quantite: number) => {
    if (quantite <= 0) {
      retirerDuPanier(idProduit);
      return;
    }
    setPanier(panier.map(p =>
      p.produit.ID_PRODUIT === idProduit ? { ...p, quantite } : p
    ));
  };

  const calculerTotal = () => {
    return panier.reduce((total, p) => total + (p.produit.PRIX_UNITAIRE * p.quantite), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient || panier.length === 0) {
      alert('Veuillez sélectionner un client et ajouter des produits');
      return;
    }

    try {
      const response = await fetch('${API_BASE_URL}/api/commandes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_client: parseInt(selectedClient),
          produits: panier.map(p => ({
            id_produit: p.produit.ID_PRODUIT,
            quantite: p.quantite,
            prix: p.produit.PRIX_UNITAIRE
          }))
        })
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
      alert('Erreur lors de la création de la commande');
    }
  };

  const handleChangeStatus = async (idCommande: number, nouveauStatut: string) => {
    if (!confirm(`Changer le statut en "${nouveauStatut}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/commandes/${idCommande}/statut`, {
        method: 'PUT',
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
      console.error('Erreur:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleDelete = async (idCommande: number) => {
    if (!confirm('Annuler cette commande ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/commandes/${idCommande}`, {
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
      alert('Erreur lors de l\'annulation');
    }
  };

  const handleViewDetails = async (idCommande: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/commandes/${idCommande}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setSelectedCommande(data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      en_cours: { text: 'En cours', className: styles.badgeEnCours },
      terminee: { text: 'Terminée', className: styles.badgeTerminee },
      annulee: { text: 'Annulée', className: styles.badgeAnnulee }
    };
    return badges[statut as keyof typeof badges] || badges.en_cours;
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des commandes...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
          ← Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📦 Gestion des Commandes</h1>
          <p className={styles.subtitle}>
            {user.username} • {user.role} • 
            {permissions.canCreate ? ' Peut créer' : ' Lecture seule'}
          </p>
        </div>
        {permissions.canCreate && (
          <button onClick={handleOpenModal} className={styles.addBtn}>
            + Nouvelle Commande
          </button>
        )}
      </header>

      {/* Filtres */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Rechercher par client ou N° commande..."
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
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>

        <div className={styles.count}>
          {commandesFiltered.length} commande(s)
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>N° Commande</th>
              <th>Client</th>
              <th>Date</th>
              <th>Produits</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commandesFiltered.map(cmd => {
              const badge = getStatutBadge(cmd.STATUT);
              return (
                <tr key={cmd.ID_COMMANDE}>
                  <td><strong>#{cmd.ID_COMMANDE}</strong></td>
                  <td>{cmd.CLIENT_NOM}</td>
                  <td>{new Date(cmd.DATE_COMMANDE).toLocaleDateString('fr-FR')}</td>
                  <td>{cmd.NB_PRODUITS} produit(s)</td>
                  <td><strong>{cmd.MONTANT_TOTAL} DH</strong></td>
                  <td>
                    <span className={badge.className}>
                      {badge.text}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleViewDetails(cmd.ID_COMMANDE)}
                        className={styles.btnView}
                        title="Voir détails"
                      >
                        👁️
                      </button>

                      {permissions.canChangeStatus && cmd.STATUT === 'en_cours' && (
                        <button
                          onClick={() => handleChangeStatus(cmd.ID_COMMANDE, 'terminee')}
                          className={styles.btnTerminate}
                          title="Terminer"
                        >
                          ✓
                        </button>
                      )}

                      {permissions.canDelete && cmd.STATUT !== 'annulee' && (
                        <button
                          onClick={() => handleDelete(cmd.ID_COMMANDE)}
                          className={styles.btnDelete}
                          title="Annuler"
                        >
                          ✕
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

      {/* Modal Création */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Nouvelle Commande</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              
              {/* Sélection client */}
              <div className={styles.formGroup}>
                <label>Client *</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  required
                  className={styles.selectLarge}
                >
                  <option value="">Sélectionnez un client</option>
                  {clients.map(c => (
                    <option key={c.ID_CLIENT} value={c.ID_CLIENT}>
                      {c.NOM} {c.PRENOM} - {c.EMAIL}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recherche produit */}
              <div className={styles.formGroup}>
                <label>Ajouter des produits</label>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchProduit}
                  onChange={(e) => {
                    setSearchProduit(e.target.value);
                    searchProduits(e.target.value);
                  }}
                  className={styles.input}
                />
                
                {produits.length > 0 && (
                  <div className={styles.searchResults}>
                    {produits.map(p => (
                      <div
                        key={p.ID_PRODUIT}
                        className={styles.productItem}
                        onClick={() => ajouterAuPanier(p)}
                      >
                        <strong>{p.NOM}</strong>
                        <span>{p.CATEGORIE}</span>
                        <span>{p.PRIX_UNITAIRE} DH</span>
                        <span className={styles.stock}>Stock: {p.STOCK}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panier */}
              {panier.length > 0 && (
                <div className={styles.panier}>
                  <h3>Panier ({panier.length} produit(s))</h3>
                  {panier.map(item => (
                    <div key={item.produit.ID_PRODUIT} className={styles.panierItem}>
                      <div className={styles.panierInfo}>
                        <strong>{item.produit.NOM}</strong>
                        <span>{item.produit.PRIX_UNITAIRE} DH × {item.quantite}</span>
                      </div>
                      <div className={styles.panierActions}>
                        <input
                          type="number"
                          min="1"
                          max={item.produit.STOCK}
                          value={item.quantite}
                          onChange={(e) => modifierQuantite(item.produit.ID_PRODUIT, parseInt(e.target.value))}
                          className={styles.qtyInput}
                        />
                        <button
                          type="button"
                          onClick={() => retirerDuPanier(item.produit.ID_PRODUIT)}
                          className={styles.btnRemove}
                        >
                          ✕
                        </button>
                      </div>
                      <div className={styles.panierTotal}>
                        {(item.produit.PRIX_UNITAIRE * item.quantite).toFixed(2)} DH
                      </div>
                    </div>
                  ))}
                  <div className={styles.totalGeneral}>
                    <strong>Total:</strong>
                    <strong>{calculerTotal().toFixed(2)} DH</strong>
                  </div>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={panier.length === 0}>
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetails && selectedCommande && (
        <div className={styles.modalOverlay} onClick={() => setShowDetails(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Détails Commande #{selectedCommande.commande.ID_COMMANDE}</h2>
            
            <div className={styles.detailsGrid}>
              <div><strong>Client:</strong> {selectedCommande.commande.CLIENT_NOM}</div>
              <div><strong>Email:</strong> {selectedCommande.commande.EMAIL}</div>
              <div><strong>Téléphone:</strong> {selectedCommande.commande.TELEPHONE}</div>
              <div><strong>Date:</strong> {new Date(selectedCommande.commande.DATE_COMMANDE).toLocaleString('fr-FR')}</div>
              <div>
                <strong>Statut:</strong> 
                <span className={getStatutBadge(selectedCommande.commande.STATUT).className}>
                  {getStatutBadge(selectedCommande.commande.STATUT).text}
                </span>
              </div>
            </div>

            <h3 style={{ marginTop: '24px' }}>Produits</h3>
            <table className={styles.detailsTable}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedCommande.details.map((d: any, i: number) => (
                  <tr key={i}>
                    <td>{d.PRODUIT_NOM}</td>
                    <td>{d.CATEGORIE}</td>
                    <td>{d.QUANTITE}</td>
                    <td>{d.PRIX} DH</td>
                    <td><strong>{(d.PRIX * d.QUANTITE).toFixed(2)} DH</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right' }}><strong>Total:</strong></td>
                  <td><strong>{selectedCommande.commande.MONTANT_TOTAL} DH</strong></td>
                </tr>
              </tfoot>
            </table>

            <button onClick={() => setShowDetails(false)} className={styles.btnClose}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commandes;