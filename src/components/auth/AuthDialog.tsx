"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { z } from "zod/v4";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { GoogleGIcon } from "@/components/common/icons";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/* ── Schemas ────────────────────────────────────── */
const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

type AuthMode = "login" | "register";

/* ── Component ──────────────────────────────────── */
interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onLogin = async (data: LoginValues) => {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Invalid email or password");
    } else {
      toast.success("Welcome back!");
      onOpenChange(false);
      loginForm.reset();
    }
  };

  const onRegister = async (data: RegisterValues) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Registration failed");
        return;
      }

      // Auto sign-in after registration
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Account created but auto-login failed. Please sign in.");
        setMode("login");
      } else {
        toast.success("Account created! Welcome to LuminaGen ✨");
        onOpenChange(false);
        registerForm.reset();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[580px] p-0 gap-0 overflow-visible rounded-2xl"
        showCloseButton={false}
      >
        {/* Close button — outside dialog */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute -top-2.5 -right-11 w-9 h-9 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/80 transition-colors shadow-lg z-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-hidden rounded-2xl bg-background">
          {/* Gradient banner */}
          <motion.div
            className="mx-4 mt-4 rounded-xl px-6 pt-6 pb-5 bg-[linear-gradient(135deg,#e0f7fa_0%,#fce7f3_25%,#fef3c7_50%,#e0f7fa_75%,#f0f4ff_100%)] dark:bg-[linear-gradient(135deg,#050816_0%,#0a0520_25%,#050d22_50%,#0d0518_75%,#050816_100%)]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <DialogHeader className="mb-0">
              <DialogTitle
                className="text-[26px] font-semibold"
                style={{ fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif' }}
              >
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                {mode === "login"
                  ? "Sign in to your LuminaGen account"
                  : "Sign up to save your work across devices"}
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Form content */}
          <motion.div
            className="px-10 pb-10 pt-4 relative bg-background"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {/* Google sign-in */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mb-1">
              <Button
                variant="outline"
                className="w-full h-[52px] rounded-full text-sm font-medium gap-3"
                onClick={() => toast.info("Google sign-in coming soon!")}
              >
                <GoogleGIcon />
                Continue with Google
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.form
                  key="login"
                  onSubmit={loginForm.handleSubmit(onLogin)}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-semibold">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-[52px] rounded-full px-5"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-semibold">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-[52px] rounded-full px-5 pr-12"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      disabled={loginForm.formState.isSubmitting}
                      className="w-full h-[52px] rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                    >
                      {loginForm.formState.isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...</>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  onSubmit={registerForm.handleSubmit(onRegister)}
                  className="space-y-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name" className="text-sm font-semibold">
                      Name
                    </Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Your name"
                      className="h-[48px] rounded-full px-5"
                      {...registerForm.register("name")}
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-sm font-semibold">
                      Email
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-[48px] rounded-full px-5"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-sm font-semibold">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 characters"
                        className="h-[48px] rounded-full px-5 pr-12"
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm" className="text-sm font-semibold">
                      Confirm Password
                    </Label>
                    <Input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      className="h-[48px] rounded-full px-5"
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      disabled={registerForm.formState.isSubmitting}
                      className="w-full h-[52px] rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                    >
                      {registerForm.formState.isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating account...</>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-5">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
