import { useState } from "react";
import LogisticsLayout from "./components/LogisticsLayout";
import InventoryTab from "./components/inventory/InventoryTab";
import ProcurementTab from "./components/procurement/ProcurementTab";
import AssetsTab from "./components/assets/AssetsTab";
import MaintenanceTab from "./components/maintenance/MaintenanceTab";
import VendorsTab from "./components/vendors/VendorsTab";
import ReportsTab from "./components/reports/ReportsTab";

type LogisticsTab =
  | "inventory"
  | "procurement"
  | "assets"
  | "maintenance"
  | "vendors"
  | "reports";

export default function LogisticsPage() {
  const [activeTab, setActiveTab] = useState<LogisticsTab>("inventory");

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "inventory":
        return "Inventory Management";
      case "procurement":
        return "Procurement";
      case "assets":
        return "Asset Register";
      case "maintenance":
        return "Maintenance Tickets";
      case "vendors":
        return "Vendor Management";
      case "reports":
        return "Reports & Analytics";
      default:
        return "Logistics";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "inventory":
        return <InventoryTab />;
      case "procurement":
        return <ProcurementTab />;
      case "assets":
        return <AssetsTab />;
      case "maintenance":
        return <MaintenanceTab />;
      case "vendors":
        return <VendorsTab />;
      case "reports":
        return <ReportsTab />;
      default:
        return <InventoryTab />;
    }
  };

  return (
    <LogisticsLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={getHeaderTitle()}
    >
      {renderTabContent()}
    </LogisticsLayout>
  );
}

