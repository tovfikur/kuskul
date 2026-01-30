import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { signIn, restoreSession } from "./authSlice";

const needsTenantSubdomain =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const schema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    tenant_subdomain: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!needsTenantSubdomain) {
      return;
    }
    const t = (values.tenant_subdomain ?? "").trim();
    if (!t) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tenant subdomain is required on localhost",
        path: ["tenant_subdomain"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: { pathname?: string } };
  };
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const errorMessage = useAppSelector((s) => s.auth.errorMessage);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const isPlatformAdmin = useAppSelector((s) => s.auth.isPlatformAdmin);
  const sessionChecked = useAppSelector((s) => s.auth.sessionChecked);

  // Try to restore session on mount (in case user is already logged in via cookie)
  useEffect(() => {
    if (!sessionChecked && status !== "loading") {
      dispatch(restoreSession());
    }
  }, [dispatch, sessionChecked, status]);

  useEffect(() => {
    if (accessToken) {
      const to =
        location.state?.from?.pathname ??
        (isPlatformAdmin ? "/saas-admin" : "/dashboard");
      navigate(to, { replace: true });
    }
  }, [accessToken, isPlatformAdmin, location.state, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      tenant_subdomain: needsTenantSubdomain
        ? (() => {
            const stored = localStorage.getItem("kuskul_tenant_subdomain");
            if (stored) {
              return stored;
            }
            const to = location.state?.from?.pathname ?? "";
            if (to.startsWith("/saas-admin")) {
              return "admin";
            }
            return "demo";
          })()
        : "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (needsTenantSubdomain) {
      localStorage.setItem(
        "kuskul_tenant_subdomain",
        (values.tenant_subdomain ?? "").trim().toLowerCase(),
      );
    }
    await dispatch(signIn(values));
  }

  return (
    <Box
      component="form"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      sx={{ mt: 1, width: "100%" }}
    >
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Sign in
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {needsTenantSubdomain && (
        <TextField
          margin="normal"
          required
          fullWidth
          id="tenant_subdomain"
          label="Tenant Subdomain"
          error={!!form.formState.errors.tenant_subdomain}
          helperText={
            form.formState.errors.tenant_subdomain?.message ?? "e.g. demo"
          }
          {...form.register("tenant_subdomain")}
        />
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        autoComplete="email"
        autoFocus
        error={!!form.formState.errors.email}
        helperText={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        error={!!form.formState.errors.password}
        helperText={form.formState.errors.password?.message}
        {...form.register("password")}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2, height: 48 }}
        disabled={status === "loading"}
      >
        {status === "loading" ? <CircularProgress size={24} /> : "Sign In"}
      </Button>
    </Box>
  );
}
