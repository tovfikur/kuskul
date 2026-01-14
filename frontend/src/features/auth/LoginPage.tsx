import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { signIn } from "./authSlice";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const errorMessage = useAppSelector((s) => s.auth.errorMessage);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
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
