import { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";
import {
  People,
  PersonAdd,
  Assessment,
  Settings,
  Menu as MenuIcon,
} from "@mui/icons-material";

type StudentsTab = "directory" | "admissions" | "reports" | "settings";

type StudentsLayoutProps = {
  activeTab: StudentsTab;
  onTabChange: (tab: StudentsTab) => void;
  children: React.ReactNode;
  headerTitle: string;
  headerAction?: React.ReactNode;
};

const tabs: {
  id: StudentsTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "directory", label: "Student Directory", icon: <People /> },
  { id: "admissions", label: "Admissions", icon: <PersonAdd /> },
  { id: "reports", label: "Reports", icon: <Assessment /> },
  { id: "settings", label: "Settings", icon: <Settings /> },
];

export default function StudentsLayout({
  activeTab,
  onTabChange,
  children,
  headerTitle,
  headerAction,
}: StudentsLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabClick = (tab: StudentsTab) => {
    onTabChange(tab);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const sidebarContent = (
    <Box sx={{ width: 260, height: "100%", bgcolor: "#FFFFFF" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #E5E7EB" }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          Student Management
        </Typography>
      </Box>
      <List sx={{ pt: 2 }}>
        {tabs.map((tab) => (
          <ListItemButton
            key={tab.id}
            selected={activeTab === tab.id}
            onClick={() => handleTabClick(tab.id)}
            sx={{
              mx: 1,
              borderRadius: 2,
              mb: 0.5,
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "white",
                "&:hover": {
                  bgcolor: "primary.dark",
                },
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: activeTab === tab.id ? "white" : "text.secondary",
              }}
            >
              {tab.icon}
            </ListItemIcon>
            <ListItemText
              primary={tab.label}
              primaryTypographyProps={{
                fontWeight: activeTab === tab.id ? 700 : 500,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": { width: 260 },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box
          sx={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid #E5E7EB",
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #E5E7EB",
            bgcolor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isMobile && (
              <IconButton onClick={handleDrawerToggle} edge="start">
                <MenuIcon />
              </IconButton>
            )}
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {headerTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Home / Students / {tabs.find((t) => t.id === activeTab)?.label}
              </Typography>
            </Box>
          </Box>
          {headerAction && <Box>{headerAction}</Box>}
        </Box>

        {/* Content Workspace */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            bgcolor: "#F7F8FA",
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
