import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const provisionSchema = z.object({
  name: z.string().min(2, "School name is required"),
  subdomain: z
    .string()
    .min(2, "Subdomain is required")
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens")
    .transform((v) => v.trim().toLowerCase()),
  admin_email: z.string().email("Admin email is invalid"),
  admin_password: z.string().min(8, "Password must be at least 8 characters"),
});

type ProvisionValues = z.infer<typeof provisionSchema>;

export function CreateTenantDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreate: (values: ProvisionValues) => Promise<void>;
  busy?: boolean;
}) {
  const form = useForm<ProvisionValues>({
    resolver: zodResolver(provisionSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      admin_email: "",
      admin_password: "",
    },
  });

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Create tenant</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          This creates a tenant and a tenant admin user with initial access.
        </Typography>
        <Box
          component="form"
          onSubmit={form.handleSubmit(async (values) => {
            await props.onCreate(values);
            form.reset();
          })}
          noValidate
        >
          <Stack spacing={1.5}>
            <TextField
              label="School name"
              fullWidth
              required
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <TextField
              label="Subdomain"
              fullWidth
              required
              placeholder="e.g. school1"
              error={!!form.formState.errors.subdomain}
              helperText={form.formState.errors.subdomain?.message}
              {...form.register("subdomain")}
            />
            <TextField
              label="Tenant admin email"
              fullWidth
              required
              error={!!form.formState.errors.admin_email}
              helperText={form.formState.errors.admin_email?.message}
              {...form.register("admin_email")}
            />
            <TextField
              label="Tenant admin password"
              type="password"
              fullWidth
              required
              error={!!form.formState.errors.admin_password}
              helperText={form.formState.errors.admin_password?.message}
              {...form.register("admin_password")}
            />
            <input type="submit" hidden />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={props.busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={form.handleSubmit(async (values) => {
            await props.onCreate(values);
            form.reset();
          })}
          disabled={props.busy}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const editAdminSchema = z
  .object({
    current_admin_email: z.string().email("Admin email is invalid"),
    new_admin_email: z.string().email("New email is invalid").optional(),
    new_password: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const nextPassword = (values.new_password ?? "").trim();
    if (nextPassword && nextPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["new_password"],
      });
    }
  });

type EditAdminValues = z.infer<typeof editAdminSchema>;

export function EditTenantAdminDialog(props: {
  open: boolean;
  onClose: () => void;
  tenantName: string;
  currentAdminEmail: string;
  onSave: (values: EditAdminValues) => Promise<void>;
  busy?: boolean;
}) {
  const form = useForm<EditAdminValues>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      current_admin_email: props.currentAdminEmail,
      new_admin_email: props.currentAdminEmail,
      new_password: "",
    },
  });

  useEffect(() => {
    form.reset({
      current_admin_email: props.currentAdminEmail,
      new_admin_email: props.currentAdminEmail,
      new_password: "",
    });
  }, [form, props.currentAdminEmail, props.open]);

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Edit tenant admin</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          Tenant: <b>{props.tenantName}</b>
        </Typography>
        <Box
          component="form"
          onSubmit={form.handleSubmit(async (values) => {
            await props.onSave(values);
            form.reset();
          })}
          noValidate
        >
          <Stack spacing={1.5}>
            <TextField
              label="Current admin email"
              fullWidth
              required
              error={!!form.formState.errors.current_admin_email}
              helperText={form.formState.errors.current_admin_email?.message}
              {...form.register("current_admin_email")}
            />
            <TextField
              label="New admin email"
              fullWidth
              error={!!form.formState.errors.new_admin_email}
              helperText={form.formState.errors.new_admin_email?.message}
              {...form.register("new_admin_email")}
            />
            <TextField
              label="New password (optional)"
              type="password"
              fullWidth
              error={!!form.formState.errors.new_password}
              helperText={
                form.formState.errors.new_password?.message ??
                "Leave blank to keep current password"
              }
              {...form.register("new_password")}
            />
            <input type="submit" hidden />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={props.busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={form.handleSubmit(async (values) => {
            await props.onSave(values);
            form.reset();
          })}
          disabled={props.busy}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
