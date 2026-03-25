"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Gift, X } from "lucide-react";
import { GoogleGIcon } from "@/components/common/icons";

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

/* ── Schema ─────────────────────────────────────── */
const authSchema = z.object({
  email: z.email("Please enter a valid email address"),
  referralCode: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

/* ── Component ──────────────────────────────────── */
interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [showReferral, setShowReferral] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    defaultValues: { email: "", referralCode: "" },
  });

  const onSubmit = async (data: AuthFormValues) => {
    console.log("Auth submit:", data);
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
        {/* Inner wrapper — clips rounded corners while outer allows close button outside */}
        <div className="overflow-hidden rounded-2xl bg-background">
        {/* Gradient banner with title */}
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
              Welcome to LuminaGen
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Sign in to access your account
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
          {/* Continue with Google */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              variant="outline"
              className="w-full h-[52px] rounded-full text-sm font-medium gap-3"
            >
              <GoogleGIcon />
              Continue with Google
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-5">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                className="h-[52px] rounded-full px-5"
                {...register("email")}
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Referral code — pill-shaped toggle */}
            <button
              type="button"
              onClick={() => setShowReferral(!showReferral)}
              className="flex items-center gap-2 w-full h-[52px] px-5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              <Gift className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Have a referral code?</span>
              <motion.span
                animate={{ rotate: showReferral ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>

            <AnimatePresence>
              {showReferral && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Input
                    type="text"
                    placeholder="ENTER REFERRAL CODE (OPTIONAL)"
                    className="h-[52px] rounded-full px-5 uppercase placeholder:uppercase placeholder:text-xs placeholder:tracking-wide"
                    {...register("referralCode")}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
              >
                {isSubmitting ? "Sending..." : "Continue with Email"}
              </Button>
            </motion.div>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-5">
            We&apos;ll send you a magic link to sign in
          </p>
        </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
