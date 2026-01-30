import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { School } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { signOut } from "../auth/authSlice";

export function SaasAdminLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const email = useAppSelector((s) => s.auth.email);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <Container
            maxWidth="lg"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <School color="primary" />
              <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>
                KusKul
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ ml: 1, display: { xs: "none", sm: "block" } }}
              >
                SaaS Admin
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Button
                onClick={(e) => setAnchorEl(e.currentTarget)}
                variant="text"
                sx={{ textTransform: "none", gap: 1, color: "text.primary" }}
              >
                <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                  {(email || "U")[0]?.toUpperCase()}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{ display: { xs: "none", sm: "block" } }}
                >
                  {email}
                </Typography>
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    dispatch(signOut());
                  }}
                >
                  Sign out
                </MenuItem>
              </Menu>
            </Box>
          </Container>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
