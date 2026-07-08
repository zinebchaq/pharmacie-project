import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Produits from "../pages/Produits/Produits";
import Commandes from "../pages/Commandes/Commandes";
import Archives from "../pages/Archives/Archives";
import Fournisseurs from "../pages/Fournisseurs/Fournisseurs";
import Clients from "../pages/Clients/Clients";
import AlertesStock from '../pages/AlertesStock/AlertesStock';
import Paiements from "../pages/Paiements/Paiements";


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/produits" element={<Produits />} />
        <Route path="/commandes" element={<Commandes />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/fournisseurs" element={<Fournisseurs />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/alertes" element={<AlertesStock />} />
        <Route path="/paiements" element={<Paiements />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;