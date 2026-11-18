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
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { Menu as MenuIcon, Logout } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { signOut } from "../auth/authSlice";

export type PortalTab = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type PortalLayoutProps = {
  brandTitle: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: PortalTab[];
  headerTitle: string;
  headerSubtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

export default function PortalLayout({
  brandTitle,
  activeTab,
  onTabChange,
  tabs,
  headerTitle,
  headerSubtitle,
  headerAction,
  children,
}: PortalLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const email = useAppSelector((s) => s.auth.email);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    dispatch(signOut());
  };

  const sidebarContent = (
    <Box
      sx={{
        width: 260,
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid #E5E7EB" }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          {brandTitle}
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
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        bgcolor: "#F7F8FA",
      }}
    >
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: 260 } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {!isMobile && (
        <Box
          sx={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid #E5E7EB",
            bgcolor: "#FFFFFF",
          }}
        >
          {sidebarContent}
        </Box>
      )}

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
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
              {headerSubtitle && (
                <Typography variant="body2" color="text.secondary">
                  {headerSubtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {headerAction && <Box>{headerAction}</Box>}
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar alt={email || "User"} src="/static/images/avatar/2.jpg" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>{email || "Signed in"}</MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Box>

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
